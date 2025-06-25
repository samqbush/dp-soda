Getting Device Real-Time Data
Developer may obtain data within the past 2hrs via its application Key, API key, Mac/IMEI and meteorological data. Or the latest data of camera within 24hrs.

Request to： https://api.ecowitt.net/api/v3/device/real_time

Return Data format： JSON

Request Type： GET

Example： https://api.ecowitt.net/api/v3/device/real_time?application_key=APPLICATION_KEY&api_key=API_KEY&mac=YOUR_MAC_CODE_OF_DEVICE&call_back=all

Interface note： The real-time data of meteorological equipment, camera equipment, and sub-devices are obtained by querying the application key of the calling interface, the key of the calling interface, and the MAC/IMEI identification code of the equipment.

Request Parameters：
Parameter	Type	Required	Description
application_key	String	Yes	obtained application key
api_key	String	Yes	obtained api key
mac	String	No	Device MAC(eg.”FF:FF:FF:FF:FF:FF”;”mac” and “imei” can’t be null at same time)
imei	String	No	Device IMEI(eg.”863879049793071”;”mac” and “imei” can’t be null at same time)
call_back	String	No	The supported returned field types include: outdoor (outdoor group), camera (camera group), WFC01-0xxxxxx8 (Default Title, Sub-device group), and other field queries.
temp_unitid	Integer	No	Temperature unit:(default)”2” for unit in ℉,”1” for unit in ℃
pressure_unitid	Integer	No	Pressure unit:(default)”4” for inHg,”3” for hPa,”5” for mmHg
wind_speed_unitid	Integer	No	Wind speed unit:(default)”9” for mph,”6” for m/s,”7” for km/h,”8” for knots,”10” for BFT,”11” for fpm
rainfall_unitid	Integer	No	Rain unit:(default)”13” for in,”12” for mm
solar_irradiance_unitid	Integer	No	Solar Irradiance:(default)”16” for W/m²,”14” for lux,”15” for fc
capacity_unitid	Integer	No	Capacity:(default)“24” for L，“25” for m³，“26” for gal
API Usage Instructions:
application_key and api_key are mandatory parameters for authentication.
At least one of the mac or imei parameters must be provided to identify the device.
Use the call_back parameter to customize the content of the returned data. It allows specifying specific fields or device types. Multiple field queries can be included, separated by commas, such as outdoor.temp, indoor.humidity, or WFC01-0xxxxxx8.daily.
Set unit parameters as needed, such as the temperature unit (temp_unitid) or wind speed unit (wind_speed_unitid).
Response：
At normal condition, the platform will pass the following data packet in JSON format：

 {
  "code": 0,
  "msg": "success",
  "time": "1645599758",
  "data": {
    "outdoor": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "127.7"
      },
      "feels_like": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "127.7"
      },
      "app_temp": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "46.6"
      },
      "dew_point": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "104.6"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "52"
      }
    },
    "indoor": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "63.7"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "70"
      }
    },
    "solar_and_uvi": {
      "solar": {
        "time": "1645596032",
        "unit": "W/m²",
        "value": "101.8"
      },
      "uvi": {
        "time": "1645596032",
        "unit": "",
        "value": "7"
      }
    },
    "rainfall": {
      "rain_rate": {
        "time": "1645596032",
        "unit": "in/hr",
        "value": "242.56"
      },
      "daily": {
        "time": "1645596032",
        "unit": "in",
        "value": "332.69"
      },
      "event": {
        "time": "1645596032",
        "unit": "in",
        "value": "245.56"
      },
      "hourly": {
        "time": "1645596032",
        "unit": "in",
        "value": "312.33"
      },
      "weekly": {
        "time": "1645596032",
        "unit": "in",
        "value": "372.53"
      },
      "monthly": {
        "time": "1645596032",
        "unit": "in",
        "value": "247.86"
      },
      "yearly": {
        "time": "1645596032",
        "unit": "in",
        "value": "8.25"
      }
    },
    "rainfall_piezo": {
      "rain_rate": {
        "time": "1645596032",
        "unit": "in/hr",
        "value": "267.62"
      },
      "daily": {
        "time": "1645596032",
        "unit": "in",
        "value": "223.72"
      },
      "event": {
        "time": "1645596032",
        "unit": "in",
        "value": "179.51"
      },
      "hourly": {
        "time": "1645596032",
        "unit": "in",
        "value": "38.61"
      },
      "weekly": {
        "time": "1645596032",
        "unit": "in",
        "value": "120.84"
      },
      "monthly": {
        "time": "1645596032",
        "unit": "in",
        "value": "20.31"
      },
      "yearly": {
        "time": "1645596032",
        "unit": "in",
        "value": "339.32"
      }
    },
    "wind": {
      "wind_speed": {
        "time": "1645596032",
        "unit": "mph",
        "value": "46.9"
      },
      "wind_gust": {
        "time": "1645596032",
        "unit": "mph",
        "value": "102.7"
      },
      "wind_direction": {
        "time": "1645596032",
        "unit": "º",
        "value": "267"
      }
    },
    "pressure": {
      "relative": {
        "time": "1645596032",
        "unit": "inHg",
        "value": "26.34"
      },
      "absolute": {
        "time": "1645596032",
        "unit": "inHg",
        "value": "25.59"
      }
    },
    "lightning": {
      "distance": {
        "time": "1645595889",
        "unit": "mi",
        "value": "19"
      },
      "count": {
        "time": "1645596032",
        "unit": "",
        "value": "29414"
      }
    },
    "indoor_co2": {
      "co2": {
        "time": "1645596032",
        "unit": "ppm",
        "value": "21493"
      },
      "24_hours_average": {
        "time": "1645596032",
        "unit": "ppm",
        "value": "13213"
      }
    },
    "co2_aqi_combo": {
      "co2": {
        "time": "1645596032",
        "unit": "ppm",
        "value": "16006"
      },
      "24_hours_average": {
        "time": "1645596032",
        "unit": "ppm",
        "value": "7094"
      }
    },
    "pm25_aqi_combo": {
      "real_time_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "154"
      },
      "pm25": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "61"
      },
      "24_hours_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "493"
      }
    },
    "pm10_aqi_combo": {
      "real_time_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "500"
      },
      "pm10": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "884"
      },
      "24_hours_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "155"
      }
    },
    "pm1_aqi_combo": {
      "real_time_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "154"
      },
      "pm1": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "61"
      },
      "24_hours_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "493"
      }
    },
    "pm4_aqi_combo": {
      "real_time_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "154"
      },
      "pm4": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "61"
      },
      "24_hours_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "493"
      }
    },
    "t_rh_aqi_combo": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "57.2"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "96"
      }
    },
    "water_leak": {
      "leak_ch1": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "leak_ch2": {
        "time": "1645596032",
        "unit": "",
        "value": "2"
      },
      "leak_ch3": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "leak_ch4": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      }
    },
    "pm25_ch1": {
      "real_time_aqi": {
        "time": "1645599717",
        "unit": "µg/m3",
        "value": "229"
      },
      "pm25": {
        "time": "1645599717",
        "unit": "µg/m3",
        "value": "179"
      },
      "24_hours_aqi": {
        "time": "1645599717",
        "unit": "µg/m3",
        "value": "500"
      }
    },
    "pm25_ch2": {
      "real_time_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "170"
      },
      "pm25": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "93"
      },
      "24_hours_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "500"
      }
    },
    "pm25_ch3": {
      "real_time_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "500"
      },
      "pm25": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "550"
      },
      "24_hours_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "485"
      }
    },
    "pm25_ch4": {
      "real_time_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "307"
      },
      "pm25": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "257"
      },
      "24_hours_aqi": {
        "time": "1645596032",
        "unit": "µg/m3",
        "value": "500"
      }
    },
    "temp_and_humidity_ch1": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "70.0"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "85"
      }
    },
    "temp_and_humidity_ch2": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "69.6"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "95"
      }
    },
    "temp_and_humidity_ch3": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "128.0"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "69"
      }
    },
    "temp_and_humidity_ch4": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "91.4"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "23"
      }
    },
    "temp_and_humidity_ch5": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "135.9"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "0"
      }
    },
    "temp_and_humidity_ch6": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "98.9"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "32"
      }
    },
    "temp_and_humidity_ch7": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "-27.2"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "22"
      }
    },
    "temp_and_humidity_ch8": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "78.4"
      },
      "humidity": {
        "time": "1645596032",
        "unit": "%",
        "value": "11"
      }
    },
    "soil_ch1": {
      "soilmoisture": {
        "time": "1645596032",
        "unit": "%",
        "value": "79"
      }
    },
    "soil_ch2": {
      "soilmoisture": {
        "time": "1645596032",
        "unit": "%",
        "value": "19"
      }
    },
    "soil_ch3": {
      "soilmoisture": {
        "time": "1645596032",
        "unit": "%",
        "value": "37"
      }
    },
    "soil_ch4": {
      "soilmoisture": {
        "time": "1645596032",
        "unit": "%",
        "value": "55"
      }
    },
    "soil_ch5": {
      "soilmoisture": {
        "time": "1645596032",
        "unit": "%",
        "value": "47"
      }
    },
    "soil_ch6": {
      "soilmoisture": {
        "time": "1645596032",
        "unit": "%",
        "value": "31"
      }
    },
    "soil_ch7": {
      "soilmoisture": {
        "time": "1645596032",
        "unit": "%",
        "value": "30"
      }
    },
    "soil_ch8": {
      "soilmoisture": {
        "time": "1645596032",
        "unit": "%",
        "value": "46"
      }
    },
    "temp_ch1": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "64.3"
      }
    },
    "temp_ch2": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "104.9"
      }
    },
    "temp_ch3": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "119.3"
      }
    },
    "temp_ch4": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "-8.4"
      }
    },
    "temp_ch5": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "36.5"
      }
    },
    "temp_ch6": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "69.8"
      }
    },
    "temp_ch7": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "129.0"
      }
    },
    "temp_ch8": {
      "temperature": {
        "time": "1645596032",
        "unit": "ºF",
        "value": "-32.1"
      }
    },
    "leaf_ch1": {
      "leaf_wetness": {
        "time": "1645596032",
        "unit": "%",
        "value": "73"
      }
    },
    "leaf_ch2": {
      "leaf_wetness": {
        "time": "1645596032",
        "unit": "%",
        "value": "62"
      }
    },
    "leaf_ch3": {
      "leaf_wetness": {
        "time": "1645596032",
        "unit": "%",
        "value": "27"
      }
    },
    "leaf_ch4": {
      "leaf_wetness": {
        "time": "1645596032",
        "unit": "%",
        "value": "35"
      }
    },
    "leaf_ch5": {
      "leaf_wetness": {
        "time": "1645596032",
        "unit": "%",
        "value": "82"
      }
    },
    "leaf_ch6": {
      "leaf_wetness": {
        "time": "1645596032",
        "unit": "%",
        "value": "73"
      }
    },
    "leaf_ch7": {
      "leaf_wetness": {
        "time": "1645596032",
        "unit": "%",
        "value": "86"
      }
    },
    "leaf_ch8": {
      "leaf_wetness": {
        "time": "1645596032",
        "unit": "%",
        "value": "75"
      }
    },
    "battery": {
      "t_rh_p_sensor": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "ws1900_console": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.07"
      },
      "ws1800_console": {
        "time": "1645596032",
        "unit": "V",
        "value": "2.79"
      },
      "ws6006_console": {
        "time": "1645596032",
        "unit": "%",
        "value": "45"
      },
      "console": {
        "time": "1645596032",
        "unit": "V",
        "value": "3.98"
      },
      "outdoor_t_rh_sensor": {
        "time": "1645596032",
        "unit": "",
        "value": "0"
      },
      "wind_sensor": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.02"
      },
      "haptic_array_battery": {
        "time": "1645596032",
        "unit": "V",
        "value": "2.78"
      },
      "haptic_array_capacitor":{
        "time": "1645596032",
        "unit": "V",
        "value": "0.2"
      },
      "sonic_array": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.71"
      },
      "rainfall_sensor": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.3"
      },
      "sensor_array": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "lightning_sensor": {
        "time": "1645596032",
        "unit": "",
        "value": "2"
      },
      "aqi_combo_sensor": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "water_leak_sensor_ch1": {
        "time": "1645596032",
        "unit": "",
        "value": "5"
      },
      "water_leak_sensor_ch2": {
        "time": "1645596032",
        "unit": "",
        "value": "2"
      },
      "water_leak_sensor_ch3": {
        "time": "1645596032",
        "unit": "",
        "value": "2"
      },
      "water_leak_sensor_ch4": {
        "time": "1645596032",
        "unit": "",
        "value": "3"
      },
      "pm25_sensor_ch1": {
        "time": "1645599717",
        "unit": "",
        "value": "4"
      },
      "pm25_sensor_ch2": {
        "time": "1645596032",
        "unit": "",
        "value": "6"
      },
      "pm25_sensor_ch3": {
        "time": "1645596032",
        "unit": "",
        "value": "4"
      },
      "pm25_sensor_ch4": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "temp_humidity_sensor_ch1": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "temp_humidity_sensor_ch2": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "temp_humidity_sensor_ch3": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "temp_humidity_sensor_ch4": {
        "time": "1645596032",
        "unit": "",
        "value": "0"
      },
      "temp_humidity_sensor_ch5": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "temp_humidity_sensor_ch6": {
        "time": "1645596032",
        "unit": "",
        "value": "0"
      },
      "temp_humidity_sensor_ch7": {
        "time": "1645596032",
        "unit": "",
        "value": "1"
      },
      "temp_humidity_sensor_ch8": {
        "time": "1645596032",
        "unit": "",
        "value": "0"
      },
      "soilmoisture_sensor_ch1": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.3"
      },
      "soilmoisture_sensor_ch2": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.0"
      },
      "soilmoisture_sensor_ch3": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.1"
      },
      "soilmoisture_sensor_ch4": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.0"
      },
      "soilmoisture_sensor_ch5": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.9"
      },
      "soilmoisture_sensor_ch6": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.1"
      },
      "soilmoisture_sensor_ch7": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.9"
      },
      "soilmoisture_sensor_ch8": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.5"
      },
      "temperature_sensor_ch1": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.77"
      },
      "temperature_sensor_ch2": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.15"
      },
      "temperature_sensor_ch3": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.50"
      },
      "temperature_sensor_ch4": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.65"
      },
      "temperature_sensor_ch5": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.99"
      },
      "temperature_sensor_ch6": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.32"
      },
      "temperature_sensor_ch7": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.97"
      },
      "temperature_sensor_ch8": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.15"
      },
      "leaf_wetness_sensor_ch1": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.71"
      },
      "leaf_wetness_sensor_ch2": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.74"
      },
      "leaf_wetness_sensor_ch3": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.97"
      },
      "leaf_wetness_sensor_ch4": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.82"
      },
      "leaf_wetness_sensor_ch5": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.91"
      },
      "leaf_wetness_sensor_ch6": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.30"
      },
      "leaf_wetness_sensor_ch7": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.39"
      },
      "leaf_wetness_sensor_ch8": {
        "time": "1645596032",
        "unit": "V",
        "value": "0.09"
      },
      "ldsbatt_1": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.3"
      },
      "ldsbatt_2": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.3"
      },
      "ldsbatt_3": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.3"
      },
      "ldsbatt_4": {
        "time": "1645596032",
        "unit": "V",
        "value": "1.3"
      }
    },
    "ch_lds1": {
      "air_ch1": {
        "time": "1645596032",
        "unit": "ft",
        "value": "7.26"
      },
      "depth_ch1": {
        "time": "1645596032",
        "unit": "ft",
        "value": "0.00"
      },
      "ldsheat_ch1": {
        "time": "1645596032",
        "unit": "",
        "value": "8806"
      }
    },
    "ch_lds2": {
      "air_ch2": {
        "time": "1645596032",
        "unit": "ft",
        "value": "0.15"
      },
      "depth_ch2": {
        "time": "1645596032",
        "unit": "ft",
        "value": "0.00"
      },
      "ldsheat_ch2": {
        "time": "1645596032",
        "unit": "",
        "value": "43"
      }
    },
    "ch_lds3": {
      "air_ch3": {
        "time": "1645596032",
        "unit": "ft",
        "value": "0.17"
      },
      "depth_ch3": {
        "time": "1645596032",
        "unit": "ft",
        "value": "0.00"
      },
      "ldsheat_ch3": {
        "time": "1645596032",
        "unit": "",
        "value": "8806"
      }
    },
    "ch_lds4": {
      "air_ch4": {
        "time": "1645596032",
        "unit": "ft",
        "value": "7.12"
      },
      "depth_ch4": {
        "time": "1645596032",
        "unit": "ft",
        "value": "0.00"
      },
      "ldsheat_ch4": {
        "time": "1645596032",
        "unit": "",
        "value": "55"
      }
    },
    "WFC01-0xxxxxx8(WFC01 Default Title)": {
      "daily": {
        "value": "0.000",
        "unit": "m³",
        "day": "20240920"
      },
      "monthly": {
        "value": "0.000",
        "unit": "m³",
        "month": "202409"
      },
      "status": {
        "value": "1",
        "unit": "",
        "time": "1726801575"
      },
      "flow_rate": {
        "value": "0.000",
        "unit": "m³/min",
        "time": "1726801575"
      },
      "temperature": {
        "value": "172.5",
        "unit": "℉",
        "time": "1726801575"
      }
    },
    "AC1100-0xxxxxx1(AC1100 Default Title)": {
      "daily": {
        "value": 37,
        "unit": "W·h",
        "day": "20240920"
      },
      "monthly": {
        "value": 1.96,
        "unit": "kW·h",
        "month": "202409"
      },
      "status": {
        "value": 1,
        "unit": "",
        "time": "1726801609"
      },
      "power": {
        "value": 18,
        "unit": "W",
        "time": "1726801609"
      },
      "voltage": {
        "value": 225,
        "unit": "V",
        "time": "1726801609"
      }
    },
    "camera": {
      "photo": {
        "time": "1670809403",
        "url": "https://osstest.ecowitt.net/images/webcam/v0/2022_12_12/1341/cb305613223842647a53166722ac1d25.jpg"
      }
    }
  }
}
Response Parameters:
Parameter	Type	Description
code	Integer	Status code
msg	String	Status Msg
time	String	Time Stamp
data	Object	Data Object
outdoor	Object	Outdoor Data Set
outdoor.temperature	Object	Outdoor Temperature(℉)
outdoor.feels_like	Object	Outdoor Feels Like(℉)
outdoor.app_temp	Object	Apparent Temperature(℉)
outdoor.dew_point	Object	Outdoor Dew Point(℉)
outdoor.humidity	Object	Outdoor Humidity(%)
indoor	Object	Indoor Data Set
indoor.temperature	Object	Indoor Temperature(℉)
indoor.humidity	Object	Indoor Humidity(%)
solar_and_uvi	Object	Solar and UVI Data Set
solar_and_uvi.solar	Object	Solar(w/m²)
solar_and_uvi.uvi	Object	UVI
rainfall	Object	rainfall Data Set(not rainfall_piezo Data Set)
rainfall.rain_rate	Object	Rain Rate(in/hr)
rainfall.daily	Object	Daily Rain(in)
rainfall.event	Object	Event Rain(in)
rainfall.hourly	Object	1H Rain(in)
rainfall.weekly	Object	Weekly Rain(in)
rainfall.monthly	Object	Monthly Rain(in)
rainfall.yearly	Object	Yearly Rain(in)
rainfall_piezo	Object	rainfall_piezo Data Set(not rainfall Data Set)
rainfall_piezo.rain_rate	Object	Rain Rate(in/hr)
rainfall_piezo.daily	Object	Daily Rain(in)
rainfall_piezo.event	Object	Event Rain(in)
rainfall_piezo.hourly	Object	1H Rain(in)
rainfall_piezo.weekly	Object	Weekly Rain(in)
rainfall_piezo.monthly	Object	Monthly Rain(in)
rainfall_piezo.yearly	Object	Yearly Rain(in)
wind	Object	Wind Data Set
wind.wind_speed	Object	Wind Speed(mph)
wind.wind_gust	Object	Wind Gust(mph)
wind.wind_direction	Object	Wind Direction(º)
pressure	Object	Pressure Data Set
pressure.relative	Object	Relative(inHg)
pressure.absolute	Object	Absolute(inHg)
lightning	Object	Lightning Data Set
lightning.distance	Object	Lightning Distance(mi)
lightning.count	Object	Lightning Count(Strikes Counter for today)
indoor_co2	Object	Indoor CO2 Data Set
indoor_co2.co2	Object	CO2(ppm)
indoor_co2.24_hours_average	Object	CO2 24 Hours Average(ppm)
pm25_ch1	Object	PM2.5 CH1 Data Set
pm25_ch1.real_time_aqi	Object	PM2.5 Real-Time AQI
pm25_ch1.pm25	Object	PM2.5(µg/m3)
pm25_ch1.24_hours_aqi	Object	PM2.5 24 Hours AQI
pm25_ch2	Object	PM2.5 CH2 Data Set
pm25_ch2.real_time_aqi	Object	PM2.5 Real-Time AQI
pm25_ch2.pm25	Object	PM2.5(µg/m3)
pm25_ch2.24_hours_aqi	Object	PM2.5 24 Hours AQI
pm25_ch3	Object	PM2.5 CH3 Data Set
pm25_ch3.real_time_aqi	Object	PM2.5 Real-Time AQI
pm25_ch3.pm25	Object	PM2.5(µg/m3)
pm25_ch3.24_hours_aqi	Object	PM2.5 24 Hours AQI
pm25_ch4	Object	PM2.5 CH4 Data Set
pm25_ch4.real_time_aqi	Object	PM2.5 Real-Time AQI
pm25_ch4.pm25	Object	PM2.5(µg/m3)
pm25_ch4.24_hours_aqi	Object	PM2.5 24 Hours AQI
co2_aqi_combo	Object	CO2 For AQI Combo Data Set
co2_aqi_combo.co2	Object	CO2(ppm)
co2_aqi_combo.24_hours_average	Object	CO2 24 Hours Average(ppm)
pm25_aqi_combo	Object	PM2.5 For AQI Combo Data Set
pm25_aqi_combo.real_time_aqi	Object	PM2.5 Real-Time AQI
pm25_aqi_combo.pm25	Object	PM2.5(µg/m3)
pm25_aqi_combo.24_hours_aqi	Object	PM2.5 24 Hours AQI
pm10_aqi_combo	Object	PM10 For AQI Combo Data Set
pm10_aqi_combo.real_time_aqi	Object	PM10 Real-Time AQI
pm10_aqi_combo.pm10	Object	PM10(µg/m3)
pm10_aqi_combo.24_hours_aqi	Object	PM10 24 Hours AQI
pm1_aqi_combo	Object	PM1.0 For AQI Combo Data Set
pm1_aqi_combo.real_time_aqi	Object	PM1.0 Real-Time AQI
pm1_aqi_combo.pm1	Object	PM1.0(µg/m3)
pm1_aqi_combo.24_hours_aqi	Object	PM1.0 24 Hours AQI
pm4_aqi_combo	Object	PM4.0 For AQI Combo Data Set
pm4_aqi_combo.real_time_aqi	Object	PM4.0 Real-Time AQI
pm4_aqi_combo.pm4	Object	PM4.0(µg/m3)
pm4_aqi_combo.24_hours_aqi	Object	PM4.0 24 Hours AQI
t_rh_aqi_combo	Object	T&RH For AQI Combo Data Set
t_rh_aqi_combo.temperature	Object	T&RH For AQI Combo Temperature(℉)
t_rh_aqi_combo.humidity	Object	T&RH For AQI Combo Humidity(%)
water_leak	Object	Water Leak Data Set
water_leak.leak_ch1	Object	Water Leak CH1 Status(value: 0:Normal,1:Leaking,2:Offline)
water_leak.leak_ch2	Object	Water Leak CH2 Status(value: 0:Normal,1:Leaking,2:Offline)
water_leak.leak_ch3	Object	Water Leak CH3 Status(value: 0:Normal,1:Leaking,2:Offline)
water_leak.leak_ch4	Object	Water Leak CH4 Status(value: 0:Normal,1:Leaking,2:Offline)
temp_and_humidity_ch1	Object	Temp and Humidity CH1 Data Set
temp_and_humidity_ch1.temperature	Object	Temp and Humidity CH1 Temperature(℉)
temp_and_humidity_ch1.humidity	Object	Temp and Humidity CH1 Humidity(%)
temp_and_humidity_ch2	Object	Temp and Humidity CH2 Data Set
temp_and_humidity_ch2.temperature	Object	Temp and Humidity CH2 Temperature(℉)
temp_and_humidity_ch2.humidity	Object	Temp and Humidity CH2 Humidity(%)
temp_and_humidity_ch3	Object	Temp and Humidity CH3 Data Set
temp_and_humidity_ch3.temperature	Object	Temp and Humidity CH3 Temperature(℉)
temp_and_humidity_ch3.humidity	Object	Temp and Humidity CH3 Humidity(%)
temp_and_humidity_ch4	Object	Temp and Humidity CH4 Data Set
temp_and_humidity_ch4.temperature	Object	Temp and Humidity CH4 Temperature(℉)
temp_and_humidity_ch4.humidity	Object	Temp and Humidity CH4 Humidity(%)
temp_and_humidity_ch5	Object	Temp and Humidity CH5 Data Set
temp_and_humidity_ch5.temperature	Object	Temp and Humidity CH5 Temperature(℉)
temp_and_humidity_ch5.humidity	Object	Temp and Humidity CH5 Humidity(%)
temp_and_humidity_ch6	Object	Temp and Humidity CH6 Data Set
temp_and_humidity_ch6.temperature	Object	Temp and Humidity CH6 Temperature(℉)
temp_and_humidity_ch6.humidity	Object	Temp and Humidity CH6 Humidity(%)
temp_and_humidity_ch7	Object	Temp and Humidity CH7 Data Set
temp_and_humidity_ch7.temperature	Object	Temp and Humidity CH7 Temperature(℉)
temp_and_humidity_ch7.humidity	Object	Temp and Humidity CH7 Humidity(%)
temp_and_humidity_ch8	Object	Temp and Humidity CH8 Data Set
temp_and_humidity_ch8.temperature	Object	Temp and Humidity CH8 Temperature(℉)
temp_and_humidity_ch8.humidity	Object	Temp and Humidity CH8 Humidity(%)
soil_ch1	Object	Soil CH1 Data Set
soil_ch1.soilmoisture	Object	Soil CH1 Soilmoisture(%)
soil_ch2	Object	Soil CH2 Data Set
soil_ch2.soilmoisture	Object	Soil CH2 Soilmoisture(%)
soil_ch3	Object	Soil CH3 Data Set
soil_ch3.soilmoisture	Object	Soil CH3 Soilmoisture(%)
soil_ch4	Object	Soil CH4 Data Set
soil_ch4.soilmoisture	Object	Soil CH4 Soilmoisture(%)
soil_ch5	Object	Soil CH5 Data Set
soil_ch5.soilmoisture	Object	Soil CH5 Soilmoisture(%)
soil_ch6	Object	Soil CH6 Data Set
soil_ch6.soilmoisture	Object	Soil CH6 Soilmoisture(%)
soil_ch7	Object	Soil CH7 Data Set
soil_ch7.soilmoisture	Object	Soil CH7 Soilmoisture(%)
soil_ch8	Object	Soil CH8 Data Set
soil_ch8.soilmoisture	Object	Soil CH8 Soilmoisture(%)
temp_ch1	Object	Temp CH1 Data Set
temp_ch1.temperature	Object	Temp CH1 Temperature(℉)
temp_ch2	Object	Temp CH2 Data Set
temp_ch2.temperature	Object	Temp CH2 Temperature(℉)
temp_ch3	Object	Temp CH3 Data Set
temp_ch3.temperature	Object	Temp CH3 Temperature(℉)
temp_ch4	Object	Temp CH4 Data Set
temp_ch4.temperature	Object	Temp CH4 Temperature(℉)
temp_ch5	Object	Temp CH5 Data Set
temp_ch5.temperature	Object	Temp CH5 Temperature(℉)
temp_ch6	Object	Temp CH6 Data Set
temp_ch6.temperature	Object	Temp CH6 Temperature(℉)
temp_ch7	Object	Temp CH7 Data Set
temp_ch7.temperature	Object	Temp CH7 Temperature(℉)
temp_ch8	Object	Temp CH8 Data Set
temp_ch8.temperature	Object	Temp CH8 Temperature(℉)
leaf_ch1	Object	Leaf CH1 Data Set
leaf_ch1.leaf_wetness	Object	CH1 Leaf Wetness(%)
leaf_ch2	Object	Leaf CH2 Data Set
leaf_ch2.leaf_wetness	Object	CH2 Leaf Wetness(%)
leaf_ch3	Object	Leaf CH3 Data Set
leaf_ch3.leaf_wetness	Object	CH3 Leaf Wetness(%)
leaf_ch4	Object	Leaf CH4 Data Set
leaf_ch4.leaf_wetness	Object	CH4 Leaf Wetness(%)
leaf_ch5	Object	Leaf CH5 Data Set
leaf_ch5.leaf_wetness	Object	CH5 Leaf Wetness(%)
leaf_ch6	Object	Leaf CH6 Data Set
leaf_ch6.leaf_wetness	Object	CH6 Leaf Wetness(%)
leaf_ch7	Object	Leaf CH7 Data Set
leaf_ch7.leaf_wetness	Object	CH7 Leaf Wetness(%)
leaf_ch8	Object	Leaf CH8 Data Set
leaf_ch8.leaf_wetness	Object	CH8 Leaf Wetness(%)
battery	Object	Battery Data Set
battery.t_rh_p_sensor	Object	T&RH&P Sensor Battery Data
battery.ws1900_console	Object	WS1900 Console Battery Data
battery.ws1800_console	Object	WS1800 Console Battery Data
battery.ws6006_console	Object	WS6006 Console Battery Data
battery.console	Object	Console Battery Data
battery.outdoor_t_rh_sensor	Object	Outdoor T&RH Sensor Battery Data
battery.wind_sensor	Object	Wind Sensor Battery Data
battery.haptic_array_battery	Object	Haptic Array Battery Data
battery.haptic_array_capacitor	Object	Haptic Array Capacitor Data
battery.sonic_array	Object	Sonic Array Battery Data
battery.rainfall_sensor	Object	Rainfall Sensor Battery Data
battery.sensor_array	Object	Sensor Array Battery Data
battery.lightning_sensor	Object	Lightning Sensor Battery Data
battery.aqi_combo_sensor	Object	AQI Combo Sensor Battery Data
battery.water_leak_sensor_ch1	Object	Water Leak Sensor(CH1) Battery Data
battery.water_leak_sensor_ch2	Object	Water Leak Sensor(CH2) Battery Data
battery.water_leak_sensor_ch3	Object	Water Leak Sensor(CH3) Battery Data
battery.water_leak_sensor_ch4	Object	Water Leak Sensor(CH4) Battery Data
battery.pm25_sensor_ch1	Object	PM2.5 Sensor (CH1) Battery Data
battery.pm25_sensor_ch2	Object	PM2.5 Sensor (CH2) Battery Data
battery.pm25_sensor_ch3	Object	PM2.5 Sensor (CH3) Battery Data
battery.pm25_sensor_ch4	Object	PM2.5 Sensor (CH4) Battery Data
battery.temp_humidity_sensor_ch1	Object	Temp&Humidity Sensor (CH1) Battery Data
battery.temp_humidity_sensor_ch2	Object	Temp&Humidity Sensor (CH2) Battery Data
battery.temp_humidity_sensor_ch3	Object	Temp&Humidity Sensor (CH3) Battery Data
battery.temp_humidity_sensor_ch4	Object	Temp&Humidity Sensor (CH4) Battery Data
battery.temp_humidity_sensor_ch5	Object	Temp&Humidity Sensor (CH5) Battery Data
battery.temp_humidity_sensor_ch6	Object	Temp&Humidity Sensor (CH6) Battery Data
battery.temp_humidity_sensor_ch7	Object	Temp&Humidity Sensor (CH7) Battery Data
battery.temp_humidity_sensor_ch8	Object	Temp&Humidity Sensor (CH8) Battery Data
battery.soilmoisture_sensor_ch1	Object	Soilmoisture Sensor (CH1) Battery Data
battery.soilmoisture_sensor_ch2	Object	Soilmoisture Sensor (CH2) Battery Data
battery.soilmoisture_sensor_ch3	Object	Soilmoisture Sensor (CH3) Battery Data
battery.soilmoisture_sensor_ch4	Object	Soilmoisture Sensor (CH4) Battery Data
battery.soilmoisture_sensor_ch5	Object	Soilmoisture Sensor (CH5) Battery Data
battery.soilmoisture_sensor_ch6	Object	Soilmoisture Sensor (CH6) Battery Data
battery.soilmoisture_sensor_ch7	Object	Soilmoisture Sensor (CH7) Battery Data
battery.soilmoisture_sensor_ch8	Object	Soilmoisture Sensor (CH8) Battery Data
battery.temperature_sensor_ch1	Object	Temperature Sensor (CH1) Battery Data
battery.temperature_sensor_ch2	Object	Temperature Sensor (CH2) Battery Data
battery.temperature_sensor_ch3	Object	Temperature Sensor (CH3) Battery Data
battery.temperature_sensor_ch4	Object	Temperature Sensor (CH4) Battery Data
battery.temperature_sensor_ch5	Object	Temperature Sensor (CH5) Battery Data
battery.temperature_sensor_ch6	Object	Temperature Sensor (CH6) Battery Data
battery.temperature_sensor_ch7	Object	Temperature Sensor (CH7) Battery Data
battery.temperature_sensor_ch8	Object	Temperature Sensor (CH8) Battery Data
battery.leaf_wetness_sensor_ch1	Object	Leaf Wetness Sensor (CH1) Battery Data
battery.leaf_wetness_sensor_ch2	Object	Leaf Wetness Sensor (CH2) Battery Data
battery.leaf_wetness_sensor_ch3	Object	Leaf Wetness Sensor (CH3) Battery Data
battery.leaf_wetness_sensor_ch4	Object	Leaf Wetness Sensor (CH4) Battery Data
battery.leaf_wetness_sensor_ch5	Object	Leaf Wetness Sensor (CH5) Battery Data
battery.leaf_wetness_sensor_ch6	Object	Leaf Wetness Sensor (CH6) Battery Data
battery.leaf_wetness_sensor_ch7	Object	Leaf Wetness Sensor (CH7) Battery Data
battery.leaf_wetness_sensor_ch8	Object	Leaf Wetness Sensor (CH8) Battery Data
battery.ldsbatt_1	Object	LDS(CH1) Battery Data
battery.ldsbatt_2	Object	LDS(CH2) Battery Data
battery.ldsbatt_3	Object	LDS(CH3) Battery Data
battery.ldsbatt_4	Object	LDS(CH4) Battery Data
ch_lds1	Object	LDS (CH1) Data Set
ch_lds1.air_ch1	Object	LDS (CH1) Air Value
ch_lds1.depth_ch1	Object	LDS (CH1) Depth Value
ch_lds1.ldsheat_ch1	Object	LDS (CH1) Heater-on Counter
ch_lds2	Object	LDS (CH2) Data Set
ch_lds2.air_ch2	Object	LDS (CH2) Air Value
ch_lds2.depth_ch2	Object	LDS (CH2) Depth Value
ch_lds2.ldsheat_ch2	Object	LDS (CH2) Heater-on Counter
ch_lds3	Object	LDS (CH3) Data Set
ch_lds3.air_ch3	Object	LDS (CH3) Air Value
ch_lds3.depth_ch3	Object	LDS (CH3) Depth Value
ch_lds3.ldsheat_ch3	Object	LDS (CH3) Heater-on Counter
ch_lds4	Object	LDS (CH4) Data Set
ch_lds4.air_ch4	Object	LDS (CH4) Air Value
ch_lds4.depth_ch4	Object	LDS (CH4) Depth Value
ch_lds4.ldsheat_ch4	Object	LDS (CH4) Heater-on Counter
WFC01-0xxxxxx8(WFC01 Default Title)	Object	Sub-Devices(WFC01) Data Set
WFC01-0xxxxxx8.daily	Object	Daily Water Consumption(WFC01)
WFC01-0xxxxxx8.monthly	Object	Monthly Water Consumption(WFC01)
WFC01-0xxxxxx8.status	Object	Sub-Devices(WFC01) Device Status
WFC01-0xxxxxx8.flow_rate	Object	Sub-Devices(WFC01) Flow rate Data
WFC01-0xxxxxx8.temperature	Object	Sub-Devices(WFC01) Temperature Data
AC1100-0xxxxxx1(AC1100 Default Title)	Object	Sub-Devices(AC1100) Data Set
AC1100-0xxxxxx1.daily	Object	Daily Electricity consumption(AC1100)
AC1100-0xxxxxx1.monthly	Object	Monthly Electricity Consumption(AC1100)
AC1100-0xxxxxx1.status	Object	Sub-Devices(AC1100) Device Status
AC1100-0xxxxxx1.power	Object	Sub-Devices(AC1100) Power Data
AC1100-0xxxxxx1.voltage	Object	Sub-Devices(AC1100) Voltage Data
camera	Object	Camera equipment
camera.photo	Object	Camera device photo data(time: shooting time,url: photo location)
If there is an error, the returned data packet will contain the error code in JSON format（ the example below indicates invalid application key error result）:

   {
       "code": 40010,
       "msg": "Invalid application Key",
       "time": "1578988481",
       "data": [ ]
   }
The returned result code can be referred to RESULT CODE BRIEVIATION