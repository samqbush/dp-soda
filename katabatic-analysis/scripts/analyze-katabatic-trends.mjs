#!/usr/bin/env node

/**
 * Katabatic Trends Analysis Script
 * Generates HTML dashboard with charts and analysis
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Directory paths
const analysisDir = path.join(rootDir, 'katabatic-analysis');
const dataDir = path.join(analysisDir, 'data');
const predictionsDir = path.join(dataDir, 'predictions');
const verificationsDir = path.join(dataDir, 'verifications');
const reportsDir = path.join(dataDir, 'reports');
const assetsDir = path.join(analysisDir, 'assets');

async function ensureDirectories() {
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.mkdir(assetsDir, { recursive: true });
}

async function loadAllVerifications() {
  try {
    const files = await fs.readdir(verificationsDir);
    const verifications = [];
    
    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filepath = path.join(verificationsDir, file);
        const data = await fs.readFile(filepath, 'utf8');
        verifications.push(JSON.parse(data));
      }
    }
    
    // Sort by date (newest first)
    return verifications.sort((a, b) => 
      new Date(b.verificationDate) - new Date(a.verificationDate)
    );
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Could not load verifications: ${error.message}`));
    return [];
  }
}

function calculateOverallStats(verifications) {
  if (verifications.length === 0) {
    return {
      totalPredictions: 0,
      overallAccuracy: 0,
      goSuccessRate: 0,
      skipSuccessRate: 0,
      maybeSuccessRate: 0,
      highConfidenceAccuracy: 0,
      mediumConfidenceAccuracy: 0,
      lowConfidenceAccuracy: 0
    };
  }
  
  let totalAccuracy = 0;
  let goCount = 0, goSuccess = 0;
  let skipCount = 0, skipSuccess = 0;
  let maybeCount = 0, maybeSuccess = 0;
  let highConfCount = 0, highConfSuccess = 0;
  let medConfCount = 0, medConfSuccess = 0;
  let lowConfCount = 0, lowConfSuccess = 0;
  
  for (const v of verifications) {
    totalAccuracy += v.accuracy.percentage;
    
    // Recommendation success rates
    if (v.prediction.recommendation === 'go') {
      goCount++;
      if (v.actual.hadGoodWind) goSuccess++;
    } else if (v.prediction.recommendation === 'skip') {
      skipCount++;
      if (!v.actual.hadGoodWind) skipSuccess++;
    } else if (v.prediction.recommendation === 'maybe') {
      maybeCount++;
      if (v.accuracy.percentage >= 60) maybeSuccess++; // Arbitrary threshold for "maybe" success
    }
    
    // Confidence accuracy
    if (v.prediction.confidence === 'high') {
      highConfCount++;
      if (v.accuracy.percentage >= 80) highConfSuccess++;
    } else if (v.prediction.confidence === 'medium') {
      medConfCount++;
      if (v.accuracy.percentage >= 60) medConfSuccess++;
    } else if (v.prediction.confidence === 'low') {
      lowConfCount++;
      if (v.accuracy.percentage >= 40) lowConfSuccess++;
    }
  }
  
  return {
    totalPredictions: verifications.length,
    overallAccuracy: Math.round(totalAccuracy / verifications.length),
    goSuccessRate: goCount > 0 ? Math.round((goSuccess / goCount) * 100) : 0,
    skipSuccessRate: skipCount > 0 ? Math.round((skipSuccess / skipCount) * 100) : 0,
    maybeSuccessRate: maybeCount > 0 ? Math.round((maybeSuccess / maybeCount) * 100) : 0,
    highConfidenceAccuracy: highConfCount > 0 ? Math.round((highConfSuccess / highConfCount) * 100) : 0,
    mediumConfidenceAccuracy: medConfCount > 0 ? Math.round((medConfSuccess / medConfCount) * 100) : 0,
    lowConfidenceAccuracy: lowConfCount > 0 ? Math.round((lowConfSuccess / lowConfCount) * 100) : 0
  };
}

function getFactorPerformance(verifications) {
  const factors = {
    precipitation: { correct: 0, total: 0 },
    skyConditions: { correct: 0, total: 0 },
    pressureChange: { correct: 0, total: 0 },
    temperatureDifferential: { correct: 0, total: 0 },
    wavePattern: { correct: 0, total: 0 }
  };
  
  for (const v of verifications) {
    for (const [factorName, factorData] of Object.entries(v.prediction.factors)) {
      if (factors[factorName]) {
        factors[factorName].total++;
        
        // Simple heuristic: if the factor "met" criteria and we had good wind, or 
        // if the factor didn't meet criteria and we had poor wind, count as correct
        const factorPredictedGood = factorData.meets;
        const actuallyGood = v.actual.hadGoodWind;
        
        if ((factorPredictedGood && actuallyGood) || (!factorPredictedGood && !actuallyGood)) {
          factors[factorName].correct++;
        }
      }
    }
  }
  
  return Object.entries(factors).map(([name, stats]) => ({
    name,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    total: stats.total
  }));
}

function generateDashboardHTML(verifications, stats, factorPerformance) {
  const recentVerifications = verifications.slice(0, 10); // Last 10 days
  
  // Prepare data for charts
  const accuracyData = verifications.map(v => ({
    date: new Date(v.verificationDate).toLocaleDateString(),
    accuracy: v.accuracy.percentage
  })).reverse(); // Chronological order for chart
  
  const recommendationData = [
    { label: 'GO', value: stats.goSuccessRate, color: '#10B981' },
    { label: 'MAYBE', value: stats.maybeSuccessRate, color: '#F59E0B' },
    { label: 'SKIP', value: stats.skipSuccessRate, color: '#EF4444' }
  ];
  
  const confidenceData = [
    { label: 'High', value: stats.highConfidenceAccuracy, color: '#10B981' },
    { label: 'Medium', value: stats.mediumConfidenceAccuracy, color: '#F59E0B' },
    { label: 'Low', value: stats.lowConfidenceAccuracy, color: '#EF4444' }
  ];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Katabatic Prediction Analysis Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8fafc;
        }
        
        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        
        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 8px;
        }
        
        .stat-label {
            font-size: 0.9rem;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        
        .charts-section {
            padding: 30px;
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .chart-container {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        
        .chart-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .accuracy-chart {
            grid-column: 1 / -1;
        }
        
        .recent-predictions {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        
        .recent-predictions h3 {
            font-size: 1.3rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 20px;
        }
        
        .prediction-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .prediction-item:last-child {
            border-bottom: none;
        }
        
        .prediction-date {
            font-weight: 600;
            color: #1e293b;
        }
        
        .prediction-result {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .prediction-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge-go { background: #dcfce7; color: #166534; }
        .badge-maybe { background: #fef3c7; color: #92400e; }
        .badge-skip { background: #fee2e2; color: #dc2626; }
        
        .accuracy-score {
            font-weight: 600;
            color: #2563eb;
        }
        
        .footer {
            background: #f8fafc;
            padding: 20px 30px;
            text-align: center;
            color: #64748b;
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .charts-grid {
                grid-template-columns: 1fr;
            }
            
            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌄 Katabatic Prediction Analysis</h1>
            <p>Performance dashboard for wind prediction accuracy</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.totalPredictions}</div>
                <div class="stat-label">Total Predictions</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.overallAccuracy}%</div>
                <div class="stat-label">Overall Accuracy</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.goSuccessRate}%</div>
                <div class="stat-label">GO Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.skipSuccessRate}%</div>
                <div class="stat-label">SKIP Success Rate</div>
            </div>
        </div>
        
        <div class="charts-section">
            <div class="charts-grid">
                <div class="chart-container accuracy-chart">
                    <h3 class="chart-title">Prediction Accuracy Over Time</h3>
                    <canvas id="accuracyChart"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3 class="chart-title">Recommendation Success Rate</h3>
                    <canvas id="recommendationChart"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3 class="chart-title">Confidence Level Accuracy</h3>
                    <canvas id="confidenceChart"></canvas>
                </div>
            </div>
            
            <div class="recent-predictions">
                <h3>Recent Predictions</h3>
                ${recentVerifications.map(v => {
                  const date = new Date(v.verificationDate).toLocaleDateString();
                  const rec = v.prediction.recommendation;
                  const accuracy = v.accuracy.percentage;
                  return `
                    <div class="prediction-item">
                        <div class="prediction-date">${date}</div>
                        <div class="prediction-result">
                            <span class="prediction-badge badge-${rec}">${rec}</span>
                            <span class="accuracy-score">${accuracy}%</span>
                        </div>
                    </div>
                  `;
                }).join('')}
            </div>
        </div>
        
        <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString()} • Katabatic Analysis System</p>
        </div>
    </div>
    
    <script>
        // Accuracy over time chart
        const accuracyCtx = document.getElementById('accuracyChart').getContext('2d');
        new Chart(accuracyCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(accuracyData.map(d => d.date))},
                datasets: [{
                    label: 'Accuracy %',
                    data: ${JSON.stringify(accuracyData.map(d => d.accuracy))},
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        
        // Recommendation success rate chart
        const recCtx = document.getElementById('recommendationChart').getContext('2d');
        new Chart(recCtx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(recommendationData.map(d => d.label))},
                datasets: [{
                    data: ${JSON.stringify(recommendationData.map(d => d.value))},
                    backgroundColor: ${JSON.stringify(recommendationData.map(d => d.color))},
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Confidence accuracy chart
        const confCtx = document.getElementById('confidenceChart').getContext('2d');
        new Chart(confCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(confidenceData.map(d => d.label))},
                datasets: [{
                    label: 'Accuracy %',
                    data: ${JSON.stringify(confidenceData.map(d => d.value))},
                    backgroundColor: ${JSON.stringify(confidenceData.map(d => d.color))},
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
}

function displayConsoleStats(stats, factorPerformance) {
  console.log(chalk.cyan.bold('\n📊 KATABATIC ANALYSIS SUMMARY'));
  console.log(chalk.cyan('═'.repeat(50)));
  
  const statsTable = new Table({
    head: [chalk.white.bold('Metric'), chalk.white.bold('Value')],
    style: { head: [], border: ['grey'] }
  });
  
  statsTable.push(
    ['Total Predictions', chalk.blue.bold(stats.totalPredictions)],
    ['Overall Accuracy', chalk.green.bold(`${stats.overallAccuracy}%`)],
    ['GO Success Rate', chalk.green(`${stats.goSuccessRate}%`)],
    ['MAYBE Success Rate', chalk.yellow(`${stats.maybeSuccessRate}%`)],
    ['SKIP Success Rate', chalk.red(`${stats.skipSuccessRate}%`)],
    ['High Confidence Accuracy', chalk.green(`${stats.highConfidenceAccuracy}%`)],
    ['Medium Confidence Accuracy', chalk.yellow(`${stats.mediumConfidenceAccuracy}%`)],
    ['Low Confidence Accuracy', chalk.red(`${stats.lowConfidenceAccuracy}%`)]
  );
  
  console.log(statsTable.toString());
  
  // Factor performance
  console.log(chalk.white('\n🔍 Factor Performance:'));
  const factorTable = new Table({
    head: [chalk.white.bold('Factor'), chalk.white.bold('Accuracy'), chalk.white.bold('Sample Size')],
    style: { head: [], border: ['grey'] }
  });
  
  factorPerformance.forEach(factor => {
    const accuracyColor = factor.accuracy >= 70 ? chalk.green : 
                         factor.accuracy >= 50 ? chalk.yellow : chalk.red;
    factorTable.push([
      factor.name.replace(/([A-Z])/g, ' $1').trim(),
      accuracyColor(`${factor.accuracy}%`),
      chalk.gray(factor.total)
    ]);
  });
  
  console.log(factorTable.toString());
}

async function main() {
  try {
    const period = process.argv[2] || 'all';
    
    console.log(chalk.blue.bold('📊 Analyzing katabatic prediction trends...'));
    
    // Ensure directories exist
    await ensureDirectories();
    
    // Load all verification data
    console.log(chalk.gray('Loading verification data...'));
    const verifications = await loadAllVerifications();
    
    if (verifications.length === 0) {
      console.log(chalk.yellow('⚠️  No verification data found. Make sure you have run both prediction and verification scripts.'));
      console.log(chalk.gray('Available commands:'));
      console.log(chalk.gray('  1. node scripts/predict-katabatic.mjs   (run in evening)'));
      console.log(chalk.gray('  2. node scripts/verify-katabatic.mjs    (run next morning)'));
      return;
    }
    
    console.log(chalk.green(`✅ Found ${verifications.length} verification record(s)`));
    
    // Calculate statistics
    console.log(chalk.gray('Calculating statistics...'));
    const stats = calculateOverallStats(verifications);
    const factorPerformance = getFactorPerformance(verifications);
    
    // Display console summary
    displayConsoleStats(stats, factorPerformance);
    
    // Generate HTML dashboard
    console.log(chalk.gray('Generating HTML dashboard...'));
    const html = generateDashboardHTML(verifications, stats, factorPerformance);
    const dashboardPath = path.join(analysisDir, 'dashboard.html');
    await fs.writeFile(dashboardPath, html);
    
    console.log(chalk.green.bold('\n✅ Dashboard generated successfully!'));
    console.log(chalk.gray(`Dashboard saved to: ${dashboardPath}`));
    
    // Try to open the dashboard in browser
    try {
      console.log(chalk.blue('🌐 Opening dashboard in browser...'));
      await execAsync(`open "${dashboardPath}"`);
      console.log(chalk.blue('✅ Dashboard opened in browser'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not auto-open browser. Please open the dashboard manually:'));
      console.log(chalk.gray(`file://${dashboardPath}`));
    }
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Error analyzing trends:'));
    console.error(chalk.red(error.message));
    if (error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// Run the script
main();
