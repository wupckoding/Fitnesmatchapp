import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cr.fitnessmatch.app',
  appName: 'FitnessMatch',
  webDir: 'dist',
  
  // Configurações do servidor (para desenvolvimento)
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  
  // Plugins nativos
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000'
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },

  // iOS específico
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'FitnessMatch'
  },

  // Android específico
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false // Desabilitar em produção
  }
};

export default config;
