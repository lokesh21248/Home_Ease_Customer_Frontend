import React from 'react';
import { StyleSheet, Pressable, ViewStyle, StyleProp, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFabBottomOffset } from '../../constants/layout';
import { HomeColors } from '../home/types';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  isTabScreen?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function FloatingActionButton({
  onPress,
  icon,
  isTabScreen = true,
  style,
  accessibilityLabel = 'Action button',
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  const bottom = getFabBottomOffset(insets.bottom, isTabScreen);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        { bottom },
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: HomeColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
    }),
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});
