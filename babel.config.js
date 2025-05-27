module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Resolve module aliases
      ['module-resolver', {
        root: ['.'],
        extensions: [
          '.ios.js', '.android.js', '.js', '.ts', 
          '.tsx', '.json', '.jsx'
        ],
        alias: {
          '@': './',
          '@components': './components',
          '@hooks': './hooks', 
          '@services': './services',
          '@constants': './constants',
          '@assets': './assets',
          // Add more if needed
        },
      }],
      // Support optional chaining
      '@babel/plugin-proposal-optional-chaining',
      // Support nullish coalescing operator
      '@babel/plugin-proposal-nullish-coalescing-operator'
    ],
  };
};
