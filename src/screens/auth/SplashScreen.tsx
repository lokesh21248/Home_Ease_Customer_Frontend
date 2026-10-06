import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { AuthStackParamList, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';

type SplashScreenNavProp = CompositeNavigationProp<
  StackNavigationProp<AuthStackParamList, 'Splash'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: SplashScreenNavProp;
}

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.9));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (!isLoading) {
        if (isAuthenticated) {
          const rootNav = navigation.getParent<StackNavigationProp<RootStackParamList>>();
          if (rootNav) {
            rootNav.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'HomeTab' } }],
            });
          } else {
            navigation.navigate('MainTabs', { screen: 'HomeTab' });
          }
        } else {
          navigation.replace('Login');
        }
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, navigation, fadeAnim, scaleAnim]);

  return (
    <ScreenWrapper style={styles.container}>
      {/* Background Ambience Image */}
      <View style={styles.imageBackgroundWrapper}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay} />
      </View>

      <Animated.View
        style={[
          styles.contentBox,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Brand Roof / Home Icon from Image 1 */}
        <View style={styles.logoBadge}>
          <Ionicons name="home" size={44} color={COLORS.primaryDark} />
        </View>

        <Text style={styles.brandTitle}>HomeEase</Text>
        <Text style={styles.tagline}>Trusted home services at your fingertips</Text>

        <View style={styles.loaderRow}>
          <ActivityIndicator size="small" color={COLORS.primaryDark} />
          <Text style={styles.loaderText}>Making homes happier...</Text>
        </View>
      </Animated.View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBackgroundWrapper: {
    ...StyleSheet.absoluteFill,
    opacity: 0.28,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.bgGradientMid,
  },
  contentBox: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    zIndex: 10,
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.accent, // Warm honey yellow from Image 2
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: SPACING.lg,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: SPACING.xxl,
    maxWidth: 260,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  loaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginLeft: 8,
  },
});
