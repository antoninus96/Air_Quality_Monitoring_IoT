(function () {

  var myConnector = tableau.makeConnector();
  var schema = [];
  var server = 'marty-c9aef689.influxcloud.net';
  var port = 8086;
  var db = 'surv';
  var debug = true; // set to true to enable JS Console debug messages
  var protocol = 'https://'; // default to non-encrypted.  To setup InfluxDB with https see https://docs.influxdata.com/influxdb/v1.2/administration/https_setup/
  var useAuth = true; // bool to include/prompt for username/password
  var username = 'username';
  var password = 'password';
  var queryString_Auth; // string to hold the &u=_user_&p=_pass_ part of the query string
  var queryString_Auth_Log; // use for logging the redacted password

  var queryType = 'all'; // var to store query type
  var interval_time = '1'; // value for the group by time
  var interval_measure = 's'; // h=hour, m=min, etc
  var interval_measure_string = 'seconds'; // full string for interval
  var aggregation = 'mean'; // value for aggregating database value
  var customSql = '';  // value for custom SQL as user typed it
  var customSqlSplit = {};  // values of query part of custom sql; to be used with getData


  // from https://docs.influxdata.com/influxdb/v1.2/write_protocols/line_protocol_tutorial/#special-characters-and-keywords
  // Influx allows <, = space "> which can't be used as a Tableau id field (https://github.com/tagyoureit/InfluxDB_WDC/issues/3)
  // Tableau only allows letters, numbers or underscores
  function replaceSpecialChars_forTableau_ID(str) {

    var newStr = str.replace(/ /g, '_')
      .replace(/"/g, '_doublequote_')
      .replace(/,/g, '_comma_')
      .replace(/=/g, '_equal_')
      .replace(/\//g, '_fslash_')
      .replace(/-/g, '_dash_')
      .replace(/\./g, '_dot_')
      .replace(/[^A-Za-z0-9_]/g, '_');
    return newStr;
  }

  function influx_escape_char_for_URI(str) {
    var newStr = str.replace(/\\/g, '\\\\');
    newStr = newStr.replace(/\//g, '//');
    newStr = newStr.replace(/ /g, '%20');
    newStr = newStr.replace(/"/g, '\\"');
    return newStr;
  }

  function resetSchema() {
    schema = [];
    console.log('Schema has been reset');
  }

  resetSchema();

  function queryStringTags(index, queryString_tags) {
    if (debug) console.log('Retrieving tags with query: %s', queryString_tags);
    // Create a JQuery Promise object
    var deferred = $.Deferred();
    $.getJSON(queryString_tags, function (tags) {
      if (debug) console.log('tag query string for ' + index + ': ' + JSON.stringify(tags));

      // this if statement checks to see if there is an empty series (just skip it)
      // empty resultset: tag query string for 7: {"results":[{"statement_id":0}]}
      if (tags.results[0].hasOwnProperty('series')) {
        // Create a factory (array) of async functions
        var deferreds = (tags.results[0].series[0].values).map(function (tag, tag_index) {
          if (debug) console.log('in queryStringTags.  tag: %s  tag_index: %s', tag[0], tag_index);
          schema[index].columns.push({
            id: replaceSpecialChars_forTableau_ID(tag[0]),
            alias: tag[0],
            dataType: tableau.dataTypeEnum.string,
          });
          if (debug) console.log(schema);
        });
      }
      // Execute all async functions in array
      return $.when.apply($, deferreds)
        .then(function () {
          if (debug) console.log('finished processing tags');
          deferred.resolve();
        });

    })
      .fail(function (jqXHR, textStatus, errorThrown) {
        tableau.abortWithError(errorThrown);
        console.log(errorThrown);
        doneCallback();
      });
    return deferred.promise();

  }

  function queryStringFields(index, queryString_fields) {
    var deferred = $.Deferred();
    if (debug) console.log('Retrieving fields with query: %s', queryString_fields);
    $.getJSON(queryString_fields, function (fields) {
      // this if statement checks to see if there is an empty series (just skip it)
      // empty resultset: tag query string for 7: {"results":[{"statement_id":0}]}
      if (fields.results[0].hasOwnProperty('series')) {
        var deferreds = (fields.results[0].series[0].values).map(function (field, field_index) {
          if (debug) console.log('in queryStringFields.  field: %s  field_index: %s', field[0], field_index);
          var id_str,
            alias_str;
          if (queryType === 'aggregation') {
            id_str = aggregation + '_' + replaceSpecialChars_forTableau_ID(field[0]);
            alias_str = aggregation + '_' + field[0];
          } else if (queryType === 'all') {
            id_str = replaceSpecialChars_forTableau_ID(field[0]);
            alias_str = field[0];
          }
          // force the correct mapping of data types
          var tabDataType;
          switch (field[1]) {
            case 'float':
              tabDataType = tableau.dataTypeEnum.float;
              break;
            case 'integer':
              tabDataType = tableau.dataTypeEnum.int;
              break;
            case 'string':
              tabDataType = tableau.dataTypeEnum.string;
              break;
            case 'boolean':
              tabDataType = tableau.dataTypeEnum.bool;
              break;
          }
          schema[index].columns.push({
            id: id_str,
            alias: alias_str,
            dataType: tabDataType,
          });
        });
      }
      return $.when.apply($, deferreds)
        .then(function () {
          if (debug) console.log('finished processing fields');
          deferred.resolve();
        });
    })
      .fail(function (jqXHR, textStatus, errorThrown) {
        tableau.abortWithError(errorThrown);
        console.log(errorThrown);
        doneCallback();
      });
    return deferred.promise();
  }

  function addTimeTag() {
    // the "time" tag isn't returned by the schema.  Add it to every measurement.
    $.each(schema, function (index, e) {
      schema[index].columns.unshift({
        id: 'time',
        dataType: tableau.dataTypeEnum.datetime,
      });
    });
  }

  function getMeasurements(db, queryString) {
    // Get all measurements (aka Tables) from the DB

    $.getJSON(queryString, function (resp) {
      if (debug) console.log('retrieved all measurements: %o', resp);
      if (debug) console.log('resp.results[0].series[0].values: %o', resp.results[0].series[0].values);

      // for each measurement, save the async function to a "factory" array
      var deferreds = (resp.results[0].series[0].values).map(function (measurement, index) {
        schema[index] = {
          id: replaceSpecialChars_forTableau_ID(measurement[0]),
          alias: measurement[0],
          incrementColumnId: 'time',
          columns: [],
        };
        if (debug) console.log(schema);
        if (debug) console.log('analyzing index: %s measurement: %s ', index, measurement[0]);
        if (debug) console.log('schema now is: %o', schema);

        var deferred_tags_and_fields = [];

        // Get the tags (items that can be used in a where clause) in the measurement
        var newM = influx_escape_char_for_URI(measurement[0]);
        var queryString_tags = protocol + server + ':' + port + '/query?q=SHOW+TAG+KEYS+FROM+%22' + newM + '%22&db=' + db;
        if (useAuth) {
          setAuth();
          queryString_tags += queryString_Auth;
        }

        // Get fields/values
        var queryString_fields = protocol + server + ':' + port + '/query?q=SHOW+FIELD+KEYS+FROM+%22' + newM + '%22&db=' + db;
        if (useAuth) {
          setAuth();
          queryString_fields += queryString_Auth;
        }

        deferred_tags_and_fields.push(queryStringTags(index, queryString_tags));
        deferred_tags_and_fields.push(queryStringFields(index, queryString_fields));

        return $.when.apply($, deferred_tags_and_fields)
          .then(function () {
            if (debug) console.log('finished processing queryStringTags and queryStringFields for %s', measurement[0]);
          });
      });

      return $.when.apply($, deferreds)
        .then(function () {
          if (debug) console.log('Finished getting ALL tags and fields for ALL measurements.  Hooray!');
          if (debug) console.log('schema is now: %o', schema);
        })
        .then(addTimeTag)
        .then(function () {
          if (debug) console.log('schema finally: %o', schema);

          // Once we have the tags/fields enable the Load button
          loadSchemaIntoTableau();
        });
    })
      .fail(function (jqXHR, textStatus, errorThrown) {
        tableau.abortWithError(errorThrown);
        console.log(errorThrown);
        doneCallback();
      });

  }

  function modifyLimitAndSlimit(sql) {
    // this function modifies/add series and row limits so we only get 1 row of data back for the schema.
    // On the getData side, we will union all of these series together.

    console.log('sql before regex:', sql);
    var limitRegex = /\b(limit\s\d{0,10})/gmi;
    var slimitRegex = /\b(slimit\s\d{0,10})/gmi;
    if (sql.search(limitRegex) === -1) {
      // no limit x in sql
      sql += ' limit 1';
    }
    else {
      // limit x found; replace with limit 1
      sql = sql.replace(limitRegex, ' limit 1');
    }

    if (sql.search(slimitRegex) === -1) {
      // no slimit x in sql
      sql += ' slimit 1';
    }
    else {
      // slimit x found; replace with limit 1
      sql = sql.replace(slimitRegex, ' slimit 1');
    }

    return sql;
  }


  function buildCustomSqlString(db, _customSql) {
  	var dd = '2019-04-02';
    var modifiedCustomSql = modifyLimitAndSlimit(_customSql);
    var queryString = 'https://marty-c9aef689.influxcloud.net:8086/query?q=SELECT * FROM surv.autogen.survey WHERE time > '+dd+'&db=' + db;//protocol + server + ':' + port + '/query?q=' + encodeURIComponent(modifiedCustomSql) + '&db=' + db;
    if (useAuth) {
      setAuth();
      queryString += queryString_Auth;
    }

    if (debug) console.log('Custom SQL url: ', queryString);
    return queryString;
  }

  function getCustomSqlSchema(queryString, originalSql) {
    var deferred = new $.Deferred();

    $.getJSON(queryString)
      .done(function (resp) {
        var _schema = [];
        if (!resp.results[0].hasOwnProperty('series')) {
          influx_alert('No rows returned', JSON.stringify(resp));
        }
        else {
          if (debug) console.log('retrieved custom sql response: %o', resp);
          if (debug) console.log('resp.results[0].series[0].values: %o', resp.results[0].series[0].values);

          var cols = [];

          // columns/fields
          resp.results[0].series[0].columns.forEach(function (el, index) {
            if (el === 'time') {
              type = tableau.dataTypeEnum.datetime;
            }else {
              type = enumType(resp.results[0].series[0].values[0][index]);
            }
            cols.push({
              id: replaceSpecialChars_forTableau_ID(el),
              alias: el,
              dataType: type,
            });
          });

          // tags; will only be present with multiple group by clauses
          if (resp.results[0].series[0].hasOwnProperty('tags')) {
            for (var el in resp.results[0].series[0].tags) {

              cols.push({
                id: replaceSpecialChars_forTableau_ID(el),
                alias: el,
                dataType: tableau.dataTypeEnum.string,
                sql: queryString,
              });
            }
          }

          _schema = {
            id: replaceSpecialChars_forTableau_ID(resp.results[0].series[0].name),
            alias: resp.results[0].series[0].name,
            incrementColumnId: "time",
            columns: cols,
          };
          customSqlSplit[resp.results[0].series[0].name] = originalSql;

          if (debug) console.log('schema for query: %o', _schema);
          schema.push(_schema);
          deferred.resolve();
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.log('jqXHR:  %o', jqXHR);
        console.log('textStatus: %o', textStatus);
        console.log('errorThrown: %o', errorThrown);

        influx_alert('Error parsing sql', 'Response error: ' + errorThrown + '<BR>Response text: ' + JSON.stringify(jqXHR.responseJSON));
      });
    return deferred.promise();

  }


  function parseCustomSql(db, _customSql) {
    // Get all measurements (aka Tables) from the DB


    /*
    Sample of return values for single series
    {
        "results"
    :
        [
            {
                "statement_id": 0,
                "series": [
                    {
                        "name": "tank_level",
                        "columns": [
                            "time",
                            "max_gallons_of_chemical",
                            "max_gallons_of_water",
                            "max_status",
                            "max_strength_of_chemical",
                            "max_total_gallons"
                        ],
                        "values": [
                            [
                                "1970-01-01T00:00:00Z",
                                1,
                                1,
                                1,
                                0.145,
                                2
                            ]
                        ]
                    }
                ]
            }
        ]
    }


    Sample of return for multiple series
    {
        "results"
    :
        [{
            "statement_id": 0,
            "series": [{
                "name": "tank_pump",
                "tags": {"pump": "acid"},
                "columns": ["time", "integral"],
                "values": [["2018-06-29T05:00:00Z", 2.881666666666667], ["2018-06-29T06:00:00Z", 3.4783333333333335], ["2018-06-29T07:00:00Z", 3.4008333333333334], ["2018-06-29T08:00:00Z", 3.974166666666667], ["2018-06-29T09:00:00Z", 4.004166666666667], ["2018-06-29T10:00:00Z", 3.9775], ["2018-06-29T11:00:00Z", 3.9000000000000004], ["2018-06-29T12:00:00Z", 3.9608333333333334]]
            }],
            "partial": true
        }]
    }
    {
        "results"
    :
        [{
            "statement_id": 0,
            "series": [{
                "name": "tank_pump",
                "tags": {"pump": "chlorine"},
                "columns": ["time", "integral"],
                "values": [["2018-06-29T04:00:00Z", 3.706666666666667], ["2018-06-29T05:00:00Z", 1.0125]]
            }],
            "partial": true
        }]
    }
    {
        "results"
    :
        [{
            "statement_id": 0,
            "series": [{
                "name": "tank_pump",
                "tags": {"pump": "acid"},
                "columns": ["time", "integral"],
                "values": [["2018-06-29T13:00:00Z", 0.8616666666666667]]
            }]
        }]
    }
    */

    customSql = _customSql;

    deferred_array = [];
    if (customSql.indexOf(';') !== -1) {
      customSqlArray = customSql.split(';');
      // can have select * from measurement; and still be a single query
      if (customSqlArray.length > 1) {
        if (debug) console.log('Multiple sql statements (%s) found for %s: %o', customSqlArray.length, customSql, customSqlArray);
      }
      // for each query, get tables
      for (var i = 0; i < customSqlArray.length; i++) {
        var newsql = buildCustomSqlString(db, customSqlArray[i]);
        deferred_array.push(getCustomSqlSchema(newsql, customSqlArray[i]));
      }
    }
    else {
      var newsql = buildCustomSqlString(db, customSql);
      deferred_array.push(getCustomSqlSchema(newsql, customSql));
    }
    resetSchema();

    $.when.apply($, deferred_array)
      .then(function () {
        if (debug) console.log('finished processing all cust sql for %o', customSql);
        // Once we have the schema enable the Load button
        if (debug) console.log('custom sql schema finally: %o', schema);
        loadSchemaIntoTableau();
      });
  }


  function enumType(type) {
    if (isNaN(type) === true) {
      return tableau.dataTypeEnum.string;
    }
    else {
      return tableau.dataTypeEnum.float;
    }
  }

  function setAuth() {
    
    queryString_Auth = '&u=' + username + '&p=' + password;
    queryString_Auth_Log = '&u=' + username + '&p=[redacted]';
  }

  function getDBs() {
    try {
      $('.proto_sel')
        .click(function () {
            if (debug) {
            console.log('Protocol changed to: ' + $(this)
              .text());
          }
            $('.proto_sel').parent().parent().find('.btn').html($(this)
                .text() + ' <span class="caret"></span>')
          // $(this)
          //   .html($(this)
          //     .text() + ' <span class="caret"></span>');
          // $(this)
          //   .val($(this)
          //     .data('value'));

            protocol = $(this)
              .text();
          })





      $('#interval_time')
        .change(function () {
          if ($(this)
            .val() === '') {
            interval_time = $(this)
              .prop('placeholder');
          } else {
            interval_time = $(this)
              .val();
          }
        });


      // retrieve the list of databases from the server
      $('#tableButton')
        .click(function () {

          // Reset the dropdown in case the user selects another server
          $('.selectpicker')
            .html('');
          $('.selectpicker')
            .selectpicker('refresh');


          if ($('#servername')
            .val() !== '') {
            server = $('#servername')
              .val();
          } else {
            server = 'localhost';
          }

          if ($('#serverport')
            .val() !== '') {
            port = $('#serverport')
              .val();
          } else {
            port = 8086;
          }

          var queryString_DBs = protocol + server + ':' + port + '/query?q=SHOW+DATABASES';
          if (useAuth) {
            setAuth();
            queryString_DBs += queryString_Auth;
          }

          if (debug) console.log('Retrieving databases with querystring: ', queryString_DBs);
          $.ajax({
            url: queryString_DBs,
            dataType: 'json',
            timeout: 3000,
            success: function (resp) {
              if (debug) console.log(resp.results[0].series[0].values);

              $('.selectpicker')
                .html('');
              $.each(resp.results[0].series[0].values, function (index, value) {
                $('<option style="font-size:20px;">' + value + '</option>')
                  .appendTo('.selectpicker');
              });
              $('.selectpicker')
                .selectpicker('refresh');

              // Once we have the databases, enable the 'load schema' button
              $('#getSchemaButton')
                .prop('disabled', false);
            },
          })
            .done(function () {
              // alert("done")
            })
            .fail(function (err) {
              influx_alert('Error loading database', JSON.stringify(err));
              console.log('error', err);
            });
        });

      $('#db_dropdown')
        .on('changed.bs.select', function (e) {
          if (debug) console.log(e.target.value + ' has been selected');

          // reset the schema if the database selection changes
          resetSchema();
        });

      $('#getSchemaButton')
        .click(function () {
          db = $('#db_dropdown option:selected')
            .text();
          if (queryType === 'custom'){
            parseCustomSql(db, $('#customSql')
              .val());
          }
          else {
            var queryString = protocol + server + ':' + port + '/query?q=SHOW+MEASUREMENTS&db=' + db;
            if (useAuth) {
              setAuth();
              queryString += queryString_Auth;
            }
            getMeasurements(db, queryString);
          }

        });
    } catch (err) {
      tableau.abortWithError(err);
      console.log(err);
      doneCallback();
    }
  }

  function influx_alert(errorType, err) {
    console.log(err);
    $('#influx_alert')
      .html('<a class="close" onclick="$(\'.alert\').hide()">×</a><div class=\'alert alert-error\'><strong>' + errorType + ': </strong>' + err + '</div>');
    $('#influx_alert')
      .fadeIn();
  }

  function loadSchemaIntoTableau() {
    tableau.connectionName = 'Air Quality Monitoring - InfluxDB -> Tableau';
    var json = {
      db: db,
      server: server,
      aggregation: aggregation,
      interval_time: interval_time,
      interval_measure: interval_measure,
      interval_measure_string: interval_measure_string,
      protocol: protocol,
      port: port,
      useAuth: useAuth,
      queryType: queryType,
      schema: schema,
      customSql: customSql,
      customSqlSplit: customSqlSplit,
    };
    if (useAuth) {
      tableau.username = username;
      tableau.password = password;
    }
    tableau.connectionData = JSON.stringify(json);
    tableau.submit();
  }

  function numberWithCommas(x) {
    return x.toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

// Init function for connector, called during every phase
  myConnector.init = function (initCallback) {
    if (debug) console.log('Calling init function in phase: ', tableau.phase);
    if (useAuth) {
      tableau.authType = tableau.authTypeEnum.basic;
    } else {
      tableau.authType = tableau.authTypeEnum.none;
    }
    initCallback();
  };

  myConnector.getSchema = function (schemaCallback) {
    var json = JSON.parse(tableau.connectionData);
    schemaCallback(json.schema);
  };

  myConnector.getData = function (table, doneCallback) {
    try {
      if (debug) {
        console.log(table);
        console.log('lastId (for incremental refresh): ', table.incrementValue);
        console.log('Using Auth: ' + useAuth);
      }
      var lastId = table.incrementValue || -1;

      var tableData = [];
      var json = JSON.parse(tableau.connectionData);
      var queryString = json.protocol + json.server + ':' + json.port + '/query';
      var dataString = 'q=';

      if (json.queryType === 'custom') {

        console.log('table:', table);
        console.log('custom sql split stored: %o', json.customSqlSplit);
        console.log('custom[table]:', json.customSqlSplit[table.tableInfo.alias]);
        dataString += encodeURIComponent(json.customSqlSplit[table.tableInfo.alias]);
        dataString += '&db=' + json.db;
        dataString += '&chunked=true'; // add this to force chunking

        if (json.useAuth) {
          dataString += '&u=' + tableau.username + '&p=' + tableau.password;
        }
        if (debug) console.log('Fetch custom sql: ', queryString + '?' + dataString);
      }
      else {
        dataString += 'select+';
        if (json.queryType === 'aggregation') {
          dataString += json.aggregation + '(*)';
        } else {
          dataString += '*';
        }
        dataString += '+from+%22' + influx_escape_char_for_URI(table.tableInfo.alias) + '%22';
        if (json.queryType === 'aggregation') {
          if (lastId !== -1) {
            // incremental refresh with aggregation
            dataString += '+where+time+%3E+\'' + lastId + '\'+group+by+*,time(' + json.interval_time + json.interval_measure + ')';
          } else {
            // full refresh with aggregation
            dataString += '+where+time+<+now()+group+by+*,time(' + json.interval_time + json.interval_measure + ')';
          }
        } else {
          if (lastId !== -1) {
            // incremental refresh with NO aggregation
            dataString += '+where+time+%3E+\'' + lastId + '\'';
          } else {
            // full refresh with NO aggregation
          }
        }
        //dataString += "+limit+6"  // add this to limit the number of results coming back.  Good for testing.
        dataString += '&db=' + json.db;
        dataString += '&chunked=true'; // add this to force chunking
        //dataString += "&chunk_size=20000"   // add this to force a certain data set size
        //dataString += "&chunked=false"

        if (json.useAuth) {
          dataString += '&u=' + tableau.username + '&p=' + tableau.password;
        }
        if (debug) console.log('Fetch data query string: ', queryString + '?' + dataString);
      }


      var jqxhr = $.ajax({
        dataType: 'text',
        url: queryString,
        data: dataString,
        async: false,
      })
        .done(function (resp) {


          // NOTE: This response needs to be of dataType:"text" as of v1.2.4.
          // See https://github.com/influxdata/influxdb/issues/8508

          var resultsArray = [];
          // if the response includes \n that means it has multiple result sets and we need to parse through them
          if (resp.indexOf('\n') !== -1) {
            resultsArray = resp.split('\n');
            // there is an extra \n at the end of the string, so remove the last element of the array
            resultsArray.splice(resultsArray.length - 1, 1);
            if (debug) console.log('Multiple result arrays (%s) found for %s', resultsArray.length, table.tableInfo.id);

            // for each result set, parse it into a JSON object
            for (var jp = 0; jp < resultsArray.length; jp++) {
              resultsArray[jp] = JSON.parse(resultsArray[jp]);
            }
            resp = resultsArray;
          } else {
            if (debug) console.log('Single result array returned for table %s', table.tableInfo.id);
            // put it into an array so we only need one set of code to traverse the objects.
            resultsArray = [JSON.parse(resp)];
            resp = resultsArray;
          }

          var values,
            columns,
            tags,
            val,
            val_len,
            col,
            col_len,
            response_array,
            series,
            series_cnt,
            row,
            total_rows;

          // Need this line for incremental refresh.  If there are no additional results than this set will be undefined.
          if ((resp[0].results[0]).hasOwnProperty('series') === true) {

            if (!json.queryType) {
              values = resp[0].results[0].series[0].values;
              columns = resp[0].results[0].series[0].columns;

              if (debug) {
                console.log('columns:', columns);
                console.log('first row of values: ', values[0]);
                console.log('Total # of rows for ' + table.tableInfo.alias + ' is: ' + values.length);
                console.log('Using Aggregation Type: ' + json.queryType);
              }

              total_rows = 0;
              for (response_array = 0; response_array < resp.length; response_array++) {
                values = resp[response_array].results[0].series[0].values;
                columns = resp[response_array].results[0].series[0].columns;
                //Iterate over the result set

                for (val = 0, val_len = values.length; val < val_len; val++) {
                  row = {};
                  for (col = 0, col_len = columns.length; col < col_len; col++) {
                    row[replaceSpecialChars_forTableau_ID(columns[col])] = values[val][col];
                  }
                  tableData.push(row);

                  if (total_rows % 20000 === 0 && total_rows !== 0) {
                    console.log('Getting data: ' + total_rows + ' rows');
                    tableau.reportProgress('Getting data: ' + numberWithCommas(total_rows) + ' rows');
                  } else if (total_rows === 0) {
                    console.log('Getting data: 0 rows - Starting Extract');
                    tableau.reportProgress('Getting data: 0 rows - Starting Extract');
                  }
                  total_rows++;
                }
              }
            } else {

              series = resp[0].results[0].series;

              if (debug) {
                console.log('first row of tags:', series[0].tags);
                console.log('first row of columns:', series[0].columns);
                console.log('first row of values: ', series[0].values);
                console.log('Total # of result sets (%s) series (%s) & columns (%s) & values (1st row: %s) = total rows (est: %s) for %s is: ', resp.length, series.length, series[0].columns.length, series[0].values.length, resp.length * series.length * series[0].columns.length * series[0].values.length, table.tableInfo.alias);
              }

              total_rows = 0;
              for (response_array = 0; response_array < resp.length; response_array++) {
                series = resp[response_array].results[0].series;
                values = resp[response_array].results[0].series[0].values;
                columns = resp[response_array].results[0].series[0].columns;

                //Iterate over the result set
                for (series_cnt = 0, series_len = series.length; series_cnt < series_len; series_cnt++) {

                  values = series[series_cnt].values;
                  for (val = 0, val_len = values.length; val < val_len; val++) {
                    columns = series[series_cnt].columns;
                    row = {};

                    // add tags from each series
                    var obj = series[series_cnt].tags;
                    for (var key in obj) {
                      if (obj.hasOwnProperty(key)) {
                        row[replaceSpecialChars_forTableau_ID(key)] = obj[key];
                      }
                    }
                    for (col = 0, col_len = columns.length; col < col_len; col++) {
                      row[replaceSpecialChars_forTableau_ID(series[series_cnt].columns[col])] = series[series_cnt].values[val][col];
                    }
                    tableData.push(row);

                    if (total_rows % 20000 === 0 && total_rows !== 0) {
                      console.log('Getting data: ' + total_rows + ' rows');
                      tableau.reportProgress('Getting data: ' + numberWithCommas(total_rows) + ' rows');
                    } else if (total_rows === 0) {
                      console.log('Getting data: 0 rows - Starting Extract');
                      tableau.reportProgress('Getting data: 0 rows - Starting Extract');
                    }
                    total_rows++;
                  }
                }

              }
            }

          } else {
            if (debug) console.log('No additional data in table ' + table.tableInfo.id + ' or in incremental refresh after ', table.incrementValue);
          }


        })
        .done(function () {
          console.log('Finished getting table data for ' + table.tableInfo.id);
          table.appendRows(tableData);
          doneCallback();
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          tableau.abortWithError(errorThrown);
          console.log(errorThrown);
          doneCallback();
        });
    } catch
      (err) {

      tableau.abortWithError(err);
      console.log(err);
      doneCallback();
    }
  }
  ;


  $(document)
    .ready(function () {

     

     


      // set defaults

      $('#aggregationGroup')
        .collapse('hide');
      $('#customSqlGroup')
        .collapse('hide');


      // function will check to make sure correct group is showing at end of show transition
      // eg, if the user hits tab quickly twice than two groups would be shown
      $('#aggregationGroup, #customSqlGroup').on('shown.bs.collapse', function(){
        if (queryType === 'custom' && $('#aggregationGroup').hasClass('show')){
          $('#aggregationGroup')
            .collapse('hide');
        }
        else if (queryType === 'aggregation' && $('#customSqlGroup').hasClass('show')){
          $('#customSqlGroup')
            .collapse('hide');
        }
        else if (queryType === 'all'){
          $('#aggregationGroup')
            .collapse('hide');
          $('#customSqlGroup')
            .collapse('hide');
        }
      })


      // function will check to make sure correct group is showing at end of hide transition
      // eg, if the user hits left/right arrow quickly (from custom or aggregation) than the target group would not be shown
      $('#aggregationGroup, #customSqlGroup').on('hidden.bs.collapse', function(){
        if (queryType === 'aggregation' && !$('#aggregationGroup').hasClass('show')){
          $('#aggregationGroup')
            .collapse('show');
        }
        else if (queryType === 'custom' && !$('#customSqlGroup').hasClass('show')) {
          $('#customSqlGroup')
            .collapse('show');
        }
      })


      $('#querytype')
        .on('change', function () {
         // $(this)
          //  .prop('checked', true);
          if ($(this)
            .find(':checked')
            .data('val') === 'aggregation') {
            queryType = 'aggregation';
            $('#aggregationGroup')
              .collapse('show');
            $('#customSqlGroup')
              .collapse('hide');
          }
          if ($(this)
            .find(':checked')
            .data('val') === 'all') {
            queryType = 'all';
            $('#aggregationGroup')
              .collapse('hide');
            $('#customSqlGroup')
              .collapse('hide');
          }
          else if ($(this)
            .find(':checked')
            .data('val') === 'custom') {
            queryType = 'custom';
            $('#aggregationGroup')
              .collapse('hide');
            $('#customSqlGroup')
              .collapse('show');
          }
          resetSchema();
        });

      getDBs();
      tableau.registerConnector(myConnector);

     
      if (tableau.connectionData !== undefined) {
        if (tableau.connectionData.length > 0) {
          try {
            console.log('Loading previously stored values');
            var json = JSON.parse(tableau.connectionData);

            // set all local vars
            schema = json.schema;
            server = json.server;
            port = json.port;
            db = json.db;
            protocol = json.protocol;
            username = tableau.password;
            queryType = json.queryType;
            interval_time = json.interval_time;
            interval_measure = json.interval_measure;
            interval_measure_string = json.interval_measure_string;
            aggregation = json.aggregation;

            // set all HTML elements
            $('#servername')
              .val(json.server);
            $('#servername')
              .attr('placeholder', json.server);
            $('#serverport')
              .val(json.port);
            $('.selectpicker')
              .html('<option style="font-size:20px;">' + json.db + '</option>');
            $('.selectpicker')
              .selectpicker('refresh');
            $('#protocol_selector_button')
              .html(json.protocol + '<span class="caret"></span>');
            if (json.queryType === 'aggregation') {
              $('#aggregationGroup')
                .collapse('show');
              $('#customSqlGroup')
                .collapse('hide');
              $('#aggregation_selector_button')
                .html(json.aggregation + '<span class="caret"></span>');
              $('#interval_measure_button')
                .html(json.interval_measure_string + '<span class="caret"></span>');
              $('#interval_time')
                .val(json.interval_time);
              $('#querytype_aggregation')
                .click();

            } else if (json.queryType === 'all') {
              $('#customSqlGroup')
                .collapse('hide');
              $('#aggregationGroup')
                .collapse('hide');
              $('#querytype_all')
                .click();

            } else if (json.queryType === 'custom') {
              $('#customSqlGroup')
                .collapse('show');
              $('#customSql')
                .val(json.customSql);
              $('#aggregationGroup')
                .collapse('hide');
              $('#querytype_custom')
                .click();
            }
            if (json.useAuth === true) {
              useAuth = true;
             
             
            } else {
             
             
            }
            $('#getSchemaButton')
              .prop('disabled', false);
          } catch (err) {
            influx_alert('Error restoring previous values:', JSON.stringify(err));
          }
        }
      }
      else {
        $('#aggregationGroup')
          .collapse('hide');
      }
    });


})
();
