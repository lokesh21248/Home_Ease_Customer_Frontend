import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface HomeEasePassBannerProps {
  onPress?: () => void;
}

export function HomeEasePassBanner({ onPress }: HomeEasePassBannerProps) {
  const [activeDot, setActiveDot] = useState(0);

  const handleBannerPress = () => {
    setActiveDot((prev) => (prev + 1) % 3);
    if (onPress) {
      onPress();
    } else {
      router.push('/(tabs)/categories');
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* 1. Main Pass Card */}
      <Pressable
        style={({ pressed }) => [styles.bannerPressable, pressed && styles.pressed]}
        onPress={handleBannerPress}
        accessibilityRole="button"
        accessibilityLabel="HomeEase Pass: Buy One Pass Three Visits FREE"
      >
        <LinearGradient
          colors={['#0046E8', '#0066FF', '#0D72FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.bannerGradient}
        >
          {/* Left Text Column */}
          <View style={styles.leftCol}>
            {/* White Pill Badge */}
            <View style={styles.pillBadge}>
              <Ionicons name="ribbon-outline" size={13} color="#0052FF" style={{ marginRight: 3 }} />
              <Text style={styles.pillText}>HomeEase Pass</Text>
            </View>

            {/* Bold Headline */}
            <Text style={styles.headline}>
              {'Buy One Pass\nThree Visits FREE'}
            </Text>
          </View>

          {/* Right Graphical Overlapping Passes */}
          <View style={styles.rightGraphicsCol}>
            {/* Background Cyan Ticket */}
            <View style={styles.backPassTicket}>
              <Text style={styles.ticketBrand}>HomeEase</Text>
              <Text style={styles.ticketVisits}>3 VISITS</Text>
              <Text style={styles.ticketPrice}>₹99</Text>
            </View>

            {/* Foreground Royal Blue Pass */}
            <View style={styles.frontPassTicket}>
              <View style={styles.frontPassHeader}>
                <Ionicons name="home" size={11} color="#FFFFFF" />
              </View>
              <Text style={styles.frontPassBrand}>HomeEase</Text>
              <Text style={styles.frontPassTitle}>PASS</Text>
              <Text style={styles.frontPassSub}>Buy Once & Save</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>

      {/* 2. Three Pagination Dots */}
      <View style={styles.paginationRow}>
        <View style={[styles.dot, activeDot === 0 && styles.activePill]} />
        <View style={[styles.dot, activeDot === 1 && styles.activePill]} />
        <View style={[styles.dot, activeDot === 2 && styles.activePill]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  bannerPressable: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 114,
  },
  leftCol: {
    flex: 1,
    paddingRight: 6,
  },
  pillBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0052FF',
    letterSpacing: -0.1,
  },
  headline: {
    fontSize: 18.5,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 23,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  rightGraphicsCol: {
    width: 140,
    height: 94,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPassTicket: {
    position: 'absolute',
    left: 4,
    top: 6,
    width: 82,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#38BDF8',
    padding: 7,
    justifyContent: 'space-between',
    transform: [{ rotate: '-8deg' }],
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  ticketBrand: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0369A1',
  },
  ticketVisits: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0C4A6E',
    marginTop: 2,
    lineHeight: 13,
  },
  ticketPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  frontPassTicket: {
    position: 'absolute',
    right: 2,
    top: 0,
    width: 86,
    height: 88,
    borderRadius: 14,
    backgroundColor: '#1D4ED8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    padding: 7,
    justifyContent: 'space-between',
    transform: [{ rotate: '6deg' }],
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  frontPassHeader: {
    alignItems: 'center',
  },
  frontPassBrand: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#BFDBFE',
    textAlign: 'center',
  },
  frontPassTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  frontPassSub: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#DBEAFE',
    textAlign: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  activePill: {
    width: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0052FF',
  },
});
