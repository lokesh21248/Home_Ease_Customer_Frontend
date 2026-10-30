/**
 * Welcome Screen — Pronto-style welcome landing screen matching Screen 2.
 * Route: /(auth)/welcome
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

import { useAuth } from '../../src/context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { bypassLogin } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDirectLogin = async () => {
    await bypassLogin();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Handyman Image & Curved Background */}
      <View style={styles.imageSection}>
        <View style={styles.bgBlob} />
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&auto=format&fit=crop&q=80',
          }}
          style={styles.heroImage}
          contentFit="cover"
        />
      </View>

      {/* Content Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        <Text style={styles.headline}>
          Professional{'\n'}Home Services{'\n'}at Your Doorstep
        </Text>

        <TouchableOpacity
          style={styles.getStartedBtn}
          onPress={handleDirectLogin}
          activeOpacity={0.85}
        >
          <Text style={styles.getStartedText}>Get Started (Direct Login)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleDirectLogin}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageSection: {
    height: height * 0.58,
    position: 'relative',
    backgroundColor: '#F0F6FF',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bgBlob: {
    position: 'absolute',
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: (width * 1.4) / 2,
    backgroundColor: '#E0EFFF',
    top: -width * 0.4,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingHorizontal: Spacing.xl,
    paddingTop: 36,
    paddingBottom: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.lg,
  },
  headline: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  getStartedBtn: {
    width: '100%',
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.blue,
  },
  getStartedText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingVertical: 12,
  },
  skipText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
});
