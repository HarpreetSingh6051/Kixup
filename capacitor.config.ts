import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.packpulse.rideandrom',
  appName: 'Ride & Roam',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#07070C',
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#07070C',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: '#07070C',
      showSpinner: false,
    },
    // Background geolocation plugin config (npx cap add android/ios, then install the plugin)
    BackgroundGeolocation: {
      distanceFilter: 15,
    },
  },
}

export default config
