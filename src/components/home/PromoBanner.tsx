import React, { useState } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { HomeColors } from './types';
import { Banner } from '../../api/client';
import { LayoutConstants } from '../../constants/layout';

interface PromoBannerProps {
  banners?: Banner[];
  onPress?: (targetId: string, title: string) => void;
}

const DEFAULT_BANNER_IMAGE = {
  uri: 'https://gheiuyygjssqatziviix.supabase.co/storage/v1/object/public/homeease-banners/banner-images/1af45e3e-7662-4f1d-9dd0-a8acf19c57e5.png',
};
// Banner image aspect ratio from native asset (434 x 189)
const BANNER_ASPECT_RATIO = 434 / 189;

const DEFAULT_BANNERS: Banner[] = [
  {
    bannerId: 'cbe9a00e-bce0-45fe-a6e1-a4c79d5cdf36',
    title: 'Festival Home Cleaning Fest — Flat 25% Off',
    imageUrl: 'https://gheiuyygjssqatziviix.supabase.co/storage/v1/object/public/homeease-banners/banner-images/1af45e3e-7662-4f1d-9dd0-a8acf19c57e5.png',
    targetType: 'SERVICE',
    targetId: 'be8bb640-cc11-4243-ab4a-5cbdf34a0937',
    isActive: true,
  },
  {
    bannerId: '9f622e9e-b1d0-48cc-aae8-38427ea569fe',
    title: 'Beat the Summer Heat — AC Deep Jet Wash @ ₹499',
    imageUrl: 'https://gheiuyygjssqatziviix.supabase.co/storage/v1/object/public/homeease-banners/banner-images/606097d2-9bfd-4766-aa61-22b038669840.png',
    targetType: 'SERVICE',
    targetId: '9b7f941c-ee83-4ffe-bd1d-2dacba5d4760',
    isActive: true,
  },
];

export function PromoBanner({ banners, onPress }: PromoBannerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeDot, setActiveDot] = useState(0);

  const bannerList = banners && banners.length > 0 ? banners : DEFAULT_BANNERS;

  const bannerWidth = screenWidth - LayoutConstants.HORIZONTAL_PADDING * 2;
  const bannerHeight = Math.round(bannerWidth / BANNER_ASPECT_RATIO);

  const activeBanner = bannerList[activeDot % bannerList.length];
  const imageSource = activeBanner?.imageUrl ? { uri: activeBanner.imageUrl } : DEFAULT_BANNER_IMAGE;

  const handlePress = () => {
    if (activeBanner) {
      onPress?.(activeBanner.targetId, activeBanner.title);
    } else {
      onPress?.('be8bb640-cc11-4243-ab4a-5cbdf34a0937', 'Festival Home Cleaning Fest');
    }
  };

  const totalSlides = bannerList.length;

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.bannerCard,
          {
            width: bannerWidth,
            height: bannerHeight,
          },
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={activeBanner?.title || 'Promotional Banner'}
      >
        <Image
          source={imageSource}
          style={styles.bannerImage}
          contentFit="cover"
          transition={200}
        />
      </Pressable>

      {/* Carousel Indicator Dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSlides }).map((_, idx) => (
          <Pressable
            key={idx}
            onPress={() => setActiveDot(idx)}
            style={[styles.dot, activeDot === idx ? styles.dotActive : styles.dotInactive]}
            accessibilityLabel={`Banner slide ${idx + 1}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    alignItems: 'center',
    width: '100%',
  },
  bannerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: HomeColors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
    }),
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    width: 20,
    backgroundColor: HomeColors.activeBlue,
  },
  dotInactive: {
    width: 5,
    backgroundColor: HomeColors.inactiveDot,
  },
});
