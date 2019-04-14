#include "predictor.h"
#include "mbed.h"
#include <stdio.h>

Serial pc(USBTX, USBRX);

float readings[] = {2.6, 13.6, 48.9};

int main(void) {
  pc.printf("getting benzene value from the CO, temperature and humidity values\n");
	float benzene;
	// converting CO values from ppm to mg/m^3
	readings[0]=readings[0]*28.0101/24.25;
	pc.printf("coverting CO from ppm to mg/m^3\n");
	//executing prediction
	benzene=predict(readings);
	pc.printf("Predicted value: %f\r\n", benzene);
  return 0;
}
