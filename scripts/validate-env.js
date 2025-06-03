#!/usr/bin/env node

/**
 * Environment validation script
 * Run this to verify your environment variables are properly configured
 */

const chalk = require('chalk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const requiredEnvVars = [
  'EXPO_PUBLIC_ECOWITT_APPLICATION_KEY',
  'EXPO_PUBLIC_ECOWITT_API_KEY'
];

console.log(chalk.blue.bold('\n🔧 Environment Configuration Check\n'));

let allValid = true;

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask the API key for security (show first 8 and last 4 characters)
    const maskedValue = value.length > 12 
      ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
      : '***masked***';
    console.log(chalk.green(`✓ ${varName}: ${maskedValue}`));
  } else {
    console.log(chalk.red(`✗ ${varName}: Missing`));
    allValid = false;
  }
});

console.log();

if (allValid) {
  console.log(chalk.green.bold('✅ All environment variables are configured correctly!'));
  console.log(chalk.gray('You can now run the app with: npm start'));
} else {
  console.log(chalk.red.bold('❌ Some environment variables are missing!'));
  console.log(chalk.yellow('Please check your .env file and ensure all required variables are set.'));
  console.log(chalk.gray('See docs/ENVIRONMENT_SETUP.md for detailed instructions.'));
  process.exit(1);
}

console.log();
