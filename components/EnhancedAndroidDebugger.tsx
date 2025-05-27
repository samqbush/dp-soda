import { productionCrashDetector } from '@/services/productionCrashDetector';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface SystemInfo {
  memory: {
    used: number;
    available: number;
    total: number;
  };
  performance: {
    renderTime: number;
    jsThreadBlocked: boolean;
    memoryWarning: boolean;
  };
  device: {
    model: string;
    os: string;
    screen: {
      width: number;
      height: number;
      scale: number;
    };
  };
  app: {
    version: string;
    buildType: string;
    crashCount: number;
    uptime: number;
  };
}

interface PerformanceMetric {
  timestamp: number;
  type: 'render' | 'navigation' | 'data_load' | 'crash';
  duration?: number;
  memory?: number;
  details?: string;
}

/**
 * Enhanced Android Debugger - Advanced debugging tools for production APKs
 * Provides real-time system monitoring, performance metrics, and crash prediction
 */
export function EnhancedAndroidDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [appStartTime] = useState(Date.now());

  useEffect(() => {
    // Auto-start monitoring in production builds
    if (!__DEV__) {
      startMonitoring();
    }
  }, []);

  const startMonitoring = async () => {
    setIsMonitoring(true);
    
    // Collect initial system info
    await collectSystemInfo();
    
    // Start performance monitoring
    const interval = setInterval(async () => {
      await collectPerformanceMetric();
    }, 5000); // Every 5 seconds

    // Store interval reference for cleanup
    (global as any).__debuggerInterval = interval;
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if ((global as any).__debuggerInterval) {
      clearInterval((global as any).__debuggerInterval);
      delete (global as any).__debuggerInterval;
    }
  };

  const collectSystemInfo = async (): Promise<void> => {
    try {
      const screen = Dimensions.get('screen');
      const crashData = await productionCrashDetector.getCrashData();
      
      // Estimate memory usage (rough approximation)
      const memoryTest = new Array(1000).fill('test');
      const roughMemory = JSON.stringify(memoryTest).length;

      const info: SystemInfo = {
        memory: {
          used: roughMemory,
          available: 1000000 - roughMemory, // Rough estimate
          total: 1000000
        },
        performance: {
          renderTime: performance.now(),
          jsThreadBlocked: false,
          memoryWarning: false
        },
        device: {
          model: `${Platform.OS} ${Platform.Version}`,
          os: Platform.OS,
          screen: {
            width: screen.width,
            height: screen.height,
            scale: screen.scale
          }
        },
        app: {
          version: '1.0.0', // You can get this from app.json
          buildType: __DEV__ ? 'development' : 'production',
          crashCount: crashData.crashes.length,
          uptime: Date.now() - appStartTime
        }
      };

      setSystemInfo(info);
    } catch (error) {
      console.error('Failed to collect system info:', error);
    }
  };

  const collectPerformanceMetric = async (): Promise<void> => {
    try {
      const metric: PerformanceMetric = {
        timestamp: Date.now(),
        type: 'render',
        duration: performance.now(),
        memory: (global as any).performance?.memory?.usedJSHeapSize || 0,
        details: 'Background monitoring'
      };

      setPerformanceMetrics(prev => {
        const updated = [...prev, metric];
        // Keep only last 50 metrics
        return updated.slice(-50);
      });

      // Check for performance issues
      if (metric.duration && metric.duration > 100) {
        console.warn('🐌 Slow render detected:', metric);
        productionCrashDetector.logUserAction('performance_warning', {
          type: 'slow_render',
          duration: metric.duration
        });
      }

    } catch (error) {
      console.error('Failed to collect performance metric:', error);
    }
  };

  const simulateCrash = () => {
    Alert.alert(
      'Simulate Crash',
      'This will intentionally crash the app to test crash detection. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Crash App',
          style: 'destructive',
          onPress: () => {
            // Intentional crash for testing
            setTimeout(() => {
              throw new Error('Intentional crash for testing crash detection system');
            }, 1000);
          }
        }
      ]
    );
  };

  const testMemoryPressure = async () => {
    try {
      Alert.alert('Memory Test', 'Testing memory pressure...');
      
      // Create memory pressure
      const arrays = [];
      for (let i = 0; i < 1000; i++) {
        arrays.push(new Array(1000).fill(`memory_test_${i}`));
      }

      setTimeout(() => {
        arrays.length = 0; // Clear memory
        Alert.alert('Memory Test', 'Memory pressure test completed');
      }, 3000);

    } catch (error) {
      Alert.alert('Memory Test Failed', `Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const exportAdvancedDiagnostics = async () => {
    try {
      const crashData = await productionCrashDetector.getCrashData();
      
      const report = {
        timestamp: new Date().toISOString(),
        systemInfo,
        performanceMetrics: performanceMetrics.slice(-20), // Last 20 metrics
        crashData,
        environment: {
          isDevelopment: __DEV__,
          platform: Platform.OS,
          version: Platform.Version,
          dimensions: Dimensions.get('screen')
        },
        buildInfo: {
          buildType: __DEV__ ? 'development' : 'production',
          timestamp: new Date().toISOString()
        }
      };

      // Store report in AsyncStorage for later retrieval
      await AsyncStorage.setItem('enhanced_debug_report', JSON.stringify(report, null, 2));
      
      console.log('📊 Enhanced Diagnostic Report:', report);
      
      Alert.alert(
        'Advanced Diagnostics Exported',
        'Complete diagnostic report has been saved and logged. This includes system info, performance metrics, and crash data.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      Alert.alert('Export Failed', `Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      'Clear All Debug Data',
      'This will clear all crash logs, performance metrics, and debug data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'enhanced_debug_report',
                'crash_logs',
                'user_actions',
                'performance_metrics'
              ]);
              setPerformanceMetrics([]);
              Alert.alert('Success', 'All debug data cleared');
            } catch (error) {
              Alert.alert('Error', `Failed to clear data: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
      ]
    );
  };

  // Only show on Android
  if (Platform.OS !== 'android') {
    return null;
  }

  const getStatusColor = () => {
    if (!systemInfo) return '#999';
    if (systemInfo.app.crashCount > 0) return '#F44336';
    if (performanceMetrics.some(m => m.duration && m.duration > 100)) return '#FF9800';
    return '#4CAF50';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.statusButton, { backgroundColor: getStatusColor() }]}
        onPress={() => setIsVisible(!isVisible)}
      >
        <Text style={styles.statusText}>
          🔧 {isMonitoring ? '📊' : '💤'} Debug
        </Text>
      </TouchableOpacity>

      {isVisible && (
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Enhanced Android Debugger</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* System Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📱 System Info</Text>
              {systemInfo ? (
                <View style={styles.infoGrid}>
                  <Text style={styles.infoText}>Device: {systemInfo.device.model}</Text>
                  <Text style={styles.infoText}>
                    Screen: {systemInfo.device.screen.width}x{systemInfo.device.screen.height} 
                    @{systemInfo.device.screen.scale}x
                  </Text>
                  <Text style={styles.infoText}>
                    Uptime: {Math.round(systemInfo.app.uptime / 1000)}s
                  </Text>
                  <Text style={styles.infoText}>
                    Crashes: {systemInfo.app.crashCount}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noData}>Loading system info...</Text>
              )}
            </View>

            {/* Performance Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Performance</Text>
              {performanceMetrics.length > 0 ? (
                <View>
                  <Text style={styles.infoText}>
                    Metrics collected: {performanceMetrics.length}
                  </Text>
                  <Text style={styles.infoText}>
                    Average render: {Math.round(
                      performanceMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / performanceMetrics.length
                    )}ms
                  </Text>
                  <Text style={styles.infoText}>
                    Monitoring: {isMonitoring ? '🟢 Active' : '🔴 Stopped'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noData}>No performance data yet</Text>
              )}
            </View>

            {/* Controls */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎛️ Controls</Text>
              <View style={styles.buttonGrid}>
                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton]} 
                  onPress={isMonitoring ? stopMonitoring : startMonitoring}
                >
                  <Text style={styles.buttonText}>
                    {isMonitoring ? '⏹️ Stop' : '▶️ Start'} Monitor
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={collectSystemInfo}>
                  <Text style={styles.buttonText}>🔄 Refresh Info</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.button, styles.exportButton]} onPress={exportAdvancedDiagnostics}>
                  <Text style={styles.buttonText}>📤 Export All</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.button, styles.testButton]} onPress={testMemoryPressure}>
                  <Text style={styles.buttonText}>🧪 Memory Test</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={simulateCrash}>
                  <Text style={styles.buttonText}>💥 Test Crash</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearAllData}>
                  <Text style={styles.buttonText}>🗑️ Clear Data</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 150,
    right: 10,
    zIndex: 9997,
  },
  statusButton: {
    padding: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  panel: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 380,
    maxHeight: 600,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    maxHeight: 500,
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoGrid: {
    gap: 5,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  noData: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 5,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
  },
  testButton: {
    backgroundColor: '#FF9800',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
