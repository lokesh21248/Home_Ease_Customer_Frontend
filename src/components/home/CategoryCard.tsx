import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { HomeColors } from './types';
import { Typography } from '../../constants/theme';

interface CategoryCardProps {
  id: string;
  name: string;
  image: any;
  width: number;
  onPress: (id: string, name: string) => void;
}

export function CategoryCard({ id, name, image, width, onPress }: CategoryCardProps) {
  const imageHeight = Math.round(width * 0.72);
  const textHeight = Math.max(Math.round(width * 0.44), 34);
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
      {/* Upper Card: Sharp Image */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <Image
          source={typeof image === 'string' ? { uri: image } : image}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
      </View>

      {/* Lower Card: Full Service Name */}
      <View style={[styles.textContainer, { height: textHeight }]}>
        <Text
          style={styles.nameText}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
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
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: HomeColors.white,
  },
  nameText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 10.5,
    color: HomeColors.darkNavy,
    textAlign: 'center',
    lineHeight: 13,
  },
});
