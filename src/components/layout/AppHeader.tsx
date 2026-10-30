import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ChevronLeft } from 'lucide-react-native';
import { Typography } from '../../constants/theme';
import { LayoutConstants, getHeaderTopPadding } from '../../constants/layout';

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  variant?: 'blueHero' | 'standard' | 'minimal';
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppHeader({
  title,
  subtitle,
  variant = 'standard',
  showBack = false,
  onBack,
  rightAction,
  children,
  style,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPadding = getHeaderTopPadding(insets.top, variant === 'blueHero' ? 12 : 8);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  if (variant === 'blueHero') {
    return (
      <View style={[styles.heroHeader, { paddingTop: topPadding }, style]}>
        {(showBack || title || rightAction) && (
          <View style={styles.heroTopRow}>
            {showBack ? (
              <Pressable
                style={styles.heroBackBtn}
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ArrowLeft size={22} color="#FFFFFF" />
              </Pressable>
            ) : null}

            <View style={styles.heroTitleWrap}>
              {title ? <Text style={styles.heroTitle}>{title}</Text> : null}
              {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
            </View>

            {rightAction ? (
              <View style={styles.heroRightWrap}>{rightAction}</View>
            ) : showBack ? (
              <View style={{ width: 40 }} />
            ) : null}
          </View>
        )}

        {children}
      </View>
    );
  }

  return (
    <View style={[styles.standardHeader, { paddingTop: topPadding }, style]}>
      <View style={styles.standardRow}>
        {showBack ? (
          <Pressable
            style={styles.backBtn}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color="#111827" />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <View style={styles.standardTitleWrap}>
          {title ? (
            <Text style={styles.standardTitle} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.standardSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightAction ? (
          <View style={styles.rightActionWrap}>{rightAction}</View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    backgroundColor: LayoutConstants.BRAND_BLUE,
    borderBottomLeftRadius: LayoutConstants.HEADER_BORDER_RADIUS,
    borderBottomRightRadius: LayoutConstants.HEADER_BORDER_RADIUS,
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    paddingBottom: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleWrap: {
    flex: 1,
    paddingHorizontal: 8,
  },
  heroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  heroRightWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  standardHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    paddingBottom: 12,
  },
  standardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standardTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  standardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: '#111827',
  },
  standardSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  rightActionWrap: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
