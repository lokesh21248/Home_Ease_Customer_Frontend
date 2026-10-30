/**
 * Booking Success Screen — Pronto-style "Booking Confirmed!" screen.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function BookingSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { bookingId, scheduledAt, serviceName } = useLocalSearchParams<{
    bookingId: string;
    scheduledAt: string;
    serviceName: string;
  }>();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const scheduledDate = scheduledAt
    ? new Date(scheduledAt).toLocaleString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="dark" />

      {/* Success icon */}
      <View style={styles.topSection}>
        <Animated.View style={[styles.successCircleOuter, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.successCircle}
          >
            <Text style={styles.checkMark}>✓</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.confirmedTitle}>Booking Confirmed!</Text>
          <Text style={styles.confirmedSub}>Booking ID</Text>
          <Text style={styles.bookingId}>#{bookingId}</Text>

          {scheduledDate ? (
            <Text style={styles.scheduledText}>
              Your service professional will reach{'\n'}at {scheduledDate}
            </Text>
          ) : null}
        </Animated.View>
      </View>

      {/* Buttons */}
      <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => router.push(`/booking/track/${bookingId}`)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.trackBtnGradient}
          >
            <Text style={styles.trackBtnText}>Track Service</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => router.push(`/booking/track/${bookingId}`)}
          activeOpacity={0.8}
        >
          <Text style={styles.detailsBtnText}>View Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.7}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },

  successCircleOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  confirmedTitle: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize['3xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  confirmedSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  bookingId: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.primary,
    marginTop: 4,
  },
  scheduledText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: Spacing.md,
  },

  bottomSection: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },

  trackBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.blue,
  },
  trackBtnGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: '#FFFFFF',
    letterSpacing: Typography.letterSpacing.wide,
  },

  detailsBtn: {
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFade2,
  },
  detailsBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
  },

  homeBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
});
