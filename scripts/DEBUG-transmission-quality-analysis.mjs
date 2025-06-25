#!/usr/bin/env node

/**
 * DEBUG SCRIPT: Transmission Quality Analysis
 * 
 * This script analyzes current transmission quality for debugging purposes.
 * Can be safely removed once transmission quality features are stable.
 * 
 * Usage: node scripts/DEBUG-transmission-quality-analysis.mjs
 */

import { fetchEcowittCombinedWindDataForDevice, analyzeOverallTransmissionQuality } from '../services/ecowittService.js';

console.log('🔍 Debugging Transmission Quality Analysis\n');

try {
  console.log('📡 Fetching current data for DP Soda Lakes...');
  const data = await fetchEcowittCombinedWindDataForDevice('DP Soda Lakes');
  
  console.log(`📊 Received ${data.length} data points`);
  
  if (data.length > 0) {
    // Check the first few and last few points
    console.log('\n🔍 Sample Data Points:');
    const samplePoints = [
      ...data.slice(0, 3),  // First 3
      ...data.slice(-3)     // Last 3
    ];
    
    samplePoints.forEach((point, index) => {
      const isFromEnd = index >= 3;
      const actualIndex = isFromEnd ? data.length - (6 - index) : index;
      
      console.log(`\nPoint ${actualIndex + 1} (${isFromEnd ? 'recent' : 'early'}):`);
      console.log(`  Time: ${point.time}`);
      console.log(`  Wind Speed: ${point.windSpeedMph} mph`);
      console.log(`  Temperature: ${point.temperature || 'undefined'}`);
      console.log(`  Humidity: ${point.humidity || 'undefined'}`);
      console.log(`  Transmission Quality: ${JSON.stringify(point.transmissionQuality, null, 4)}`);
    });
    
    console.log('\n📊 Overall Transmission Quality Analysis:');
    const qualityAnalysis = analyzeOverallTransmissionQuality(data);
    
    console.log(`Status: ${qualityAnalysis.currentTransmissionStatus}`);
    console.log(`Is Full Transmission: ${qualityAnalysis.isFullTransmission}`);
    console.log(`Has Outdoor Sensors: ${qualityAnalysis.hasOutdoorSensors}`);
    console.log(`Has Wind Data: ${qualityAnalysis.hasWindData}`);
    console.log(`Has Complete Sensor Data: ${qualityAnalysis.hasCompleteSensorData}`);
    console.log(`Last Good Transmission: ${qualityAnalysis.lastGoodTransmissionTime}`);
    console.log(`Transmission Gaps: ${qualityAnalysis.transmissionGaps.length}`);
    
    if (qualityAnalysis.transmissionGaps.length > 0) {
      console.log('\nDetected Gaps:');
      qualityAnalysis.transmissionGaps.forEach((gap, index) => {
        console.log(`  Gap ${index + 1}: ${gap.type} for ${gap.durationMinutes} minutes`);
        console.log(`    From: ${gap.startTime}`);
        console.log(`    To: ${gap.endTime}`);
        console.log(`    Affected: ${gap.affectedSensors.join(', ')}`);
      });
    }
    
    // Check the latest point specifically
    const latestPoint = data[data.length - 1];
    console.log('\n🎯 Latest Data Point Analysis:');
    console.log(`Time: ${latestPoint.time}`);
    console.log(`Wind Speed: ${latestPoint.windSpeedMph} mph`);
    console.log(`Has transmission quality data: ${!!latestPoint.transmissionQuality}`);
    
    if (latestPoint.transmissionQuality) {
      console.log(`Latest transmission quality:`);
      console.log(`  Is Full Transmission: ${latestPoint.transmissionQuality.isFullTransmission}`);
      console.log(`  Has Outdoor Sensors: ${latestPoint.transmissionQuality.hasOutdoorSensors}`);
      console.log(`  Missing Fields: ${latestPoint.transmissionQuality.missingDataFields.join(', ')}`);
    } else {
      console.log('❌ No transmission quality data attached to latest point!');
    }
  }
  
} catch (error) {
  console.error('❌ Error during analysis:', error);
}

console.log('\n✅ Debug analysis complete');
