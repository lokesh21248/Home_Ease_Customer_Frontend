import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LayoutConstants } from '../../constants/layout';

export interface ScreenContentProps {
  children: React.ReactNode;
  paddingHorizontal?: number;
  style?: StyleProp<ViewStyle>;
}

export function ScreenContent({
  children,
  paddingHorizontal = LayoutConstants.HORIZONTAL_PADDING,
  style,
}: ScreenContentProps) {
  return (
    <View style={[styles.container, { paddingHorizontal }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
