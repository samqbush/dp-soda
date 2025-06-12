#!/usr/bin/env tsx
/**
 * Katabatic wind verification script using ACTUAL app TypeScript logic
 * This uses Node.js-compatible versions of the real services
 */

import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Import the Node.js-compatible services
import { hybridWeatherService } from '../services/hybridWeatherService-node.js';

async function main() {
  try {
    console.log(chalk.blue('🔍 Katabatic Wind Verification'));
    console.log(chalk.blue('Using Real App TypeScript Services'));
    console.log('='.repeat(50));
    
    // Fetch current conditions
    const weatherData = await hybridWeatherService.fetchHybridWeatherData();
    console.log(chalk.green('✅ Current conditions fetched'));
    
    // Find yesterday's prediction
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const predictionFile = join(process.cwd(), 'katabatic-analysis', 'data', 'predictions', 
      `prediction_${yesterday.toISOString().split('T')[0]}.json`);
    
    try {
      const predictionData = JSON.parse(await fs.readFile(predictionFile, 'utf-8'));
      console.log(chalk.blue('📊 Verifying prediction accuracy...'));
      
      // Simple verification logic
      const actualWindStrength = weatherData.locations[0]?.data[0]?.windSpeed || 0;
      const predictedProbability = predictionData.prediction.probability;
      
      let accuracy = 'Unknown';
      if (predictedProbability >= 70 && actualWindStrength >= 8) {
        accuracy = 'Correct - Strong winds predicted and observed';
      } else if (predictedProbability < 30 && actualWindStrength < 5) {
        accuracy = 'Correct - Weak winds predicted and observed';
      } else {
        accuracy = 'Mixed results - needs further analysis';
      }
      
      console.log(chalk.green(`✅ Verification complete: ${accuracy}`));
      
    } catch (error) {
      console.log(chalk.yellow('⚠️ No prediction file found for yesterday'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Verification failed:'), error.message);
    process.exit(1);
  }
}

main();