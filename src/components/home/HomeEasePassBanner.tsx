import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Crown } from 'lucide-react-native';
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
      {/* 1. Main Pass Card Container */}
      <View style={styles.bannerContainer}>
        <Pressable
          style={styles.pressable}
          onPress={handleBannerPress}
          accessibilityRole="button"
          accessibilityLabel="HomeEase Pass: Buy One Pass Three Visits FREE"
        >
          <LinearGradient
            colors={['#004BE4', '#0062F5', '#0870FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.9 }}
            style={styles.bannerGradient}
          >
            {/* Left Text Column */}
            <View style={styles.leftCol}>
              {/* White Pill Badge with Crown Emblem */}
              <View style={styles.pillBadge}>
                <Crown size={13} color="#0052FF" strokeWidth={2.4} style={{ marginRight: 4 }} />
                <Text style={styles.pillText}>HomeEase Pass</Text>
              </View>

              {/* Bold Headline with "Three Visits FREE" highlighted in golden yellow */}
              <Text style={styles.headline}>
                Buy One Pass{'\n'}
                Three Visits <Text style={styles.headlineHighlight}>FREE</Text>
              </Text>
            </View>

            {/* Right Graphical Overlapping Passes */}
            <View style={styles.rightGraphicsCol}>
              <Image
                source={require('../../../assets/images/pass_graphic.png')}
                style={styles.passImage}
                contentFit="contain"
                transition={150}
              />
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* 2. Three Circular/Oval Pagination Dots */}
      <View style={styles.paginationRow}>
        <View style={[styles.dot, activeDot === 0 && styles.activeDot]} />
        <View style={[styles.dot, activeDot === 1 && styles.activeDot]} />
        <View style={[styles.dot, activeDot === 2 && styles.activeDot]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  bannerContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    backgroundColor: '#004BE4',
  },
  pressable: {
    width: '100%',
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 10,
    paddingVertical: 14,
    minHeight: 114,
  },
  leftCol: {
    flex: 1,
    paddingRight: 6,
    justifyContent: 'center',
  },
  pillBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0052FF',
    letterSpacing: -0.1,
  },
  headline: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  headlineHighlight: {
    color: '#FACC15', // Vibrant golden yellow matching master design
    fontWeight: '900',
  },
  rightGraphicsCol: {
    width: 150,
    height: 98,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passImage: {
    width: '100%',
    height: '100%',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    marginBottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    width: 18,
    borderRadius: 3,
    backgroundColor: '#0052FF',
  },
});
