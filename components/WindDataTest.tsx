import { analyzeWindData, fetchWindData } from '@/services/windService';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function WindDataTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    setTestResult('Testing wind data service...\n');
    
    try {
      // Test 1: Fetch wind data
      setTestResult(prev => prev + '1. Fetching wind data...\n');
      const windData = await fetchWindData();
      setTestResult(prev => prev + `   ✅ Success! Got ${windData.length} data points\n`);

      // Test 2: Analyze data
      setTestResult(prev => prev + '2. Analyzing wind data...\n');
      const analysis = analyzeWindData(windData);
      setTestResult(prev => prev + `   ✅ Analysis complete!\n`);
      setTestResult(prev => prev + `   📊 Alarm worthy: ${analysis.isAlarmWorthy ? 'YES' : 'NO'}\n`);
      setTestResult(prev => prev + `   💨 Avg speed: ${analysis.averageSpeed.toFixed(1)} mph\n`);
      setTestResult(prev => prev + `   🧭 Direction consistency: ${analysis.directionConsistency.toFixed(1)}%\n`);
      setTestResult(prev => prev + `   📈 Consecutive good points: ${analysis.consecutiveGoodPoints}\n`);

      // Test 3: Check data structure
      if (windData.length > 0) {
        const samplePoint = windData[0];
        setTestResult(prev => prev + '3. Sample data point:\n');
        setTestResult(prev => prev + `   Time: ${samplePoint.time}\n`);
        setTestResult(prev => prev + `   Speed: ${samplePoint.windSpeed} mph\n`);
        setTestResult(prev => prev + `   Gust: ${samplePoint.windGust} mph\n`);
        setTestResult(prev => prev + `   Direction: ${samplePoint.windDirection}°\n`);
      }

      setTestResult(prev => prev + '\n🎉 All tests passed!\n');
      
    } catch (error) {
      console.error('Test error:', error);
      setTestResult(prev => prev + `\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={runTest}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Wind Data Service'}
        </Text>
      </TouchableOpacity>
      
      {testResult ? (
        <ScrollView style={styles.resultContainer}>
          <Text style={styles.resultText}>{testResult}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
  },
  resultText: {
    color: '#00FF00',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
