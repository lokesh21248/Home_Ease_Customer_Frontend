import React from 'react';
import { View, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
import { Search } from 'lucide-react-native';
import { HomeColors } from './types';
import { Typography } from '../../constants/theme';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  onPress,
  placeholder = 'Search for services, e.g. AC Service, Cleaning...',
}: SearchBarProps) {
  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      accessibilityRole="search"
      accessibilityLabel="Search services"
    >
      <View style={styles.searchInner}>
        <Search size={22} color={HomeColors.lightGray} strokeWidth={2} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={HomeColors.secondaryGray}
          value={value}
          onChangeText={onChangeText}
          numberOfLines={1}
          returnKeyType="search"
          editable={true}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    height: 68,
    borderRadius: 34,
    backgroundColor: HomeColors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
    }),
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14.5,
    color: HomeColors.darkNavy,
    paddingVertical: 0,
    includeFontPadding: false,
  },
});

