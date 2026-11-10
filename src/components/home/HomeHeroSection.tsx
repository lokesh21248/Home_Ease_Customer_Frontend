import React, { useState } from 'react';
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
  const [activeActionDot, setActiveActionDot] = useState(0);

  // Dynamic address with fallback matching master design
  const areaTitle = address?.area || address?.city || 'Sector 55';
  const fullAddress =
    address?.formattedAddress ||
    (address?.area && address?.city
      ? `${address.area}, ${address.city}${address.pincode ? ` - ${address.pincode}` : ''}`
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
    setActiveActionDot(0);
    if (onInstantBookPress) onInstantBookPress();
    else {
      router.push({
        pathname: '/booking/date-time',
        params: { bookingType: 'INSTANT' },
      });
    }
  };

  const handleSchedule = () => {
    setActiveActionDot(1);
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
      colors={['#004BE4', '#005CE6', '#0172F5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.container, { paddingTop: Math.max(insets.top, 24) + 10 }]}
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

          {/* Notification Bell Button with Red Badge 1 */}
          <Pressable
            style={styles.bellButton}
            onPress={handleNotification}
            accessibilityRole="button"
            accessibilityLabel="Notifications (1 new)"
          >
            <Bell size={20} color="#FFFFFF" strokeWidth={2.2} />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>1</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* 2. Hero Headline & Cleaning Character */}
      <View style={styles.heroContentRow}>
        <View style={styles.heroTextCol}>
          {/* HomeEase Brand Row */}
          <View style={styles.brandRow}>
            <Ionicons name="home" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.brandName}>HomeEase</Text>
          </View>

          {/* Main 3-line Headline with 16+ highlighted in golden yellow */}
          <View style={styles.headlineWrapper}>
            <Text style={styles.heroHeading}>
              One professional,{'\n'}
              <Text style={styles.heroHighlight}>16+</Text> home cleaning{'\n'}
              services
            </Text>

            {/* Stylized Golden Curved Accent Swoosh under services */}
            <View style={styles.swooshArc} />
          </View>
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
          <View style={styles.cardLeftCol}>
            <Zap size={28} color="#0052FF" strokeWidth={2.2} style={styles.cardHeaderIcon} />
            <Text style={styles.cardTitle}>
              {'Book Instant\nService'}
            </Text>
            {/* ⚡ 10 mins Pill */}
            <View style={styles.instantPill}>
              <Text style={styles.instantLightning}>⚡</Text>
              <Text style={styles.instantPillText}>10 mins</Text>
            </View>
          </View>

          {/* Right 3D Stopwatch Graphic with "10 mins" */}
          <View style={styles.stopwatchGraphic}>
            <View style={styles.stopwatchRing}>
              <View style={styles.stopwatchPlunger} />
              <View style={styles.stopwatchDial}>
                <Text style={styles.stopwatchTimeText}>10</Text>
                <Text style={styles.stopwatchSubText}>mins</Text>
              </View>
            </View>
          </View>
        </Pressable>

        {/* Right Card: Schedule for Later */}
        <Pressable
          style={({ pressed }) => [styles.quickCard, pressed && styles.cardPressed]}
          onPress={handleSchedule}
          accessibilityRole="button"
          accessibilityLabel="Schedule for Later today at 2 pm"
        >
          <View style={styles.cardLeftCol}>
            <Calendar size={28} color="#0052FF" strokeWidth={2.2} style={styles.cardHeaderIcon} />
            <Text style={styles.cardTitle}>
              {'Schedule for\nLater'}
            </Text>
            {/* Today, 2 pm Pill */}
            <View style={styles.schedulePill}>
              <Text style={styles.schedulePillText}>Today, 2 pm</Text>
            </View>
          </View>

          {/* Right 3D Calendar + Clock Graphic */}
          <View style={styles.calendarGraphic}>
            <View style={styles.calendarSheet}>
              <View style={styles.calendarTopBar} />
              <View style={styles.calendarGrid}>
                <View style={styles.calendarDot} />
                <View style={styles.calendarDot} />
                <View style={styles.calendarDot} />
              </View>
            </View>
            <View style={styles.calendarClock}>
              <Ionicons name="time-outline" size={18} color="#0052FF" />
            </View>
          </View>
        </Pressable>
      </View>

      {/* 4. Action Cards 3 Pagination Dots */}
      <View style={styles.actionPaginationRow}>
        <View style={[styles.actionDot, activeActionDot === 0 && styles.actionActiveDot]} />
        <View style={[styles.actionDot, activeActionDot === 1 && styles.actionActiveDot]} />
        <View style={[styles.actionDot, activeActionDot === 2 && styles.actionActiveDot]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 14,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
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
    color: 'rgba(255, 255, 255, 0.88)',
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
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#EF4444',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#004BE4',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    position: 'relative',
    minHeight: 146,
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 135,
    zIndex: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headlineWrapper: {
    position: 'relative',
  },
  heroHeading: {
    fontSize: 22.5,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28.5,
    letterSpacing: -0.4,
  },
  heroHighlight: {
    color: '#FACC15', // Vibrant golden yellow
    fontWeight: '900',
  },
  swooshArc: {
    marginTop: 4,
    width: 82,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FACC15', // Golden yellow swoop under services
  },
  heroImageWrapper: {
    position: 'absolute',
    right: 4,
    top: -12,
    width: 178,
    height: 156,
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
    marginTop: 8,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  cardLeftCol: {
    flex: 1,
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  cardHeaderIcon: {
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  instantPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  instantLightning: {
    fontSize: 10.5,
  },
  instantPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0052FF',
  },
  schedulePill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  schedulePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0052FF',
  },
  stopwatchGraphic: {
    width: 46,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopwatchRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 2.5,
    borderColor: '#0052FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stopwatchPlunger: {
    position: 'absolute',
    top: -5,
    width: 8,
    height: 4,
    backgroundColor: '#0052FF',
    borderRadius: 2,
  },
  stopwatchDial: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopwatchTimeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 13,
  },
  stopwatchSubText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0052FF',
    lineHeight: 9,
  },
  calendarGraphic: {
    width: 48,
    height: 48,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarSheet: {
    width: 40,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0052FF',
    overflow: 'hidden',
  },
  calendarTopBar: {
    height: 8,
    backgroundColor: '#0052FF',
    width: '100%',
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
  },
  calendarClock: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0052FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPaginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  actionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  actionActiveDot: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },
});
