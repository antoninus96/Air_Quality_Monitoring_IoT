# parsing the files in the given directory
def parse_values(directory = '.'):
	dataset=[]
	labels=[]
	# opening the file 
	dataset_file = open(directory + '/AirQualityUCI.csv')
	dataset_file.readline()
	iter=0
	for line in dataset_file:
		if iter>5:
			break
		line=line.replace(",",".")
		line = line.split(";")
		if line[2]!='' and line[12]!='' and line[13]!='' and line[5]!='': 
			# get the CO level in ppm, the temperature in Celsius and the relative humidity
			dataset.append([float(line[2]),float(line[12]),float(line[13])])
			# get the benzene concentration in ppm
			labels.append(float(line[5]))
			iter+=1
	print(dataset,labels);
	
parse_values()
