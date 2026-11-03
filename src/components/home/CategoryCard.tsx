import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { HomeColors } from './types';
import { Typography } from '../../constants/theme';
import { getCategoryFallbackImage } from '../../hooks/useCategories';

interface CategoryCardProps {
  id: string;
  name: string;
  image: any;
  width: number;
  onPress: (id: string, name: string) => void;
}

export function CategoryCard({ id, name, image, width, onPress }: CategoryCardProps) {
  const [imageError, setImageError] = useState(false);

  const fallbackUri = getCategoryFallbackImage(name);
  const imageSource = !imageError && image
    ? (typeof image === 'string' ? { uri: image } : image)
    : { uri: fallbackUri };

  const imageHeight = Math.round(width * 0.74);
  const textHeight = 42;
  const totalHeight = imageHeight + textHeight;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          width,
          height: totalHeight,
        },
        pressed && styles.pressed,
      ]}
      onPress={() => onPress(id, name)}
      accessibilityRole="button"
      accessibilityLabel={`Service Category: ${name}`}
    >
      {/* Upper Card: Category Image with Fallback */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <Image
          source={imageSource}
          style={styles.image}
          contentFit="cover"
          transition={150}
          onError={() => setImageError(true)}
        />
      </View>

      {/* Lower Card: Category Name without truncation/overflow */}
      <View style={[styles.textContainer, { height: textHeight }]}>
        <Text
          style={[
            styles.nameText,
            width < 80 && styles.nameTextSmall,
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {name}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: HomeColors.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: HomeColors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
    }),
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#EEF2FA',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: HomeColors.white,
  },
  nameText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    color: HomeColors.darkNavy,
    textAlign: 'center',
    lineHeight: 14,
  },
  nameTextSmall: {
    fontSize: 10,
    lineHeight: 13,
  },
});
