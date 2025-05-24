#!/usr/bin/env node

/**
 * Standalone wind data fetching script for Bear Creek Lake
 * This script can be run independently to fetch and analyze wind data
 * Similar to the original scrap-wind-react.js but optimized for the mobile app
 */

import axios from 'axios';
import fs from 'fs';

// WindAlert API constants
const BASE_URL = 'https://windalert.com';
const SPOT_ID = '149264'; // Bear Creek Lake (Soda Lake Dam 1)

/**
 * Fetches wind data directly from WindAlert API
 */
const fetchWindData = async () => {
  try {
    console.log('Fetching wind data from WindAlert API...');
    
    const now = Date.now();
    const params = {
      callback: `jQuery17206585233276552562_${now}`,
      units_wind: 'kph',
      units_temp: 'c',
      units_distance: 'km',
      units_precip: 'mm',
      fields: 'wind',
      format: 'json',
      null_ob_min_from_now: 30,
      show_virtual_obs: 'true',
      spot_id: SPOT_ID,
      time_start_offset_hours: -25,
      time_end_offset_hours: 0,
      type: 'dataonly',
      model_ids: -101,
      wf_token: 'f546a4d1e7115896684766407a63e45c',
      _: now
    };

    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Referer': `${BASE_URL}/spot/${SPOT_ID}`,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest'
    };

    const apiUrl = 'https://api.weatherflow.com/wxengine/rest/graph/getGraph';
    const response = await axios.get(apiUrl, {
      params,
      headers,
      timeout: 10000
    });
    
    // Parse JSONP response
    const text = response.data;
    const match = text.match(/^[^(]+\((.*)\)$/s);
    
    if (!match) {
      throw new Error('Failed to parse JSONP response');
    }
    
    const json = JSON.parse(match[1]);
    console.log('Successfully fetched wind data');
    
    return processWindData(json);
  } catch (error) {
    console.error('Error fetching wind data:', error.message);
    throw error;
  }
};

/**
 * Processes raw wind data from API
 */
const processWindData = (graphData) => {
  console.log('Processing graph data with keys:', Object.keys(graphData));
  
  const avgArr = graphData.wind_avg_data || [];
  const gustArr = graphData.wind_gust_data || [];
  let dirArr = graphData.wind_dir_data || graphData.wind_direction_data || [];
  
  if (!dirArr.length && graphData.wind_dir_text_data) {
    dirArr = graphData.wind_dir_text_data;
  }
  
  if (!avgArr.length || !gustArr.length) {
    throw new Error('Missing wind data in response');
  }
  
  // Convert kph to mph
  const convertWindValue = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    const mphValue = numValue * 0.621371;
    return mphValue.toFixed(2);
  };
  
  // Filter for last 24 hours
  const now = new Date(avgArr[avgArr.length - 1][0]);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const processedData = avgArr.map((avg, i) => {
    const timestamp = avg[0];
    return {
      time: new Date(timestamp).toISOString(),
      windSpeed: convertWindValue(avg[1]),
      windGust: gustArr[i] ? convertWindValue(gustArr[i][1]) : '',
      windDirection: dirArr[i] ? dirArr[i][1] : ''
    };
  }).filter(row => new Date(row.time) >= twentyFourHoursAgo);

  console.log(`Processed ${processedData.length} data points for the last 24 hours`);
  return processedData;
};

/**
 * Analyzes wind data for alarm worthiness
 */
