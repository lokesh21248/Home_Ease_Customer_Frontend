// Intercept console.warn at top level to silence third-party deprecations (e.g. react-native-css-interop ImageBackground inspection)
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.includes('ImageBackground is deprecated')) {
    return;
  }
  originalWarn(...args);
};

import { LogBox } from 'react-native';
import './src/polyfills/expoGlobal';

// Suppress known third-party library deprecation notices that do not affect runtime
LogBox.ignoreLogs([
  'ImageBackground is deprecated and will be removed in a future release',
  'ImageBackground is deprecated',
]);

import 'expo-router/entry';
