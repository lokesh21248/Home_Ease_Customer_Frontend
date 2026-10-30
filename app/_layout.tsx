/**
 * Root layout — loads fonts, sets up providers, and renders the navigator.
 * Uses expo-router file-based routing.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import { LocationProvider } from '../src/context/LocationContext';
import { WalletProvider } from '../src/context/WalletContext';
import { QueryProvider } from '../src/query/QueryProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryProvider>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <AuthProvider>
            <LocationProvider>
              <WalletProvider>
                <CartProvider>
                  <StatusBar style="dark" />
                  <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="location/select" options={{ animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="tracking/[bookingId]" />
                    <Stack.Screen name="service/[id]" />
                    <Stack.Screen name="booking/date-time" />
                    <Stack.Screen name="booking/summary" />
                    <Stack.Screen name="booking/success" />
                    <Stack.Screen name="booking/track/[id]" />
                    <Stack.Screen name="profile/wallet" />
                    <Stack.Screen name="profile/edit" />
                    <Stack.Screen name="profile/addresses" />
                    <Stack.Screen name="profile/payments" />
                    <Stack.Screen name="profile/help" />
                    <Stack.Screen name="profile/settings" />
                    <Stack.Screen name="profile/reminders" />
                  </Stack>
                </CartProvider>
              </WalletProvider>
            </LocationProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
