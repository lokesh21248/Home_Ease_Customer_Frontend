import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Address } from '../../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

interface AddressCardProps {
  address: Address;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export const AddressCard: React.FC<AddressCardProps> = ({
  address,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  showActions = false,
}) => {
  const getIconName = () => {
    switch (address.type) {
      case 'Home':
        return 'home-outline';
      case 'Work':
        return 'briefcase-outline';
      default:
        return 'location-outline';
    }
  };

  const displayTitle = address.title || address.label || address.type || 'Home';
  const displayAddress =
    address.addressLine ||
    [address.houseFlat, address.street, address.area, address.city, address.pincode ? `- ${address.pincode}` : '']
      .filter(Boolean)
      .join(', ');

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onSelect}
      style={[
        styles.container,
        isSelected && styles.containerSelected,
        SHADOWS.subtle,
      ]}
    >
      <View style={styles.leftIconWrapper}>
        <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
          <Ionicons
            name={getIconName()}
            size={20}
            color={isSelected ? COLORS.primaryDark : COLORS.primary}
          />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.typeTitle}>{displayTitle}</Text>
          {address.isDefault && (
            <View style={styles.defaultPill}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>

        <Text style={styles.addressLine} numberOfLines={2}>
          {displayAddress}
        </Text>
        {address.landmark ? (
          <Text style={styles.landmarkText} numberOfLines={1}>
            Landmark: {address.landmark}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightAction}>
        {showActions ? (
          <View style={styles.actionButtonsRow}>
            {onEdit && (
              <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  containerSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  leftIconWrapper: {
    marginRight: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSelected: {
    backgroundColor: COLORS.accent,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  defaultPill: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  addressLine: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  landmarkText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rightAction: {
    marginLeft: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: 'rgba(50, 100, 80, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primaryDark,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryDark,
  },
});
