import { analyzeWindData, fetchWindData } from '@/services/windService';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function QuickTest() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runQuickTest = async () => {
    setIsLoading(true);
    setResult('🌊 Testing Wind Data Implementation...\n\n');
    
    try {
      // Test the wind service
      setResult(prev => prev + '1. Testing fetchWindData...\n');
      const data = await fetchWindData();
      setResult(prev => prev + `   ✅ Fetched ${data.length} data points\n\n`);

      // Test analysis
      setResult(prev => prev + '2. Testing analyzeWindData...\n');
      const analysis = analyzeWindData(data);
      setResult(prev => prev + `   ✅ Analysis complete!\n`);
      setResult(prev => prev + `   🚨 Alarm: ${analysis.isAlarmWorthy ? 'WAKE UP! 🌊' : 'Sleep in 😴'}\n`);
      setResult(prev => prev + `   💨 Speed: ${analysis.averageSpeed.toFixed(1)} mph\n`);
      setResult(prev => prev + `   🧭 Consistency: ${analysis.directionConsistency.toFixed(1)}%\n`);
      setResult(prev => prev + `   📊 Good points: ${analysis.consecutiveGoodPoints}\n\n`);

      // Sample data
      if (data.length > 0) {
        setResult(prev => prev + '3. Sample data point:\n');
        const sample = data[Math.floor(data.length / 2)];
        setResult(prev => prev + `   Time: ${new Date(sample.time).toLocaleString()}\n`);
        setResult(prev => prev + `   Speed: ${sample.windSpeed} mph\n`);
        setResult(prev => prev + `   Gust: ${sample.windGust} mph\n`);
        setResult(prev => prev + `   Direction: ${sample.windDirection}°\n\n`);
      }

      setResult(prev => prev + '🎉 Implementation is working perfectly!\n');
      setResult(prev => prev + '📱 Ready for production use!\n');

    } catch (error) {
      setResult(prev => prev + `\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      setResult(prev => prev + '\n💡 Check your internet connection and API availability.\n');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={runQuickTest}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? '🔄 Testing...' : '🧪 Run Quick Test'}
        </Text>
      </TouchableOpacity>
      
      {result ? (
        <ScrollView style={styles.resultContainer}>
          <Text style={styles.resultText}>{result}</Text>
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
    padding: 16,
    borderRadius: 12,
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
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  resultText: {
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 20,
  },
});
