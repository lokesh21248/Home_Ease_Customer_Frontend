import { LogBox } from 'react-native';
import './src/polyfills/expoGlobal';

// Suppress known third-party library deprecation notices that do not affect runtime
LogBox.ignoreLogs([
  'ImageBackground is deprecated and will be removed in a future release',
  'ImageBackground is deprecated',
]);

import 'expo-router/entry';
