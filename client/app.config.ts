import { ExpoConfig, ConfigContext } from 'expo/config';

const devServerHost = process.env.DEV_SERVER_HOST || 'localhost';
const devServerPort = process.env.DEV_SERVER_PORT || '3001';
const backendDebugUiEnabled = process.env.BACKEND_DEBUG_UI !== '0';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'GrammarCrammer',
  slug: 'grammarcrammer',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'grammarcrammer',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.finite.grammarcrammer',
    deploymentTarget: '26.0',
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
        NSExceptionDomains: {
          'tora.nord': {
            NSExceptionAllowsInsecureHTTPLoads: true,
          },
        },
      },
      NSLocalNetworkUsageDescription:
        'GrammarCrammer connects to your development backend on your private Meshnet.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.finite.grammarcrammer',
  },
  web: {
    output: 'static' as const,
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-localization',
    '@react-native-community/datetimepicker',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    devServerHost,
    devServerPort,
    backendDebugUiEnabled,
  },
});
