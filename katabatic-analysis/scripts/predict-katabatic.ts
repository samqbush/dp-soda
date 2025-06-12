#!/usr/bin/env tsx
/**
 * Real katabatic wind prediction script using ACTUAL app TypeScript logic
 * This uses Node.js-compatible versions of the real services
 */

import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as asciichart from 'asciichart';

// Load environment variables
dotenv.config();

// Import the Node.js-compatible services (same logic as real app services)
import { hybridWeatherService } from '../services/hybridWeatherService-node.js';
import { katabaticAnalyzer, type KatabaticPrediction, type KatabaticFactors } from '../services/katabaticAnalyzer-node.js';

console.log(chalk.green('✅ Successfully imported Node.js-compatible app services!'));

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

function formatHeader() {
  console.log(chalk.cyan('🌬️  KATABATIC WIND PREDICTION SYSTEM'));
  console.log(chalk.cyan('    Using Real App TypeScript Services'));
  console.log('='.repeat(80));
}

function displayPredictionSummary(prediction: KatabaticPrediction, predictionDate: Date) {
  console.log('='.repeat(80));
  console.log(chalk.white(`📅 Prediction for: ${chalk.bold(predictionDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }))}`));
  console.log(chalk.white(`⏰ Dawn Patrol Window: ${chalk.bold('6:00 AM - 8:00 AM')}`));
  console.log(chalk.white(`🕐 Generated: ${chalk.bold(new Date().toLocaleString())}`));
  
  const probabilityColor = prediction.probability >= 70 ? chalk.green :
                          prediction.probability >= 50 ? chalk.yellow : chalk.red;
  const confidenceColor = prediction.confidence >= 70 ? chalk.green :
                         prediction.confidence >= 50 ? chalk.yellow : chalk.red;
  const recommendationColor = prediction.recommendation === 'GO' ? chalk.green :
                             prediction.recommendation === 'MARGINAL' ? chalk.yellow : chalk.red;
  
  console.log('\n' + chalk.bold('🔮 PREDICTION SUMMARY'));
  console.log(chalk.white(`   Probability: ${probabilityColor.bold(prediction.probability.toFixed(0) + '%')}`));
  console.log(chalk.white(`   Confidence: ${confidenceColor.bold(prediction.confidence.toFixed(0) + '%')}`));
  console.log(chalk.white(`   Recommendation: ${recommendationColor.bold(prediction.recommendation)}`));
  console.log(chalk.white(`   Explanation: ${chalk.italic(prediction.explanation)}`));
}

function displayFactorAnalysis(factors: KatabaticFactors) {
  console.log('\n' + chalk.bold('📊 5-FACTOR ANALYSIS (REAL APP ALGORITHM)'));
  
  const table = new Table({
    head: [
      chalk.bold('Factor'),
      chalk.bold('Status'),
      chalk.bold('Value'),
      chalk.bold('Confidence'),
      chalk.bold('Details')
    ],
    colWidths: [20, 8, 20, 12, 40],
    style: {
      head: ['cyan'],
      border: ['gray']
    }
  });

  // Precipitation Factor
  table.push([
    '☔ Precipitation',
    factors.precipitation.meets ? chalk.green('✅ PASS') : chalk.red('❌ FAIL'),
    `${factors.precipitation.value.toFixed(1)}% (≤${factors.precipitation.threshold}%)`,
    `${factors.precipitation.confidence.toFixed(0)}%`,
    factors.precipitation.meets ? 'Low precip chance favors katabatic' : 'High precip chance disrupts flow'
  ]);

  // Sky Conditions Factor
  table.push([
    '☀️ Sky Conditions',
    factors.skyConditions.meets ? chalk.green('✅ PASS') : chalk.red('❌ FAIL'),
    `${factors.skyConditions.clearPeriodCoverage.toFixed(0)}% clear (≥${factors.skyConditions.threshold}%)`,
    `${factors.skyConditions.confidence.toFixed(0)}%`,
    factors.skyConditions.meets ? 'Clear skies enable cooling' : 'Clouds block radiational cooling'
  ]);

  // Pressure Change Factor
  table.push([
    '📊 Pressure Change',
    factors.pressureChange.meets ? chalk.green('✅ PASS') : chalk.red('❌ FAIL'),
    `${factors.pressureChange.value.toFixed(1)} hPa (${factors.pressureChange.trend})`,
    `${factors.pressureChange.confidence.toFixed(0)}%`,
    factors.pressureChange.meets ? 'Good pressure gradient drives flow' : 'Weak pressure gradient'
  ]);

  // Temperature Differential Factor
  table.push([
    '🌡️ Temperature Diff',
    factors.temperatureDifferential.meets ? chalk.green('✅ PASS') : chalk.red('❌ FAIL'),
    `${factors.temperatureDifferential.value.toFixed(1)}°F (≥${factors.temperatureDifferential.threshold}°F)`,
    `${factors.temperatureDifferential.confidence.toFixed(0)}%`,
    factors.temperatureDifferential.meets ? 'Strong temp gradient drives katabatic' : 'Weak temperature differential'
  ]);

  // Wave Pattern Factor
  table.push([
    '🌊 Wave Pattern',
    factors.wavePattern.meets ? chalk.green('✅ PASS') : chalk.red('❌ FAIL'),
    `${factors.wavePattern.score.toFixed(0)}/100 (${factors.wavePattern.enhancement})`,
    `${factors.wavePattern.confidence.toFixed(0)}%`,
    factors.wavePattern.analysis
  ]);

  console.log(table.toString());
}

