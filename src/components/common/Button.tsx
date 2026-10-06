import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'forest' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'forest':
        return styles.forestBtn;
      case 'secondary':
        return styles.secondaryBtn;
      case 'outline':
        return styles.outlineBtn;
      case 'danger':
        return styles.dangerBtn;
      case 'ghost':
        return styles.ghostBtn;
      case 'primary':
      default:
        return styles.primaryBtn;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'forest':
        return styles.forestText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'danger':
        return styles.dangerText;
      case 'ghost':
        return styles.ghostText;
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      case 'md':
      default:
        return styles.sizeMd;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getSizeStyle(),
        getContainerStyle(),
        disabled && styles.disabledBtn,
        variant === 'primary' && !disabled && SHADOWS.subtle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? COLORS.primaryDark : COLORS.textWhite}
        />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.iconMargin}>{leftIcon}</View>}
          <Text style={[styles.baseText, getTextStyle(), disabled && styles.disabledText, textStyle]}>
            {title}
          </Text>
          {rightIcon && <View style={styles.iconMarginRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMargin: {
    marginRight: 8,
  },
  iconMarginRight: {
    marginLeft: 8,
  },
  sizeSm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sizeMd: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  sizeLg: {
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent, // Warm honey yellow from Image 2
  },
  forestBtn: {
    backgroundColor: COLORS.primaryDark,
  },
  secondaryBtn: {
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1.2,
    borderColor: COLORS.borderGlass,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
  },
  dangerBtn: {
    backgroundColor: COLORS.error,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
  },
  disabledBtn: {
    backgroundColor: 'rgba(180, 200, 190, 0.4)',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  baseText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  primaryText: {
    color: COLORS.primaryDark,
  },
  forestText: {
    color: COLORS.textWhite,
  },
  secondaryText: {
    color: COLORS.textPrimary,
  },
  outlineText: {
    color: COLORS.primary,
  },
  dangerText: {
    color: COLORS.textWhite,
  },
  ghostText: {
    color: COLORS.textSecondary,
  },
  disabledText: {
    color: COLORS.textMuted,
  },
});
