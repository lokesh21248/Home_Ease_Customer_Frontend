import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { Badge } from '../common/Badge';
import { BannerSlide } from '../../types';
import { MOCK_BANNERS } from '../../constants/mockData';

interface PromoBannerSliderProps {
  banners?: BannerSlide[];
  onPressBanner: (banner: BannerSlide) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export const PromoBannerSlider: React.FC<PromoBannerSliderProps> = ({
  banners = MOCK_BANNERS,
  onPressBanner,
  autoPlay = true,
  autoPlayInterval = 4500,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<BannerSlide>>(null);

  // Responsive card width inside padding
  const cardWidth = Math.min(windowWidth - SPACING.base * 2, 420);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay || banners.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [activeIndex, autoPlay, autoPlayInterval, banners.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / cardWidth);
    if (index >= 0 && index < banners.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const renderBannerItem = ({ item }: { item: BannerSlide }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPressBanner(item)}
        style={[
          styles.slideCard,
          { width: cardWidth },
          SHADOWS.card,
        ]}
      >
        <Image source={{ uri: item.imageUrl }} style={styles.slideImage} />
        <View style={styles.imageOverlay} />

        {item.badge ? (
          <View style={styles.badgeWrapper}>
            <Badge label={item.badge} variant="discount" />
          </View>
        ) : null}

        <View style={styles.contentBox}>
          <Text style={styles.titleText} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.subtitleText} numberOfLines={2}>
            {item.subtitle}
          </Text>
        </View>

        <View style={styles.actionCircle}>
          <Ionicons name="bag-handle-outline" size={18} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sliderContainer}>
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(item) => item.id}
        renderItem={renderBannerItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={cardWidth}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.flatListContent}
        getItemLayout={(_, index) => ({
          length: cardWidth,
          offset: cardWidth * index,
          index,
        })}
      />

      {/* Pagination Indicator Dots matching Image 2 */}
      {banners.length > 1 && (
        <View style={styles.paginationRow}>
          {banners.map((_, index) => {
            const isActive = activeIndex === index;
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={() => {
                  flatListRef.current?.scrollToIndex({ index, animated: true });
                  setActiveIndex(index);
                }}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

// Fallback single-slide PromoBanner for backwards compatibility
interface PromoBannerProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  buttonText?: string;
  onPress: () => void;
  variant?: 'featured' | 'compact';
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  title = 'Full Deep Clean',
  subtitle = 'Deep clean made simple for everyone.',
  badge = '40% Off',
  imageUrl = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
  buttonText = 'Book now →',
  onPress,
  variant = 'featured',
}) => {
  if (variant === 'featured') {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.singleContainer, SHADOWS.card]}
      >
        <Image source={{ uri: imageUrl }} style={styles.slideImage} />
        <View style={styles.imageOverlay} />

        {badge ? (
          <View style={styles.badgeWrapper}>
            <Badge label={badge} variant="discount" />
          </View>
        ) : null}

        <View style={styles.contentBox}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.subtitleText}>{subtitle}</Text>
        </View>

        <View style={styles.actionCircle}>
          <Ionicons name="bag-handle-outline" size={18} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.compactContainer, SHADOWS.card]}
    >
      <View style={styles.compactLeft}>
        <Text style={styles.compactTitle}>{title}</Text>
        <Text style={styles.compactSubtitle}>{subtitle}</Text>
        <View style={styles.compactBtn}>
          <Text style={styles.compactBtnText}>{buttonText}</Text>
        </View>
      </View>
      <Image
        source={{
          uri: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80',
        }}
        style={styles.compactImage}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    marginVertical: SPACING.xs,
  },
  flatListContent: {
    paddingHorizontal: SPACING.base,
  },
  slideCard: {
    height: 190,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginRight: 0,
  },
  singleContainer: {
    marginHorizontal: SPACING.base,
    height: 190,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: SPACING.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  slideImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18, 38, 30, 0.35)',
  },
  badgeWrapper: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  contentBox: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 64,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  subtitleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 3,
  },
  actionCircle: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: COLORS.accent, // Warm amber yellow matching Image 2
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(18, 41, 34, 0.22)',
  },
  compactContainer: {
    marginHorizontal: SPACING.base,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginVertical: SPACING.sm,
  },
  compactLeft: {
    flex: 1,
    paddingRight: 10,
  },
  compactTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
    lineHeight: 22,
  },
  compactSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginVertical: 4,
  },
  compactBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  compactBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  compactImage: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.lg,
  },
});
