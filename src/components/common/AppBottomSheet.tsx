/**
 * AppBottomSheet.tsx - Reusable Bottom Sheet Component
 *
 * Implements @gorhom/bottom-sheet with:
 * - Fluid snap points configuration
 * - Semi-transparent dimmed backdrop
 * - NativeWind / Tailwind styling
 * - Lucide React Native icons
 * - Smooth drag gesture & pan-down to close
 */

import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';

export interface AppBottomSheetProps {
  title?: string;
  subtitle?: string;
  snapPoints?: (string | number)[];
  initialIndex?: number;
  enablePanDownToClose?: boolean;
  onClose?: () => void;
  scrollable?: boolean;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const AppBottomSheet = forwardRef<BottomSheet, AppBottomSheetProps>(
  (
    {
      title,
      subtitle,
      snapPoints: customSnapPoints,
      initialIndex = 0,
      enablePanDownToClose = true,
      onClose,
      scrollable = false,
      children,
      contentContainerStyle,
    },
    ref
  ) => {
    const snapPoints = useMemo(
      () => customSnapPoints ?? ['45%', '75%'],
      [customSnapPoints]
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.65}
          pressBehavior="close"
        />
      ),
      []
    );

    const handleClose = useCallback(() => {
      onClose?.();
    }, [onClose]);

    const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

    return (
      <BottomSheet
        ref={ref}
        index={initialIndex}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        onClose={handleClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.indicator}
      >
        <ContentWrapper style={[styles.container, contentContainerStyle]}>
          {(title || subtitle) && (
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                {title && <Text style={styles.title}>{title}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              {enablePanDownToClose && (
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                  accessibilityLabel="Close sheet"
                >
                  <X size={18} color="#A0A0B2" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {children}
        </ContentWrapper>
      </BottomSheet>
    );
  }
);

AppBottomSheet.displayName = 'AppBottomSheet';

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#1F1D2B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2E2B3E',
  },
  indicator: {
    backgroundColor: '#3E3B52',
    width: 44,
    height: 4,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2839',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Outfit_700Bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#A0A0B2',
    marginTop: 2,
    fontFamily: 'Outfit_400Regular',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2839',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