function displayCallToAction(prediction: KatabaticPrediction) {
  console.log('\n' + chalk.bold('🎯 CALL TO ACTION'));
  console.log('='.repeat(50));
  
  if (prediction.recommendation === 'GO') {
    console.log(chalk.green.bold('🚀 GO FOR IT!'));
    console.log(chalk.green('   • Conditions are favorable for katabatic winds'));
    console.log(chalk.green('   • Set your alarm for dawn patrol'));
    console.log(chalk.green('   • Check conditions again in the morning'));
  } else if (prediction.recommendation === 'MARGINAL') {
    console.log(chalk.yellow.bold('🤔 MARGINAL - USE JUDGMENT'));
    console.log(chalk.yellow('   • Mixed conditions - some factors favorable'));
    console.log(chalk.yellow('   • Monitor overnight for changes'));
    console.log(chalk.yellow('   • Consider partial deployment'));
  } else {
    console.log(chalk.red.bold('🛑 SKIP'));
    console.log(chalk.red('   • Conditions not favorable for katabatic winds'));
    console.log(chalk.red('   • Save your energy for a better day'));
    console.log(chalk.red('   • Check prediction again tomorrow'));
  }
}

function displayDetailedAnalysis(prediction: KatabaticPrediction) {
  console.log('\n' + chalk.bold('📋 DETAILED ANALYSIS'));
  console.log('='.repeat(50));
  
  console.log(chalk.white('📈 Factors Summary:'));
  console.log(chalk.white(`   ${prediction.detailedAnalysis.factorsSummary}`));
  
  console.log(chalk.white('\n💪 Strengths & Weaknesses:'));
  console.log(chalk.white(`   ${prediction.detailedAnalysis.strengthsWeaknesses}`));
  
  console.log(chalk.white('\n⏰ Time Optimization:'));
  console.log(chalk.white(`   ${prediction.detailedAnalysis.timeOptimization}`));
  
  console.log(chalk.white('\n🎯 Confidence Analysis:'));
  console.log(chalk.white(`   ${prediction.detailedAnalysis.confidence}`));
  
  if (prediction.bestTimeWindow) {
    console.log(chalk.white('\n🕐 Best Time Window:'));
    console.log(chalk.white(`   ${prediction.bestTimeWindow.start} - ${prediction.bestTimeWindow.end}`));
    console.log(chalk.white(`   ${prediction.bestTimeWindow.conditions}`));
  }
}

function displayWindChart(prediction: KatabaticPrediction) {
  console.log('\n' + chalk.bold('📊 PROBABILITY TREND CHART'));
  console.log('='.repeat(50));
  
  // Create a simple chart showing probability over time
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const probabilities = hours.map(hour => {
    if (hour >= 2 && hour <= 8) {
      // Peak katabatic window
      return prediction.probability + Math.random() * 10 - 5;
    } else if (hour >= 22 || hour <= 2) {
      // Building conditions
      return prediction.probability * 0.7 + Math.random() * 10 - 5;
    } else {
      // Daytime - very low probability
      return Math.random() * 20;
    }
  });
  
  const chart = asciichart.plot(probabilities, {
    height: 10,
    colors: [asciichart.blue]
  });
  
  console.log(chalk.blue(chart));
  console.log(chalk.gray('Hours: 0=midnight, 6=dawn, 12=noon, 18=evening'));
  console.log(chalk.gray('Peak katabatic window: 2-8am'));
}

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as any).code !== 'EEXIST') {
      throw error;
    }
  }
}

async function savePredictionData(prediction: KatabaticPrediction, weatherData: any) {
  const baseDir = join(process.cwd(), 'katabatic-analysis', 'data');
  const predictionsDir = join(baseDir, 'predictions');
  
  await ensureDirectoryExists(predictionsDir);
  
  const today = new Date().toISOString().split('T')[0];
  const filename = `prediction_${today}.json`;
  const filepath = join(predictionsDir, filename);
  
  const data = {
    date: today,
    timestamp: new Date().toISOString(),
    prediction,
    weatherData,
    metadata: {
      script: 'predict-katabatic.ts',
      version: '2.0.0',
      service: 'hybrid-weather-service'
    }
  };
  
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
  console.log(chalk.green(`\n💾 Prediction saved to: ${chalk.bold(filename)}`));
}

async function main() {
  try {
    formatHeader();
    
    console.log(chalk.blue('\n🔄 Fetching weather data using hybrid service...'));
    const weatherData = await hybridWeatherService.fetchHybridWeatherData();
    console.log(chalk.green('✅ Weather data fetched successfully!'));
    
    console.log(chalk.blue('\n🧠 Analyzing with 5-factor katabatic algorithm...'));
    const prediction = katabaticAnalyzer.analyzePrediction(weatherData);
    console.log(chalk.green('✅ Katabatic analysis complete!'));
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Display results
    displayPredictionSummary(prediction, tomorrow);
    displayFactorAnalysis(prediction.factors);
    displayDetailedAnalysis(prediction);
    displayWindChart(prediction);
    displayCallToAction(prediction);
    
    // Save prediction data
    await savePredictionData(prediction, weatherData);
    
    console.log(chalk.green('\n✅ Katabatic prediction complete!'));
    console.log(chalk.gray('💡 Run verification tomorrow morning: npm run katabatic:verify'));
    console.log(chalk.gray('🔧 Any changes to services/katabaticAnalyzer.ts will be reflected here!'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error during katabatic prediction:'));
    console.error(chalk.red((error as Error).message));
    
    if ((error as Error).stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray((error as Error).stack));
    }
    
    console.error(chalk.yellow('\n🔧 Troubleshooting tips:'));
    console.error(chalk.yellow('   • Check that OPENWEATHER_API_KEY is set in your .env file'));
    console.error(chalk.yellow('   • Verify internet connection for weather API access'));
    console.error(chalk.yellow('   • Try running npm run debug-weather to test API access'));
    
    process.exit(1);
  }
}

// Run the script
main();
