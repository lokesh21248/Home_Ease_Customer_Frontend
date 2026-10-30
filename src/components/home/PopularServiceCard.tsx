import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { HomeColors } from './types';
import { Typography } from '../../constants/theme';

interface PopularServiceCardProps {
  id: string;
  name: string;
  image: any;
  width: number;
  price?: number;
  onPress: (id: string, name: string) => void;
}

export function PopularServiceCard({
  id,
  name,
  image,
  width,
  price,
  onPress,
}: PopularServiceCardProps) {
  const imageHeight = Math.round(width * 0.75);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width },
        pressed && styles.pressed,
      ]}
      onPress={() => onPress(id, name)}
      accessibilityRole="button"
      accessibilityLabel={`Popular Service: ${name}`}
    >
      {/* Upper Card: Clear Image */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <Image
          source={typeof image === 'string' ? { uri: image } : image}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
        {typeof price === 'number' && price > 0 ? (
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>₹{price}</Text>
          </View>
        ) : null}
      </View>

      {/* Lower Card: Service Name */}
      <View style={styles.textContainer}>
        <Text style={styles.nameText} numberOfLines={2}>
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
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
    }),
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#EAEFF8',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pricePill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(16, 24, 40, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: HomeColors.white,
  },
  nameText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: HomeColors.darkNavy,
    lineHeight: 15,
  },
});
