import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useAuth } from '../src/context/AuthContext';
import { Typography } from '../src/constants/theme';
import { systemApi, AppUpdateCheckResponse } from '../src/api/client';
import { AppUpdateModal } from '../src/components/common/AppUpdateModal';

const { width } = Dimensions.get('window');

export default function Index() {
  const { isLoading } = useAuth();
  const [readyToNavigate, setReadyToNavigate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateCheckResponse | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  // 1. Check for App Updates on Startup
  useEffect(() => {
    let isCancelled = false;

    async function checkForUpdates() {
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      try {
        const info = await systemApi.checkAppUpdate(currentVersion, platform);
        if (isCancelled) return;

        if (info.forceUpdate) {
          // Show non-dismissible modal with "Update Now" button linking to updateInfo.storeUrl
          setUpdateInfo(info);
          setShowUpdateModal(true);
          return;
        } else if (info.updateAvailable) {
          setUpdateInfo(info);
          setShowUpdateModal(true);
        }
      } catch (err) {
        console.log('[Startup] App update check notice:', err);
      } finally {
        if (!isCancelled) {
          setCheckingUpdate(false);
        }
      }
    }

    void checkForUpdates();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setReadyToNavigate(true);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const goToTabs = () => {
    // Only navigate if there is no blocking force update
    if (updateInfo?.forceUpdate) return;
    router.replace('/(tabs)');
  };

  useEffect(() => {
    if (!isLoading && readyToNavigate && !checkingUpdate && !updateInfo?.forceUpdate) {
      goToTabs();
    }
  }, [isLoading, readyToNavigate, checkingUpdate, updateInfo]);

  return (
    <View style={styles.container} onTouchStart={goToTabs}>
      <StatusBar style="light" />

      {/* Decorative background circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* House Logo Icon */}
        <View style={styles.logoWrap}>
          <View style={styles.roof} />
          <View style={styles.houseBody}>
            <View style={styles.door} />
          </View>
        </View>

        {/* Brand Name */}
        <Text style={styles.brandTitle}>HomeEase</Text>
        <Text style={styles.tagline}>Home Services{'\n'}Made Simple</Text>
      </Animated.View>

      {/* Bottom Loading Indicator */}
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#FFFFFF" />
      </View>

      {/* App Update Check Modal */}
      <AppUpdateModal
        visible={showUpdateModal}
        updateInfo={updateInfo}
        onDismiss={() => {
          setShowUpdateModal(false);
          if (!updateInfo?.forceUpdate) {
            goToTabs();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1479F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorCircle1: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    top: -width * 0.4,
    right: -width * 0.3,
  },
  decorCircle2: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    bottom: -width * 0.2,
    left: -width * 0.2,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  roof: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 38,
    borderRightWidth: 38,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    marginBottom: -2,
  },
  houseBody: {
    width: 58,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  door: {
    width: 22,
    height: 24,
    backgroundColor: '#0066FF',
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
  },
  brandTitle: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: 42,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
  },
});
