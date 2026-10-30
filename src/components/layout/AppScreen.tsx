import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  StyleProp,
  RefreshControlProps,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getScrollBottomPadding } from '../../constants/layout';

export interface AppScreenProps {
  children: React.ReactNode;
  statusBarStyle?: 'light' | 'dark' | 'auto';
  statusBarBg?: string;
  headerBackground?: string;
  backgroundColor?: string;
  isTabScreen?: boolean;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
  showsVerticalScrollIndicator?: boolean;
}

export function AppScreen({
  children,
  statusBarStyle = 'dark',
  statusBarBg,
  headerBackground,
  backgroundColor = '#F8F9FC',
  isTabScreen = false,
  scrollable = false,
  contentContainerStyle,
  style,
  refreshControl,
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
  showsVerticalScrollIndicator = false,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const effectiveBottomPadding = isTabScreen
    ? getScrollBottomPadding(insets.bottom)
    : Math.max(insets.bottom, 16);

  const screenContent = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        { paddingBottom: effectiveBottomPadding },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, style]}>{children}</View>
  );

  const containerContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {screenContent}
    </KeyboardAvoidingView>
  ) : (
    screenContent
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar style={statusBarStyle} />
      {headerBackground ? (
        <View
          style={[
            styles.statusBarCover,
            { height: insets.top, backgroundColor: headerBackground },
          ]}
        />
      ) : null}
      {containerContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  statusBarCover: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
});
