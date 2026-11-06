import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface RadarSearchingViewProps {
  serviceName?: string;
  isNotFound?: boolean;
  onRetry?: () => void;
  onSchedule?: () => void;
  onCancel?: () => void;
  isRetrying?: boolean;
}

export const RadarSearchingView: React.FC<RadarSearchingViewProps> = ({
  serviceName = 'Home Service',
  isNotFound = false,
  onRetry,
  onSchedule,
  onCancel,
  isRetrying = false,
}) => {
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (isNotFound) return;

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    const createPulse = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createPulse(pulseAnim1, 0);
    const anim2 = createPulse(pulseAnim2, 650);
    const anim3 = createPulse(pulseAnim3, 1300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      clearInterval(timer);
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [isNotFound]);

  const searchRadiusText = secondsElapsed > 20 ? '5 km' : '3 km';

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  };

  if (isNotFound) {
    return (
      <View style={styles.notFoundContainer}>
        <View style={styles.notFoundIconWrap}>
          <Ionicons name="time-outline" size={40} color="#DC2626" />
        </View>

        <Text style={styles.notFoundTitle}>All Nearby Partners are Busy</Text>
        <Text style={styles.notFoundDesc}>
          Verified professionals within {searchRadiusText} are currently servicing other active bookings.
        </Text>

        <View style={styles.actionsColumn}>
          {onRetry && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={onRetry}
              disabled={isRetrying}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#074BD4', '#005CE6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                {isRetrying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={18} color="#FFFFFF" />
                    <Text style={styles.btnText}>Retry Instant Dispatch</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {onSchedule && (
            <TouchableOpacity
              style={styles.scheduleBtn}
              onPress={onSchedule}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={18} color="#074BD4" />
              <Text style={styles.scheduleBtnText}>Schedule a Guaranteed Slot</Text>
            </TouchableOpacity>
          )}

          {onCancel && (
            <TouchableOpacity
              style={styles.cancelLink}
              onPress={onCancel}
              hitSlop={10}
            >
              <Text style={styles.cancelLinkText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const renderPulseRing = (anim: Animated.Value) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 2.4],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0.8, 0.4, 0],
    });

    return (
      <Animated.View
        style={[
          styles.pulseRing,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.searchingContainer}>
      {/* Radar Pulse Rings */}
      <View style={styles.radarWrapper}>
        {renderPulseRing(pulseAnim1)}
        {renderPulseRing(pulseAnim2)}
        {renderPulseRing(pulseAnim3)}

        <View style={styles.radarCenter}>
          <LinearGradient
            colors={['#074BD4', '#005CE6']}
            style={styles.centerIconGradient}
          >
            <Ionicons name="flash" size={26} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </View>

      {/* Status Headlines */}
      <View style={styles.textWrap}>
        <View style={styles.liveTagRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>LIVE SEARCH • {formatElapsed(secondsElapsed)}</Text>
        </View>

        <Text style={styles.mainTitle}>Connecting with Nearest Partner</Text>
        <Text style={styles.subTitle}>
          Broadcasting request for {serviceName} within {searchRadiusText} radius...
        </Text>
      </View>

      {/* Trust pill */}
      <View style={styles.trustPill}>
        <Ionicons name="shield-checkmark" size={15} color="#10B981" />
        <Text style={styles.trustText}>
          Instant matching • Background checked professionals only
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  radarWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  radarCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
    zIndex: 10,
  },
  centerIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
    marginRight: 6,
  },
  liveTagText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: '#074BD4',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 4,
  },
  subTitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  trustText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: '#475569',
  },

  // Not Found State
  notFoundContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  notFoundIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  notFoundTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  notFoundDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  actionsColumn: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
    alignItems: 'center',
  },
  retryBtn: {
    width: '100%',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  btnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  scheduleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: BorderRadius.full,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
  },
  scheduleBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#074BD4',
  },
  cancelLink: {
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#94A3B8',
  },
});

