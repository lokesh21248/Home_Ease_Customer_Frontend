import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface HomeEasePassBannerProps {
  onPress?: () => void;
}

export function HomeEasePassBanner({ onPress }: HomeEasePassBannerProps) {
  const [activeDot, setActiveDot] = useState(0);

  const handlePress = () => {
    setActiveDot((p) => (p + 1) % 3);
    if (onPress) onPress();
    else router.push('/(tabs)/categories');
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="HomeEase Pass: Buy One Pass Three Visits FREE"
      >
        <LinearGradient
          colors={['#0047D0', '#005EF5', '#1270FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* ── Left text column ── */}
          <View style={styles.leftCol}>
            {/* Crown + "HomeEase Pass" pill */}
            <View style={styles.crownPill}>
              <Ionicons name="ribbon" size={12} color="#0047D0" style={{ marginRight: 4 }} />
              <Text style={styles.pillTxt}>HomeEase Pass</Text>
            </View>

            {/* Headline */}
            <Text style={styles.headline}>
              {'Buy One Pass\n'}
              <Text style={styles.headlineWhite}>{'Three Visits '}</Text>
              <Text style={styles.headlineGold}>FREE</Text>
            </Text>
          </View>

          {/* ── Right: overlapping pass card graphics ── */}
          <View style={styles.rightCol}>
            {/* Back card: "HomeEase / 3 VISITS / ₹99" */}
            <View style={[styles.passCard, styles.passCardBack]}>
              <View style={styles.passCardTopRow}>
                <Ionicons name="home" size={10} color="#FFFFFF" />
                <Text style={styles.passCardBrand}> HomeEase</Text>
              </View>
              <Text style={styles.passCardVisits}>3 VISITS</Text>
              <Text style={styles.passCardPrice}>₹99</Text>
            </View>

            {/* Front card: "HomeEase / PASS / Buy Once & Save" with arrow circle */}
            <View style={[styles.passCard, styles.passCardFront]}>
              <View style={styles.passCardTopRow}>
                <Ionicons name="home" size={10} color="#FFFFFF" />
                <Text style={styles.passCardBrand}> HomeEase</Text>
              </View>
              <Text style={styles.passCardPassLabel}>PASS</Text>
              <Text style={styles.passCardSave}>Buy Once & Save</Text>

              {/* Arrow circle */}
              <View style={styles.arrowCircle}>
                <Ionicons name="chevron-forward" size={12} color="#0047D0" />
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>

      {/* Pagination dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.dot, activeDot === i && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 14,
    marginTop: 10,
  },
  pressable: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#0040CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 14,
    minHeight: 110,
  },

  /* ─── Left text ─── */
  leftCol: {
    flex: 1,
    paddingRight: 8,
  },
  crownPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  pillTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0047D0',
    letterSpacing: -0.1,
  },
  headline: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  headlineWhite: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
  },
  headlineGold: {
    color: '#FACC15',
    fontWeight: '900',
    fontSize: 20,
  },

  /* ─── Right pass card graphics ─── */
  rightCol: {
    width: 148,
    height: 90,
    position: 'relative',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  passCard: {
    position: 'absolute',
    width: 86,
    height: 82,
    borderRadius: 10,
    padding: 8,
    justifyContent: 'center',
  },
  passCardBack: {
    backgroundColor: '#1259E8',
    left: 0,
    top: 4,
    transform: [{ rotate: '-4deg' }],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  passCardFront: {
    backgroundColor: '#2563EB',
    right: 0,
    top: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  passCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  passCardBrand: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  passCardVisits: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginVertical: 1,
  },
  passCardPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FACC15',
  },
  passCardPassLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginVertical: 2,
  },
  passCardSave: {
    fontSize: 8.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  arrowCircle: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── Dots ─── */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginTop: 9,
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
    borderRadius: 3,
    backgroundColor: '#0047D0',
  },
});
