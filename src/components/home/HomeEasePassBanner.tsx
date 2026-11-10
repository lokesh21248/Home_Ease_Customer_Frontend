import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';

interface HomeEasePassBannerProps {
  onPress?: () => void;
}

export function HomeEasePassBanner({ onPress }: HomeEasePassBannerProps) {
  const [activeDot, setActiveDot] = useState(1); // second dot active (matches screenshot)

  const handlePress = () => {
    setActiveDot((p) => (p + 1) % 3);
    if (onPress) onPress();
    else router.push('/(tabs)/categories');
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [styles.bannerWrap, pressed && styles.pressed]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="HomeEase Pass: Buy One Pass Three Visits FREE"
      >
        <LinearGradient
          colors={['#0047DD', '#0062F5', '#0870FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.8 }}
          style={styles.gradient}
        >
          {/* ── LEFT: Text column ── */}
          <View style={styles.leftCol}>
            {/* "HomeEase Pass" white pill with crown */}
            <View style={styles.pillBadge}>
              <Crown size={12} color="#0052FF" strokeWidth={2.5} style={{ marginRight: 4 }} />
              <Text style={styles.pillText}>HomeEase Pass</Text>
            </View>

            {/* Headline */}
            <Text style={styles.headline}>
              Buy One Pass{'\n'}
              <Text style={styles.headlineWhite}>Three Visits </Text>
              <Text style={styles.headlineGold}>FREE</Text>
            </Text>
          </View>

          {/* ── RIGHT: Overlapping pass card graphics ── */}
          <View style={styles.rightCol}>
            {/* Back card: "HomeEase 3 VISITS ₹99" */}
            <View style={styles.passCardBack}>
              <LinearGradient
                colors={['#1a6fff', '#0052DD']}
                style={styles.passCardBackGradient}
              >
                <Text style={styles.passCardBrandSmall}>HomeEase</Text>
                <Text style={styles.passCardVisits}>3 VISITS</Text>
                <Text style={styles.passCardPrice}>₹99</Text>
              </LinearGradient>
            </View>

            {/* Front card: "HomeEase PASS" */}
            <View style={styles.passCardFront}>
              <LinearGradient
                colors={['#1E5BF7', '#0040CC']}
                style={styles.passCardFrontGradient}
              >
                {/* Home icon top-right */}
                <View style={styles.passHomeIconWrap}>
                  <Text style={styles.passHomeIcon}>⌂</Text>
                </View>
                <Text style={styles.passCardBrand}>HomeEase</Text>
                <Text style={styles.passCardPassLabel}>PASS</Text>
                <Text style={styles.passCardTagline}>Buy Once & Save</Text>
              </LinearGradient>
            </View>

            {/* Circle arrow button */}
            <Pressable
              style={styles.arrowBtn}
              onPress={handlePress}
              accessibilityRole="button"
              accessibilityLabel="View HomeEase Pass"
            >
              <ChevronRight size={16} color="#0052FF" strokeWidth={2.5} />
            </Pressable>
          </View>
        </LinearGradient>
      </Pressable>

      {/* ── PAGINATION DOTS ── */}
      <View style={styles.dotsRow}>
        <View style={[styles.dot, activeDot === 0 && styles.dotActive]} />
        <View style={[styles.dot, activeDot === 1 && styles.dotActive]} />
        <View style={[styles.dot, activeDot === 2 && styles.dotActive]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  bannerWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#0040CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 14,
    minHeight: 112,
    overflow: 'hidden',
  },

  /* ── LEFT ── */
  leftCol: {
    flex: 1,
    justifyContent: 'center',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0052FF',
    letterSpacing: -0.1,
  },
  headline: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  headlineWhite: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  headlineGold: {
    color: '#FACC15',
    fontWeight: '900',
    fontSize: 18,
  },

  /* ── RIGHT: Pass cards ── */
  rightCol: {
    width: 148,
    height: 86,
    position: 'relative',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  /* Back card */
  passCardBack: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 90,
    height: 78,
    borderRadius: 10,
    overflow: 'hidden',
    transform: [{ rotate: '-6deg' }],
    elevation: 1,
  },
  passCardBackGradient: {
    flex: 1,
    padding: 8,
    justifyContent: 'flex-end',
  },
  passCardBrandSmall: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  passCardVisits: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  passCardPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  /* Front card */
  passCardFront: {
    position: 'absolute',
    right: 24,
    top: 4,
    width: 86,
    height: 76,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  passCardFrontGradient: {
    flex: 1,
    padding: 8,
    justifyContent: 'flex-end',
  },
  passHomeIconWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passHomeIcon: { fontSize: 12, color: '#FFFFFF' },
  passCardBrand: {
    fontSize: 8.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.80)',
    marginBottom: 1,
  },
  passCardPassLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  passCardTagline: {
    fontSize: 7,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  /* Circle arrow */
  arrowBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },

  /* ── PAGINATION DOTS ── */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0052FF',
  },
});