const analyzeWindData = (data, criteria = {}) => {
  const defaultCriteria = {
    minimumAverageSpeed: 10,
    directionConsistencyThreshold: 70,
    minimumConsecutivePoints: 4,
    speedDeviationThreshold: 3,
    directionDeviationThreshold: 45
  };
  
  const config = { ...defaultCriteria, ...criteria };
  
  if (!data.length) {
    return {
      isAlarmWorthy: false,
      averageSpeed: 0,
      directionConsistency: 0,
      consecutiveGoodPoints: 0,
      analysis: 'No wind data available'
    };
  }

  // Filter for alarm window (3am-5am)
  const now = new Date();
  const today3am = new Date(now);
  today3am.setHours(3, 0, 0, 0);
  const today5am = new Date(now);
  today5am.setHours(5, 0, 0, 0);

  const alarmWindowData = data.filter(point => {
    const pointTime = new Date(point.time);
    return pointTime >= today3am && pointTime <= today5am;
  });

  if (alarmWindowData.length === 0) {
    return {
      isAlarmWorthy: false,
      averageSpeed: 0,
      directionConsistency: 0,
      consecutiveGoodPoints: 0,
      analysis: 'No data available for alarm window (3am-5am)'
    };
  }

  // Calculate metrics
  const speeds = alarmWindowData
    .map(point => parseFloat(point.windSpeed))
    .filter(speed => !isNaN(speed));
  
  const averageSpeed = speeds.length > 0 
    ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length 
    : 0;

  const directions = alarmWindowData
    .map(point => parseFloat(point.windDirection))
    .filter(dir => !isNaN(dir));

  const directionConsistency = calculateDirectionConsistency(directions);
  const consecutiveGoodPoints = countConsecutiveGoodPoints(alarmWindowData, config);

  const isAlarmWorthy = 
    averageSpeed >= config.minimumAverageSpeed &&
    directionConsistency >= config.directionConsistencyThreshold &&
    consecutiveGoodPoints >= config.minimumConsecutivePoints;

  const analysis = `Avg Speed: ${averageSpeed.toFixed(1)}mph, ` +
    `Direction Consistency: ${directionConsistency.toFixed(1)}%, ` +
    `Consecutive Good Points: ${consecutiveGoodPoints}`;

  return {
    isAlarmWorthy,
    averageSpeed,
    directionConsistency,
    consecutiveGoodPoints,
    analysis
  };
};

/**
 * Calculate direction consistency percentage
 */
const calculateDirectionConsistency = (directions) => {
  if (directions.length < 2) return 0;

  let sumSin = 0;
  let sumCos = 0;
  
  directions.forEach(dir => {
    const radians = (dir * Math.PI) / 180;
    sumSin += Math.sin(radians);
    sumCos += Math.cos(radians);
  });
  
  const meanSin = sumSin / directions.length;
  const meanCos = sumCos / directions.length;
  const resultantLength = Math.sqrt(meanSin * meanSin + meanCos * meanCos);
  
  return resultantLength * 100;
};

/**
 * Count consecutive good data points
 */
const countConsecutiveGoodPoints = (data, criteria) => {
  let maxConsecutive = 0;
  let currentConsecutive = 0;

  for (const point of data) {
    const speed = parseFloat(point.windSpeed);
    const isGoodPoint = !isNaN(speed) && speed >= criteria.minimumAverageSpeed;

    if (isGoodPoint) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }

  return maxConsecutive;
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    console.log('🌊 Bear Creek Lake Wind Data Fetcher');
    console.log('=====================================');
    
    const windData = await fetchWindData();
    const analysis = analyzeWindData(windData);
    
    // Output files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFile = `wind_data_${timestamp}.json`;
    const csvFile = `wind_data_${timestamp}.csv`;
    
    // Write JSON
    fs.writeFileSync(jsonFile, JSON.stringify({
      metadata: {
        location: 'Bear Creek Lake (Soda Lake Dam 1), Colorado',
        timestamp: new Date().toISOString(),
        dataPoints: windData.length
      },
      analysis,
      data: windData
    }, null, 2));
    
    // Write CSV
    const csvHeader = 'Time,Wind Speed (mph),Wind Gust (mph),Wind Direction (degrees)\n';
    const csvRows = windData.map(point => 
      `${point.time},${point.windSpeed},${point.windGust},${point.windDirection}`
    ).join('\n');
    fs.writeFileSync(csvFile, csvHeader + csvRows);
    
    // Console output
    console.log('\n📊 Analysis Results:');
    console.log('==================');
    console.log(`🚨 Alarm Worthy: ${analysis.isAlarmWorthy ? 'YES! 🌊' : 'No 😴'}`);
    console.log(`💨 Average Speed: ${analysis.averageSpeed.toFixed(1)} mph`);
    console.log(`🧭 Direction Consistency: ${analysis.directionConsistency.toFixed(1)}%`);
    console.log(`📈 Consecutive Good Points: ${analysis.consecutiveGoodPoints}`);
    console.log(`📝 Analysis: ${analysis.analysis}`);
    
    console.log('\n📁 Output Files:');
    console.log(`   JSON: ${jsonFile}`);
    console.log(`   CSV:  ${csvFile}`);
    console.log(`   Data points: ${windData.length}`);
    
    if (analysis.isAlarmWorthy) {
      console.log('\n🎉 Wake up! Wind conditions look great for the beach! 🏖️');
    } else {
      console.log('\n😴 Sleep in. Wind conditions are not ideal for beach activities.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
