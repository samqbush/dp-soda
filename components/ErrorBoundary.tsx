import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
  isRecoverable: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, isRecoverable: true };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('ErrorBoundary caught an error:', error);
    // Most errors are potentially recoverable
    const isRecoverable = !error.message.includes('fatal') && 
      !error.message.includes('AsyncStorage') &&
      !error.message.toLowerCase().includes('memory');
      
    return { hasError: true, error, isRecoverable };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary - Full error details:', error, errorInfo);
    
    // Log error details
    const errorDetails = {
      message: error.message,
      stack: error.stack ?? 'No stack trace available',
      componentStack: errorInfo.componentStack ?? 'No component stack available',
      date: new Date().toISOString(),
      platform: Platform.OS,
      version: Platform.Version,
    };
    
    // Store error for debugging
    try {
      AsyncStorage.setItem('lastError', JSON.stringify(errorDetails))
        .then(() => console.log('Error details saved to AsyncStorage'))
        .catch(err => console.log('Failed to save error details:', err));
    } catch (e) {
      console.log('Failed to save error details:', e);
    }
    
    this.setState({
      errorInfo: errorInfo.componentStack ?? 'No component stack available',
    });
  }

  handleRetry = async () => {
    try {
      // Clear cached data if the error might be related to corrupted cache
      if (this.state.error?.message?.includes('JSON') || 
          this.state.error?.message?.includes('parse') ||
          this.state.error?.message?.includes('data')) {
        console.log('Clearing potentially corrupted cached data...');
        await AsyncStorage.removeItem('windData');
      }
      
      // Reset error state
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    } catch (e) {
      console.error('Error handling retry:', e);
      // Last resort - force reload the app by toggling error state
      this.setState({ hasError: false });
    }
  };
  
  handleReset = async () => {
    try {
      // Clear all app data
      console.log('Performing full storage reset...');
      await AsyncStorage.clear();
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    } catch (e) {
      console.error('Error during app reset:', e);
      // Last resort - force reload the app
      this.setState({ hasError: false });
    }
  };

  render() {
    if (this.state.hasError) {
      // Is this a development or production build?
      const isDev = __DEV__;
      
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          
          {/* Only show detailed error info in development */}
          {isDev && (
            <Text style={styles.detailsText}>
              {(this.state.errorInfo || this.state.error?.stack || '').slice(0, 300)}
              {(this.state.errorInfo || this.state.error?.stack || '').length > 300 ? '...' : ''}
            </Text>
          )}
          
          {/* Show different options based on if error is recoverable */}
          <View style={styles.buttonContainer}>
            {this.state.isRecoverable && (
              <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: '#FF9800', marginLeft: this.state.isRecoverable ? 10 : 0 }]} 
              onPress={this.handleReset}
            >
              <Text style={styles.retryButtonText}>Reset App Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#666',
  },
  detailsText: {
    fontSize: 12,
    marginBottom: 24,
    textAlign: 'center',
    color: '#888',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
