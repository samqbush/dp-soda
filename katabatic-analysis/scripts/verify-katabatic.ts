#!/usr/bin/env tsx
/**
 * Katabatic wind verification script using ACTUAL app TypeScript logic
 * This uses Node.js-compatible versions of the real services AND actual Ecowitt data
 */

import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Import the Node.js-compatible services
import { hybridWeatherService } from '../services/hybridWeatherService-node.js';
import { getDawnPatrolWindData } from '../services/ecowittService-node.js';

async function main() {
  try {
    console.log(chalk.blue('🔍 Katabatic Wind Verification'));
    console.log(chalk.blue('Using Real App TypeScript Services + Ecowitt Data'));
    console.log('='.repeat(50));
    
    // Find yesterday's prediction
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const predictionFile = join(process.cwd(), 'katabatic-analysis', 'data', 'predictions', 
      `prediction_${yesterday.toISOString().split('T')[0]}.json`);
    
    try {
      const predictionData = JSON.parse(await fs.readFile(predictionFile, 'utf-8'));
      console.log(chalk.blue('📊 Verifying prediction accuracy using dawn patrol wind data...'));
      
      // Get actual dawn patrol wind data (6-8am today)
      const dawnPatrolData = await getDawnPatrolWindData();
      
      if (!dawnPatrolData) {
        console.error(chalk.red('❌ Unable to retrieve dawn patrol wind data from Ecowitt API'));
        console.log(chalk.yellow('   Please check your Ecowitt API credentials and device setup'));
        console.log(chalk.gray('   Required env vars: ECOWITT_API_KEY, ECOWITT_APPLICATION_KEY'));
        console.log(chalk.gray('   Device: MAC address will be auto-detected for "DP Soda Lakes" device'));
        process.exit(1);
      }
      
      const predictedProbability = predictionData.prediction.probability;
      const actualAvgWind = dawnPatrolData.averageWindSpeed;
      const actualMaxWind = dawnPatrolData.maxWindSpeed;
      
      console.log('\n' + chalk.cyan('🔍 PREDICTION vs DAWN PATROL REALITY'));
      console.log('='.repeat(60));
      console.log(chalk.white(`📅 Yesterday's Prediction: ${chalk.bold(predictedProbability + '%')} probability`));
      console.log(chalk.white(`� Dawn Patrol Window: ${chalk.bold('6:00 AM - 8:00 AM today')}`));
      console.log(chalk.white(`�🌬️ Average Wind Speed: ${chalk.bold(actualAvgWind.toFixed(1) + ' mph')}`));
      console.log(chalk.white(`💨 Max Wind Speed: ${chalk.bold(actualMaxWind.toFixed(1) + ' mph')}`));
      console.log(chalk.white(`📊 Data Points: ${chalk.bold(dawnPatrolData.dataPoints + ' readings')}`));
      console.log(chalk.white(`📊 Prediction Date: ${yesterday.toLocaleDateString()}`));
      
      // Enhanced verification logic with proper dawn patrol thresholds
      let accuracy = 'Unknown';
      let recommendation = '';
      let confidenceImpact = '';
      
      // Use 15+ mph as threshold for "good" dawn patrol conditions (as mentioned by user)
      const goodWindThreshold = 15; // mph
      const marginalWindThreshold = 10; // mph
      
      // Use AVERAGE wind speed for classification, not max gusts
      // Dawn patrol needs sustained winds, not just brief gusts
      const hadGoodWinds = actualAvgWind >= goodWindThreshold;
      const hadMarginalWinds = actualAvgWind >= marginalWindThreshold && actualAvgWind < goodWindThreshold;
      const hadPoorWinds = actualAvgWind < marginalWindThreshold;
      
      if (predictedProbability >= 70 && hadGoodWinds) {
        accuracy = '🎯 EXCELLENT - High probability prediction, strong dawn patrol winds delivered!';
        recommendation = '✅ Trust high-probability forecasts! System is working beautifully.';
        confidenceImpact = '📈 High confidence in 70%+ predictions confirmed';
      } else if (predictedProbability >= 70 && hadMarginalWinds) {
        accuracy = '📊 GOOD - High probability prediction, decent winds (but not epic)';
        recommendation = '👍 High predictions are reliable, but may slightly over-promise peak conditions.';
        confidenceImpact = '📈 Continue trusting 70%+ predictions, with slight caution on expectations';
      } else if (predictedProbability >= 70 && hadPoorWinds) {
        accuracy = '❌ FALSE POSITIVE - High probability but dawn patrol was a bust';
        recommendation = '⚠️ High predictions may be too optimistic. Review factor calibration urgently.';
        confidenceImpact = '📉 Reduce trust in high-probability predictions until system improves';
      } else if (predictedProbability < 30 && hadGoodWinds) {
        accuracy = '❌ MAJOR MISS - Low probability but dawn patrol was epic!';
        recommendation = '🚨 Prediction system missed excellent conditions. Major calibration needed.';
        confidenceImpact = '🔍 Critical review needed - system may be too conservative';
      } else if (predictedProbability < 30 && hadPoorWinds) {
        accuracy = '✅ CORRECT SKIP - Low probability correctly predicted poor conditions';
        recommendation = '👍 Low-probability predictions saving you from bad dawn patrols.';
        confidenceImpact = '� Trust low-probability predictions to skip bad conditions';
      } else if (predictedProbability >= 50 && predictedProbability < 70 && hadGoodWinds) {
        accuracy = '🎯 UNDER-PROMISED - Moderate prediction but great dawn patrol!';
        recommendation = '📈 Moderate predictions may be conservative. Consider trusting 50%+ more.';
        confidenceImpact = '➡️ Moderate predictions (50-70%) may be worth the risk';
      } else if (predictedProbability >= 50 && predictedProbability < 70 && hadMarginalWinds) {
        accuracy = '✅ MODERATE CORRECT - Moderate prediction, moderate conditions';
        recommendation = '📊 Mid-range predictions working as expected for marginal conditions.';
        confidenceImpact = '➡️ Continue using 50-70% predictions for planning purposes';
      } else if (predictedProbability >= 30 && predictedProbability < 50 && hadPoorWinds) {
        accuracy = '✅ LOW-MODERATE CORRECT - Cautious prediction, poor conditions confirmed';
        recommendation = '📊 Lower predictions correctly identified marginal/poor conditions.';
        confidenceImpact = '➡️ 30-50% predictions appropriately cautious';
      } else {
        // Edge cases
        accuracy = '🤔 COMPLEX CASE - Prediction and conditions in grey area';
        recommendation = '📈 Neither clearly right nor wrong. Continue monitoring for patterns.';
        confidenceImpact = '➡️ Insufficient evidence to adjust confidence levels';
      }
      
      console.log('\n' + chalk.bold('📊 VERIFICATION RESULT:'));
      console.log(chalk.white(`   ${accuracy}`));
      
      console.log('\n' + chalk.bold('💡 ACTIONABLE INSIGHT:'));
      console.log(chalk.white(`   ${recommendation}`));
      
      console.log('\n' + chalk.bold('🎯 CONFIDENCE ADJUSTMENT:'));
      console.log(chalk.white(`   ${confidenceImpact}`));
      
      // Wind analysis breakdown
      console.log('\n' + chalk.bold('🌬️ DAWN PATROL WIND ANALYSIS:'));
      if (hadGoodWinds) {
        console.log(chalk.green(`   🎯 EPIC CONDITIONS: Average ${actualAvgWind.toFixed(1)} mph (≥15 mph threshold)`));
      } else if (hadMarginalWinds) {
        console.log(chalk.yellow(`   📊 MARGINAL CONDITIONS: Average ${actualAvgWind.toFixed(1)} mph (10-15 mph range)`));
      } else {
        console.log(chalk.red(`   ❌ POOR CONDITIONS: Average ${actualAvgWind.toFixed(1)} mph (<10 mph threshold)`));
      }
      console.log(chalk.white(`   � Peak Gust: ${actualMaxWind.toFixed(1)} mph (brief peak)`));
      console.log(chalk.white(`   📊 Consistency: ${(dawnPatrolData.dataPoints)} readings analyzed`));
      
      // Show prediction factors for deeper analysis
      if (predictionData.prediction.factors) {
        console.log('\n' + chalk.bold('🔬 YESTERDAY\'S PREDICTION FACTORS:'));
        const factors = predictionData.prediction.factors;
        
        if (factors.precipitation) {
          console.log(chalk.white(`   ☔ Precipitation: ${factors.precipitation.value?.toFixed(1) || 'N/A'}% (predicted ${factors.precipitation.meets ? '✅' : '❌'})`));
        }
        if (factors.skyConditions) {
          console.log(chalk.white(`   🌙 Clear Sky: ${factors.skyConditions.clearPeriodCoverage?.toFixed(0) || 'N/A'}% (predicted ${factors.skyConditions.meets ? '✅' : '❌'})`));
        }
        if (factors.pressureChange) {
          console.log(chalk.white(`   📈 Pressure: ${factors.pressureChange.change > 0 ? '+' : ''}${factors.pressureChange.change?.toFixed(1) || 'N/A'} hPa (predicted ${factors.pressureChange.meets ? '✅' : '❌'})`));
        }
        if (factors.temperatureDifferential) {
          console.log(chalk.white(`   🌡️ Temp Diff: ${factors.temperatureDifferential.differential?.toFixed(1) || 'N/A'}°F (predicted ${factors.temperatureDifferential.meets ? '✅' : '❌'})`));
        }
        if (factors.wavePattern) {
          console.log(chalk.white(`   🌊 Wave Pattern: ${factors.wavePattern.waveEnhancement || 'N/A'} (predicted ${factors.wavePattern.meets ? '✅' : '❌'})`));
        }
      }
      
      console.log('\n' + chalk.bold('🎯 DAWN PATROL DECISION MATRIX:'));
      console.log(chalk.white('   🎯 Epic (≥15 mph avg): Go for it! Set multiple alarms!'));
      console.log(chalk.white('   📊 Marginal (10-15 mph avg): Probably worth it, conditions decent'));
      console.log(chalk.white('   ❌ Poor (<10 mph avg): Skip it, save your energy'));
      console.log(chalk.gray('   💡 Note: Based on sustained average winds, not brief gusts'));
      
      console.log('\n' + chalk.gray('💡 TIP: Run this daily to build confidence in your prediction system!'));
      console.log(chalk.gray('✅ Using real Ecowitt API data for dawn patrol wind verification'));
      
    } catch (error) {
      console.log(chalk.yellow('⚠️ No prediction file found for yesterday'));
      console.log(chalk.gray(`   Looking for: ${predictionFile}`));
      console.log(chalk.gray('   Run "npm run katabatic:predict" daily to generate predictions'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Verification failed:'), (error as Error).message);
    process.exit(1);
  }
}

main();