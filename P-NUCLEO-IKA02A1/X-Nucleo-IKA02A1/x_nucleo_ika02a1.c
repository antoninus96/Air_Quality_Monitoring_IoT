/** 
  ******************************************************************************
  * @file    x_nucleo_ika02a1.c
  * @author  AMS
  * @version V1.1.0
  * @date    22-January-2019
  * @brief   This file contains main functions for X-CUBE-IKA02A1 BSP
  * @endcond
  ******************************************************************************
  * @attention
  *
  * <h2><center>&copy; COPYRIGHT(c) 2019 STMicroelectronics</center></h2>
  *
  * Redistribution and use in source and binary forms, with or without modification,
  * are permitted provided that the following conditions are met:
  *   1. Redistributions of source code must retain the above copyright notice,
  *      this list of conditions and the following disclaimer.
  *   2. Redistributions in binary form must reproduce the above copyright notice,
  *      this list of conditions and the following disclaimer in the documentation
  *      and/or other materials provided with the distribution.
  *   3. Neither the name of STMicroelectronics nor the names of its contributors
  *      may be used to endorse or promote products derived from this software
  *      without specific prior written permission.
  *
  * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
  * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
  * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
  * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
  * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
  * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
  * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
  * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  *
  ******************************************************************************  
  */ 

/* Includes ------------------------------------------------------------------*/
#include "x_nucleo_ika02a1.h"
#include "sensor_calibration_TGS5141.h"
#include <math.h>


/** @addtogroup BSP
  * @{
  */ 

/** @defgroup NUCLEO_ANALOG_INTERFACE
  * @{
  */  

/** @defgroup NUCLEO_ANALOG_INTERFACE_FuncDefinitions
  * @brief function functions for x-cube-ika02a1
  * @{
  */ 

 /**
   * @brief  reads value of pin ANALOG_GAS_VALUE_PIN with respect to ANALOG_REF_VOLT_VALUE_PIN
   * @return gas concentration value in ppm
   */
float Get_Gas_concentration(float gain, float sens){
	return ((float)Get_ADC_value(ANALOG_GAS_VALUE_PIN)-Get_ADC_value(ANALOG_REF_VOLT_VALUE_PIN))*805664/gain/sens;
}

 /**
   * @brief  reads value of pin ANALOG_TEMP_VALUE
   * @return temperature value in degrees
   */
float Get_Temperature(void){
	return (-1481.96+sqrt(2196200+(1.8639-3.3*Get_ADC_value(ANALOG_TEMP_VALUE)/4096)/3.88*1000000));
}

 /**
   * @brief  Compensate gas concentration value with temperature value
   * @return compensated gas concentration in ppm
   */
float Get_comp_gas_concentration(float gas_ppm, int8_t temp){
	
	//chceck to be in boundaries of lookup table
	if(temp+COMP_SHIFT>=LOOKUP_LENGTH){
		temp=LOOKUP_LENGTH-1;
	}else if(temp+COMP_SHIFT<0){
		temp=0;
	}else{
		temp=temp+COMP_SHIFT;
	}
	
	return gas_ppm/TEMP_COMPENSATION[temp];
}

/**
  * @}
  */
  
/**
* @}
*/

/**
* @}
*/
