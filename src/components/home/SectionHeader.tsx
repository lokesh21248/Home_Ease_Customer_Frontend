import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { HomeColors } from './types';
import { Typography } from '../../constants/theme';
import { LayoutConstants } from '../../constants/layout';

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onActionPress?: () => void;
}

export function SectionHeader({
  title,
  actionText = 'See All →',
  onActionPress,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionText ? (
        <Pressable
          onPress={onActionPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${actionText} for ${title}`}
        >
          <Text style={styles.action}>{actionText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LayoutConstants.HORIZONTAL_PADDING,
    marginTop: 18,
    marginBottom: 12,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 19,
    color: HomeColors.darkNavy,
    letterSpacing: -0.3,
  },
  action: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13.5,
    color: HomeColors.primaryBlue,
  },
});
