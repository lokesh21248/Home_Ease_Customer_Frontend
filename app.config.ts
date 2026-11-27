import type { ConfigContext } from 'expo/config';

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
  'AIzaSyC4STWdqEz-DpPtrlqGOfoehAH3NF5tDTI';

export default ({ config }: ConfigContext) => {
  const plugins = (config.plugins ?? []).filter((plugin) =>
    typeof plugin === 'string' ? plugin !== 'react-native-maps' : plugin[0] !== 'react-native-maps'
  );

  const mapsPlugin: [string, { androidGoogleMapsApiKey: string; iosGoogleMapsApiKey: string }] = [
    'react-native-maps',
    {
      androidGoogleMapsApiKey: googleMapsApiKey,
      iosGoogleMapsApiKey: googleMapsApiKey,
    },
  ];

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey: googleMapsApiKey,
      },
    },
    plugins: [...plugins, 'expo-status-bar', mapsPlugin],
  };
};
