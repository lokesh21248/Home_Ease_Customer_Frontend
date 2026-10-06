import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RADIUS } from '../../constants/theme';

export const LoadingSkeleton: React.FC<{ height?: number; width?: string | number; borderRadius?: number; style?: any }> = ({
  height = 80,
  width = '100%',
  borderRadius = RADIUS.lg,
  style,
}) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          height,
          width: width as any,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    marginVertical: 6,
  },
});
