import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { BookingProvider } from './src/context/BookingContext';
import { SavedServicesProvider } from './src/context/SavedServicesContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const content = (
    <SafeAreaProvider>
      <AuthProvider>
        <BookingProvider>
          <SavedServicesProvider>
            <NotificationProvider>
              <StatusBar style="dark" />
              <AppNavigator />
            </NotificationProvider>
          </SavedServicesProvider>
        </BookingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <GestureHandlerRootView style={styles.webContainer}>
        <View style={styles.mobileShell}>
          {content}
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.nativeContainer}>
      {content}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: '#F7F4EC',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#1E2D27', // Elegant ambient backdrop on desktop
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%' as any,
  },
  mobileShell: {
    width: '100%',
    maxWidth: 430,
    height: '100%',
    maxHeight: 932,
    backgroundColor: '#F7F4EC',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 20,
    borderRadius: Platform.OS === 'web' ? 36 : 0,
    borderWidth: Platform.OS === 'web' ? 8 : 0,
    borderColor: '#10221B',
  },
});
