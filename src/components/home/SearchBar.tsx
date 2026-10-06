import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  locationName?: string;
  onLocationPress?: () => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  locationName = 'Indira Nagar',
  onLocationPress,
  placeholder = 'Search services...',
  onFocus,
  onBlur,
}) => {
  return (
    <View style={[styles.container, SHADOWS.card]}>
      {locationName && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onLocationPress}
          style={styles.locationPill}
        >
          <Ionicons name="location-sharp" size={16} color={COLORS.primaryDark} />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationName}
          </Text>
          <View style={styles.verticalDivider} />
        </TouchableOpacity>
      )}

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        onFocus={onFocus}
        onBlur={onBlur}
        style={styles.input}
      />

      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.actionBtn}>
          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      ) : (
        <View style={styles.actionBtn}>
          <Ionicons name="search" size={20} color={COLORS.primaryDark} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    height: 54,
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.sm,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginLeft: 4,
    maxWidth: 90,
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(50, 100, 80, 0.18)',
    marginLeft: 10,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    height: '100%',
  },
  actionBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
