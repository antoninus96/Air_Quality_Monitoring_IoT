#include "mbed.h"
#include "HTS221Sensor.h"
#include <string.h> 
#include <stdio.h>  

static DevI2C devI2c(D14,D15);
static HTS221Sensor hum_temp(&devI2c);

int main() {
  uint8_t id;
  float value1, value2;
  hum_temp.init(NULL);
  hum_temp.enable();

  hum_temp.read_id(&id);
  printf("HTS221  humidity & temperature    = 0x%X\r\n", id);  
  printf("\n\r--- Reading sensor values ---\n\r");
 
  while(1) {
    printf("\r\n");   
    hum_temp.get_temperature(&value1);
    hum_temp.get_humidity(&value2);
    printf("HTS221:  [temp] %.2f C, [hum]   %.2f%%\r\n", value1, value2);
    printf("\r\n");
    wait(2); 
  }
}
