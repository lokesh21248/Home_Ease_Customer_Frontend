import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Zap, Calendar, MapPin, ChevronDown, Bell } from 'lucide-react-native';
import { useUserLocation } from '../../hooks/useUserLocation';

interface HomeHeroSectionProps {
  onLocationPress?: () => void;
  onNotificationPress?: () => void;
  onInstantBookPress?: () => void;
  onSchedulePress?: () => void;
}

export function HomeHeroSection({
  onLocationPress,
  onNotificationPress,
  onInstantBookPress,
  onSchedulePress,
}: HomeHeroSectionProps) {
  const insets = useSafeAreaInsets();
  const { address } = useUserLocation();

  // Dynamic address with fallback to reference screenshot ("Sector 55, Gurugram, Haryana, India")
  const areaTitle = address?.area || 'Sector 55';
  const fullAddress =
    address?.formattedAddress ||
    (address?.area && address?.city
      ? `${address.area}, ${address.city}, India`
      : 'Sector 55, Gurugram, Haryana, India');

  const handleLocation = () => {
    if (onLocationPress) onLocationPress();
    else router.push('/location/select');
  };

  const handleNotification = () => {
    if (onNotificationPress) onNotificationPress();
    else router.push('/(tabs)/notifications');
  };

  const handleInstant = () => {
    if (onInstantBookPress) onInstantBookPress();
    else {
      router.push({
        pathname: '/booking/date-time',
        params: { bookingType: 'INSTANT' },
      });
    }
  };

  const handleSchedule = () => {
    if (onSchedulePress) onSchedulePress();
    else {
      router.push({
        pathname: '/booking/date-time',
        params: { bookingType: 'SCHEDULED' },
      });
    }
  };

  return (
    <LinearGradient
      colors={['#074BD4', '#004ECC', '#005CE6', '#0172F5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.container, { paddingTop: Math.max(insets.top + 6, 38) }]}
    >
      {/* 1. Top Location & Action Bar */}
      <View style={styles.topBar}>
        {/* Left: Location Pin & Address */}
        <Pressable
          style={styles.locationContainer}
          onPress={handleLocation}
          accessibilityRole="button"
          accessibilityLabel={`Selected location: ${areaTitle}`}
        >
          <View style={styles.locationPinCircle}>
            <MapPin size={22} color="#FFFFFF" fill="#FFFFFF" />
          </View>
          <View style={styles.locationTextCol}>
            <View style={styles.locationTitleRow}>
              <Text style={styles.locationTitle} numberOfLines={1}>
                {areaTitle}
              </Text>
              <ChevronDown size={17} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.locationSub} numberOfLines={1}>
              {fullAddress}
            </Text>
          </View>
        </Pressable>

        {/* Right: Earn ₹200 & Notification Bell */}
        <View style={styles.rightActionsRow}>
          {/* Earn ₹200 Capsule Button */}
          <Pressable
            style={styles.earnButton}
            onPress={() => router.push('/profile/wallet')}
            accessibilityRole="button"
            accessibilityLabel="Earn ₹200 wallet referral"
          >
            {/* 3D Gold Coins Graphic */}
            <View style={styles.coinGraphic}>
              <View style={styles.coinBack}>
                <Text style={styles.coinBackText}>₹</Text>
              </View>
              <View style={styles.coinFront}>
                <Text style={styles.coinFrontText}>₹</Text>
              </View>
            </View>
            <View style={styles.earnTextCol}>
              <Text style={styles.earnLabel}>Earn</Text>
              <Text style={styles.earnAmount}>₹200</Text>
            </View>
          </Pressable>

          {/* Notification Bell Circle */}
          <Pressable
            style={styles.bellButton}
            onPress={handleNotification}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color="#FFFFFF" fill="#FFFFFF" />
            <View style={styles.unreadDot} />
          </Pressable>
        </View>
      </View>

      {/* 2. Hero Headline & Cleaning Character */}
      <View style={styles.heroContentRow}>
        <View style={styles.heroTextCol}>
          {/* HomeEase Brand Row */}
          <View style={styles.brandRow}>
            <Ionicons name="home" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.brandName}>HomeEase</Text>
          </View>

          {/* Main 3-line Headline */}
          <Text style={styles.heroHeading}>
            {'One professional,\n16+ home cleaning\nservices'}
          </Text>
        </View>

        {/* Hero Cleaning Character Illustration */}
        <View style={styles.heroImageWrapper}>
          <Image
            source={require('../../../assets/images/hero_cleaner.png')}
            style={styles.heroImage}
            contentFit="contain"
            transition={150}
          />
        </View>
      </View>

      {/* 3. Quick Action Cards (Book Instant Service & Schedule for Later) */}
      <View style={styles.quickCardsRow}>
        {/* Left Card: Book Instant Service */}
        <Pressable
          style={({ pressed }) => [styles.quickCard, pressed && styles.cardPressed]}
          onPress={handleInstant}
          accessibilityRole="button"
          accessibilityLabel="Book Instant Service in 10 mins"
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              {'Book Instant\nService'}
            </Text>
            <Zap size={32} color="#0284C7" strokeWidth={1.8} style={styles.cardIcon} />
          </View>

          {/* ⚡ 10 mins Pill */}
          <View style={styles.instantPill}>
            <Text style={styles.instantLightning}>⚡</Text>
            <Text style={styles.instantPillText}>10 mins</Text>
          </View>
        </Pressable>

        {/* Right Card: Schedule for Later */}
        <Pressable
          style={({ pressed }) => [styles.quickCard, pressed && styles.cardPressed]}
          onPress={handleSchedule}
          accessibilityRole="button"
          accessibilityLabel="Schedule for Later today at 2 pm"
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              {'Schedule for\nLater'}
            </Text>
            <Calendar size={32} color="#2563EB" strokeWidth={1.8} style={styles.cardIcon} />
          </View>

          {/* Today, 2 pm Pill */}
          <View style={styles.schedulePill}>
            <Text style={styles.schedulePillText}>Today, 2 pm</Text>
          </View>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  locationPinCircle: {
    marginRight: 6,
  },
  locationTextCol: {
    flex: 1,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  locationSub: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginTop: 1,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earnButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  coinGraphic: {
    width: 22,
    height: 20,
    position: 'relative',
    justifyContent: 'center',
  },
  coinBack: {
    position: 'absolute',
    left: 0,
    top: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    borderColor: '#FDE68A',
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinBackText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#78350F',
  },
  coinFront: {
    position: 'absolute',
    left: 7,
    top: 0,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#FBBF24',
    borderColor: '#FEF08A',
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  coinFrontText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#92400E',
  },
  earnTextCol: {
    justifyContent: 'center',
  },
  earnLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 11,
  },
  earnAmount: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 14,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#0052FF',
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    position: 'relative',
    minHeight: 142,
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 140,
    zIndex: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  heroHeading: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 29,
    letterSpacing: -0.4,
  },
  heroImageWrapper: {
    position: 'absolute',
    right: 6,
    top: -12,
    width: 175,
    height: 155,
    zIndex: 1,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  quickCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 6,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    minHeight: 96,
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18.5,
    letterSpacing: -0.2,
  },
  cardIcon: {
    marginTop: -2,
    marginRight: -2,
  },
  instantPill: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 8,
  },
  instantLightning: {
    fontSize: 11,
  },
  instantPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  schedulePill: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  schedulePillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284C7',
  },
});
