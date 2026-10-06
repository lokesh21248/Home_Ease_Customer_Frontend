import React, { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'light' | 'muted' | 'dark' | 'yellow';
  radius?: number;
  padding?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'light',
  radius = RADIUS.xl,
  padding = 16,
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'dark':
        return COLORS.glassDarkBackground;
      case 'muted':
        return COLORS.backgroundCardMuted;
      case 'yellow':
        return 'rgba(248, 189, 56, 0.18)';
      case 'light':
      default:
        return COLORS.backgroundCard;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'dark':
        return COLORS.glassBorderDark;
      case 'yellow':
        return 'rgba(248, 189, 56, 0.4)';
      default:
        return COLORS.borderGlass;
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderRadius: radius,
          padding,
        },
        SHADOWS.card,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    overflow: 'hidden',
  },
});
