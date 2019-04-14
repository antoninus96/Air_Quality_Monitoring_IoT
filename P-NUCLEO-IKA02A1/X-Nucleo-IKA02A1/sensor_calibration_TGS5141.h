/** 
  ******************************************************************************
  * @file    sensor_calibration_TGS5141.h
  * @author  AMS
  * @version V1.1.0
  * @date    22-January-2019
  * @brief   This file contains data about sensor (sensitivity, calibration)
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

#ifndef __SENSOR_CALIB_TGS5141__
#define __SENSOR_CALIB_TGS5141__

/** Value of the resistor on X-NUCLEO-IKA02A1 expansion board */
#define ANALOG_GAIN 470000 

/** Sensitivity of used sensor in nA/ppm */
#define SENSOR_SENSITIVITY 2.3 

/** Size of temperature lookup table */
#define LOOKUP_LENGTH 61	

/** To be able to compensate in negative temperatures */
#define COMP_SHIFT 10

/** Lookup table for temperature compensation (index [0] = -10 deg C) */
static const float TEMP_COMPENSATION[LOOKUP_LENGTH]={0.6745, 0.6854, 0.6963, 0.7072, 0.7181, 0.7290, 0.7399, 0.7508, 0.7617, 0.7726, 0.7835, 0.7944, 0.8053, 0.8162, 0.8271, 0.8380, 0.8489, 0.8598, 0.8707, 0.8816, 0.8925, 0.9034, 0.9143, 0.9252, 0.9361, 0.9470, 0.9579, 0.9688, 0.9797, 0.9906, 1.0000, 1.0075, 1.0150, 1.0225, 1.0300, 1.0375, 1.0450, 1.0525, 1.0600, 1.0675, 1.0750, 1.0825, 1.0900, 1.0975, 1.1050, 1.1125, 1.1200, 1.1275, 1.1350, 1.1425, 1.1500, 1.1575, 1.1650, 1.1725, 1.1800, 1.1875, 1.1950, 1.2025, 1.2100, 1.2175, 1.2250};

#endif // __SENSOR_CALIB_TGS5141__
