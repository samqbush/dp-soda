/**
 * Simple index file for React Native bootstrapping
 * This is used as a fallback entry point for the bundle
 */
import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';

// Try to import the main app
let App;
try {
  // First try the standard app import
  App = require('./app/_layout').default;
} catch (error) {
  console.error('Error loading main app layout:', error);
  
  // Fallback to a simple component
  App = () => null;
}

// Register the app component
if (registerRootComponent) {
  registerRootComponent(App);
} else {
  AppRegistry.registerComponent('main', () => App);
}
