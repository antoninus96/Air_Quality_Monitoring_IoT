
/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef __GAS_H
#define __GAS_H

// this need to be modified according to which kind of board is used, to select the appropriate drivers
#define USE_STM32F4XX_NUCLEO


#define USARTx_PRINT_RX_GPIO_CLK_ENABLE()      __HAL_RCC_GPIOA_CLK_ENABLE()
#define USARTx_PRINT_TX_GPIO_CLK_ENABLE()      __HAL_RCC_GPIOA_CLK_ENABLE()  
#define USARTx_PRINT_CLK_ENABLE()              __HAL_RCC_USART2_CLK_ENABLE()  

#ifdef __cplusplus
extern "C" {
#endif  
#ifdef USE_STM32F4XX_NUCLEO
	#define FLASH_SENS_ADDR           ((uint32_t)0x0800D000)
	#define FLASH_GAIN_ADDR           ((uint32_t)0x0800B000)
#endif

#ifdef USE_STM32L0XX_NUCLEO
	#define FLASH_SENS_ADDR           ((uint32_t)0x0800D000)
	#define FLASH_GAIN_ADDR           ((uint32_t)0x0800D080)
#endif
  
#ifdef USE_STM32L4XX_NUCLEO
	#define FLASH_SENS_ADDR           ((uint32_t)0x0803F000)
	#define FLASH_GAIN_ADDR           ((uint32_t)0x0803F800)
	#define FLASH_SENS_PAGE 					318
	#define FLASH_GAIN_PAGE						319
	#define FLASH_TYPEPROGRAM_WORD FLASH_TYPEPROGRAM_DOUBLEWORD
#endif

// these pin names must be changed according to the nams that are specified in PinNames.h
// eg: pin A2 named here is PA_2 in PinNames.h, so the we refer to it as D1	

/** Analog input pin for reference voltage	
  * Default A2, alternative A0
  */
#define ANALOG_REF_VOLT_VALUE_PIN D1 //

/** Analog input pin for Gas concentration reading
  * Default A3, alternative A1
  */
#define ANALOG_GAS_VALUE_PIN D0

/** Analog input pin for temperature reading
  * Default A5, alternative A4
  */
#define ANALOG_TEMP_VALUE D13

#ifdef __cplusplus
}
#endif

float Get_Gas_value(void);
float Get_Gas_comp(void);
float Get_Temp(void);

#endif /* __GAS_H */
