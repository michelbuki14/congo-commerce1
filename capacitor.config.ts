import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.congocommerce.app',
  appName: 'Congo Commerce',
  webDir: 'dist',
  backgroundColor: '#07110D',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#07110D',
      showSpinner: false,
    },
  },
};

export default config;
