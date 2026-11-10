import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { HomeColors } from './types';
import { Banner } from '../../api/client';
import { LayoutConstants } from '../../constants/layout';

interface PromoBannerProps {
  banners?: Banner[];
  onPress?: (targetId: string, title: string) => void;
}

// Banner image aspect ratio from native asset (434 x 189)
const BANNER_ASPECT_RATIO = 434 / 189;

export function PromoBanner({ banners = [], onPress }: PromoBannerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeDot, setActiveDot] = useState(0);

  if (!banners || banners.length === 0) {
    return null;
  }

  const bannerList = banners.filter((b) => b.isActive !== false);
  if (bannerList.length === 0) {
    return null;
  }

  const bannerWidth = screenWidth - LayoutConstants.HORIZONTAL_PADDING * 2;
  const bannerHeight = Math.round(bannerWidth / BANNER_ASPECT_RATIO);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index >= 0 && index < bannerList.length && index !== activeDot) {
      setActiveDot(index);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContainer}
      >
        {bannerList.map((banner, idx) => {
          const imageSource = banner.imageUrl ? { uri: banner.imageUrl } : null;
          return (
            <View
              key={banner.bannerId || `banner-${idx}`}
              style={[styles.slideWrap, { width: screenWidth }]}
            >
              <Pressable
                style={[
                  styles.bannerCard,
                  {
                    width: bannerWidth,
                    height: bannerHeight,
                  },
                ]}
                onPress={() => onPress?.(banner.targetId, banner.title)}
                accessibilityRole="button"
                accessibilityLabel={banner.title || 'Promotional Banner'}
              >
                <Image
                  source={imageSource}
                  style={styles.bannerImage}
                  contentFit="cover"
                  transition={200}
                />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {/* Carousel Indicator Dots */}
      {bannerList.length > 1 && (
        <View style={styles.dotsRow}>
          {bannerList.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, activeDot === idx ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    width: '100%',
  },
  scrollContainer: {
    alignItems: 'center',
  },
  slideWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
