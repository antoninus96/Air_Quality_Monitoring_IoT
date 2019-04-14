// needed lbraries
#include "gas.h"
extern "C"{
    #include "sensor_calibration_TGS5141.h"
    #include "x_nucleo_ika02a1.h"
}
#include <math.h>  

float Get_Gas_value(){
    int32_t* pSens = (int32_t*)FLASH_SENS_ADDR;
    int32_t* pGain = (int32_t*)FLASH_GAIN_ADDR;
    return Get_Gas_concentration((float)*pGain,((float)*pSens)/1000);
}

float Get_Gas_comp(){
    float temperature = Get_Temperature();
    float gas=Get_Gas_value();
    return Get_comp_gas_concentration(gas,(int8_t)round(temperature));
}

float Get_Temp(){
    return  Get_Temperature();
}