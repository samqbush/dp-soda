module.exports = {
  // Enable Hermes for better performance
  project: {
    android: {
      hermesEnabled: true
    },
    ios: {
      hermesEnabled: true
    }
  },
  // Configure the build process
  commands: {
    postinstall: {
      // Commands to run after npm install
    }
  },
  // Asset management settings
  assets: [],
  // Dependencies to exclude from auto-linking
  dependencies: {
    // Put problematic dependencies here if needed
    // For example: 'react-native-example': { platforms: { android: null } }
  }
};
