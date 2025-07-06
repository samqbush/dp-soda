import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Component, ReactNode } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DataCrashDetectorProps {
  children: ReactNode;
  componentName?: string;
  onCrash?: (error: Error, info: any) => void;
}

interface DataCrashDetectorState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
  crashCount: number;
  lastCrashTime?: Date;
  showDiagnostics: boolean;
}

export class DataCrashDetector extends Component<DataCrashDetectorProps, DataCrashDetectorState> {
  private crashKey: string;

  constructor(props: DataCrashDetectorProps) {
    super(props);
    this.crashKey = `crash_${props.componentName || 'unknown'}_count`;
    this.state = {
      hasError: false,
      crashCount: 0,
      showDiagnostics: false,
    };
  }

  async componentDidMount() {
    try {
      const crashData = await AsyncStorage.getItem(this.crashKey);
      if (crashData) {
        const { count, lastTime } = JSON.parse(crashData);
        this.setState({ 
          crashCount: count || 0,
          lastCrashTime: lastTime ? new Date(lastTime) : undefined 
        });
      }
    } catch (error) {
      console.warn('Failed to load crash history:', error);
    }
  }

  static getDerivedStateFromError(error: Error): Partial<DataCrashDetectorState> {
    console.error('🚨 DataCrashDetector caught error:', error);
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 DataCrashDetector full error:', error, errorInfo);
    
    // Log to crash monitor
    // Log crash data to storage for debugging
    console.error('💥 Data crash detected in', this.props.componentName || 'Unknown', error);
    
    const newCrashCount = this.state.crashCount + 1;
    const crashTime = new Date();
    
    // Save crash data
    try {
      await AsyncStorage.setItem(this.crashKey, JSON.stringify({
        count: newCrashCount,
        lastTime: crashTime.toISOString(),
        lastError: {
          message: error.message,
          stack: error.stack,
          component: this.props.componentName,
        }
      }));
    } catch (saveError) {
      console.warn('Failed to save crash data:', saveError instanceof Error ? saveError.message : String(saveError));
    }

    this.setState({
      errorInfo,
      crashCount: newCrashCount,
      lastCrashTime: crashTime,
    });

    // Call optional crash handler
    if (this.props.onCrash) {
      this.props.onCrash(error, errorInfo);
    }

    // Auto-clear error after multiple crashes to prevent infinite loops
    if (newCrashCount >= 3) {
      setTimeout(() => {
        console.log('🔄 Auto-clearing error after multiple crashes');
        this.clearError();
      }, 5000);
    }
  }

  clearError = async () => {
    try {
      // Clear crash count after successful recovery
      await AsyncStorage.removeItem(this.crashKey);
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        crashCount: 0,
        lastCrashTime: undefined,
        showDiagnostics: false,
      });
    } catch (error) {
      console.warn('Failed to clear crash data:', error);
      // Force clear state anyway
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        showDiagnostics: false,
      });
    }
  };

  clearAllData = async () => {
    try {
      await AsyncStorage.multiRemove([
        'windDataCache',
        'alarmCriteria',
        'lastError',
        this.crashKey,
      ]);
      Alert.alert('Success', 'All app data cleared. The app will now restart.');
      this.clearError();
    } catch (error) {
      Alert.alert('Error', 'Failed to clear app data: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  toggleDiagnostics = () => {
    this.setState({ showDiagnostics: !this.state.showDiagnostics });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, crashCount, lastCrashTime, showDiagnostics } = this.state;
      const isFrequentCrash = crashCount >= 2;
      const componentName = this.props.componentName || 'Unknown Component';

      return (
        <View style={styles.container}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              🚨 {componentName} Crashed
            </Text>
            
            {isFrequentCrash && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Frequent crashes detected ({crashCount} times)
                </Text>
                <Text style={styles.warningSubtext}>
                  This suggests a persistent issue that may require data reset.
                </Text>
              </View>
            )}

            <Text style={styles.errorMessage}>
              {error?.message || 'An unknown error occurred'}
            </Text>

            <Text style={styles.timeText}>
              Crash Time: {lastCrashTime?.toLocaleString() || 'Unknown'}
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.retryButton} onPress={this.clearError}>
                <Text style={styles.buttonText}>🔄 Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.diagnosticsButton} onPress={this.toggleDiagnostics}>
                <Text style={styles.buttonText}>
                  🔍 {showDiagnostics ? 'Hide' : 'Show'} Details
                </Text>
              </TouchableOpacity>

              {isFrequentCrash && (
                <TouchableOpacity style={styles.clearButton} onPress={this.clearAllData}>
                  <Text style={styles.buttonText}>🗑️ Clear All Data</Text>
                </TouchableOpacity>
              )}
            </View>

            {showDiagnostics && (
              <View style={styles.diagnosticsContainer}>
                <Text style={styles.diagnosticsTitle}>🔍 Crash Diagnostics</Text>
                
                <Text style={styles.diagnosticsLabel}>Platform:</Text>
                <Text style={styles.diagnosticsValue}>{Platform.OS} {Platform.Version}</Text>
                
                <Text style={styles.diagnosticsLabel}>Component:</Text>
                <Text style={styles.diagnosticsValue}>{componentName}</Text>
                
                <Text style={styles.diagnosticsLabel}>Crash Count:</Text>
                <Text style={styles.diagnosticsValue}>{crashCount}</Text>
                
                <Text style={styles.diagnosticsLabel}>Error Stack:</Text>
                <Text style={styles.stackTrace}>{error?.stack || 'No stack trace'}</Text>
                
                {errorInfo?.componentStack && (
                  <>
                    <Text style={styles.diagnosticsLabel}>Component Stack:</Text>
                    <Text style={styles.stackTrace}>{errorInfo.componentStack}</Text>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
  warningSubtext: {
    fontSize: 14,
    color: '#856404',
    marginTop: 5,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  timeText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  diagnosticsButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  diagnosticsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  diagnosticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  diagnosticsLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 10,
    marginBottom: 5,
  },
  diagnosticsValue: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
  },
  stackTrace: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
