import 'dotenv/config';

export default {
  expo: {
    name: "Dawn Patrol Alarm",
    slug: "dp-soda",
    version: "1.0.2",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "dpsoda",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.samqbush.dpsoda",
      buildNumber: "2",
      infoPlist: {
        NSMicrophoneUsageDescription: "This app does not use the microphone directly, but some of our libraries require this permission to function properly."
      }
    },
    android: {
      package: "com.samqbush.dpsoda",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#1E3D58"
      },
      permissions: [
        "INTERNET",
        "WRITE_EXTERNAL_STORAGE",
        "READ_EXTERNAL_STORAGE",
        "VIBRATE",
        "AUDIO_SETTINGS"
      ],
      blockedPermissions: [
        "android.permission.RECORD_AUDIO"
      ],
      softwareKeyboardLayoutMode: "pan",
      allowBackup: true,
      versionCode: 6,
      theme: "@style/Theme.App.SplashScreen",
      jsEngine: "jsc",
      enableHermes: false,
      enableProguard: false,
      enableShrinkResources: false
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#1E3D58",
          dark: {
            image: "./assets/images/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#0A1F33"
          }
        }
      ]
    ],
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#1E3D58",
      dark: {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#0A1F33"
      }
    },
    androidStatusBar: {
      backgroundColor: "#1E3D58",
      translucent: true,
      barStyle: "light-content",
      hidden: false
    },
    experiments: {
      typedRoutes: false,
      turboModules: false
    },
    extra: {
      router: {},
      eas: {
        projectId: "c70a6758-5324-40f2-ae28-646f452607f2"
      },
      // Environment variables for secure API access
      OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
      ECOWITT_APPLICATION_KEY: process.env.ECOWITT_APPLICATION_KEY,
      ECOWITT_API_KEY: process.env.ECOWITT_API_KEY
    },
    owner: "samqbush"
  }
};
