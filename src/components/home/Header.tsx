import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationHeader } from './LocationHeader';
import { SearchBar } from './SearchBar';
import { HomeColors } from './types';
import { Typography } from '../../constants/theme';
import { LayoutConstants, getHeaderTopPadding } from '../../constants/layout';

interface HeaderProps {
  city?: string;
  area?: string;
  userInitial?: string;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
  onSearchPress?: () => void;
  onLocationPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export function Header({
  city,
  area,
  userInitial,
  searchQuery,
  onSearchChange,
  onSearchPress,
  onLocationPress,
  onNotificationPress,
  onProfilePress,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const topPadding = getHeaderTopPadding(insets.top, 10);

  return (
    <View style={[styles.headerContainer, { paddingTop: topPadding }]}>
      {/* Top Location & Profile Row */}
      <LocationHeader
        city={city}
        area={area}
        userInitial={userInitial}
        onLocationPress={onLocationPress}
        onNotificationPress={onNotificationPress}
        onProfilePress={onProfilePress}
      />

      {/* Main Two-Line Headline */}
      <View style={styles.headingContainer}>
        <Text style={styles.headingText}>
          {'What service\ndo you need?'}
        </Text>
      </View>

      {/* Search Bar inside lower header */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
          onPress={onSearchPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: HomeColors.primaryBlue,
    borderBottomLeftRadius: LayoutConstants.HEADER_BORDER_RADIUS + 4,
    borderBottomRightRadius: LayoutConstants.HEADER_BORDER_RADIUS + 4,
    paddingBottom: 22,
  },
  headingContainer: {
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    marginTop: 14,
    marginBottom: 16,
  },
  headingText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  searchWrapper: {
    width: '100%',
  },
});
