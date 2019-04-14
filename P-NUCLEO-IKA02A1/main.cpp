#include "mbed.h"
#include <string.h> 
#include <stdio.h>  
#include "gas.h"

float gas_value_ppm = 0;
float gas_value_ppm_comp = 0;
float temperature=0;

int main(void){
    Serial pc(USBTX, USBRX);
    pc.printf("initialization done\n");
    while(1){
        gas_value_ppm = Get_Gas_value();
        gas_value_ppm_comp = Get_Gas_comp();
        temperature=Get_Temp();
        pc.printf("gas_value_ppm: %f, gas_value_ppm_comp: %f,temperature: %f\n",gas_value_ppm,gas_value_ppm_comp,temperature);
        wait(1);
    }
}