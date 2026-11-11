import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserLocation } from '../../hooks/useUserLocation';

const { width: SCREEN_W } = Dimensions.get('window');

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
    else router.push({ pathname: '/booking/date-time', params: { bookingType: 'INSTANT' } });
  };

  const handleSchedule = () => {
    setActiveActionDot(1);
    if (onSchedulePress) onSchedulePress();
    else router.push({ pathname: '/booking/date-time', params: { bookingType: 'SCHEDULED' } });
  };

  return (
    <LinearGradient
      colors={['#0047D0', '#0057E0', '#1A6EF5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}
    >
      {/* ── 1. TOP BAR: Location + Earn + Bell ── */}
      <View style={styles.topBar}>
        {/* Location */}
        <Pressable
          style={styles.locationRow}
          onPress={handleLocation}
          accessibilityRole="button"
          accessibilityLabel={`Location: ${areaTitle}`}
        >
          {/* Pin icon */}
          <View style={styles.pinIconWrap}>
            <Ionicons name="location-sharp" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.locationTextWrap}>
            <View style={styles.locationTitleRow}>
              <Text style={styles.locationTitle} numberOfLines={1}>
                {areaTitle}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </View>
            <Text style={styles.locationSub} numberOfLines={1}>
              {fullAddress}
            </Text>
          </View>
        </Pressable>

        {/* Right: Earn + Bell */}
        <View style={styles.rightActions}>
          {/* Earn ₹200 pill */}
          <Pressable
            style={styles.earnPill}
            onPress={() => router.push('/profile/wallet')}
            accessibilityRole="button"
            accessibilityLabel="Earn ₹200"
          >
            {/* Stacked gold coins */}
            <View style={styles.coinsWrap}>
              <View style={styles.coinB} />
              <View style={styles.coinF}>
                <Text style={styles.coinText}>₹</Text>
              </View>
            </View>
            <View>
              <Text style={styles.earnLabel}>Earn</Text>
              <Text style={styles.earnAmt}>₹200</Text>
            </View>
          </Pressable>

          {/* Bell */}
          <Pressable
            style={styles.bellBtn}
            onPress={handleNotification}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications" size={19} color="#FFFFFF" />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>1</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── 2. HERO CONTENT: Text + Woman image ── */}
      <View style={styles.heroRow}>
        {/* Left: brand + headline */}
        <View style={styles.heroLeft}>
          {/* HomeEase brand */}
          <View style={styles.brandRow}>
            <Ionicons name="home" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.brandText}>HomeEase</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>
            {'One professional,\n'}
            <Text style={styles.highlightText}>16+</Text>
            {' home cleaning\nservices'}
          </Text>

          {/* Golden swoosh underline */}
          <View style={styles.swoosh} />
        </View>

        {/* Right: hero woman image — absolute so it overflows nicely */}
        <Image
          source={require('../../../assets/images/hero_cleaner.png')}
          style={styles.heroImage}
          contentFit="contain"
          transition={150}
        />
      </View>

      {/* ── 3. QUICK ACTION CARDS ── */}
      <View style={styles.cardsRow}>
        {/* Left card: Book Instant Service */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={handleInstant}
          accessibilityRole="button"
          accessibilityLabel="Book Instant Service in 10 mins"
        >
          <View style={styles.cardInner}>
            {/* Zap icon */}
            <Ionicons name="flash" size={26} color="#0047D0" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>{'Book Instant\nService'}</Text>
            {/* ⚡ 10 mins pill */}
            <View style={styles.instantPill}>
              <Text style={styles.pillEmoji}>⚡</Text>
              <Text style={styles.pillTxt}>10 mins</Text>
            </View>
          </View>

          {/* Stopwatch graphic */}
          <View style={styles.stopwatchWrap}>
            <View style={styles.stopwatchTop} />
            <View style={styles.stopwatch}>
              <Text style={styles.swTime}>10</Text>
              <Text style={styles.swUnit}>mins</Text>
            </View>
          </View>
        </Pressable>

        {/* Right card: Schedule for Later */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={handleSchedule}
          accessibilityRole="button"
          accessibilityLabel="Schedule for Later today at 2 pm"
        >
          <View style={styles.cardInner}>
            {/* Calendar icon */}
            <Ionicons name="calendar" size={26} color="#0047D0" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>{'Schedule for\nLater'}</Text>
            {/* Today 2 pm pill */}
            <View style={styles.schedulePill}>
              <Text style={styles.pillTxt}>Today, 2 pm</Text>
            </View>
          </View>

          {/* Calendar + Clock graphic */}
          <View style={styles.calGraphicWrap}>
            {/* Calendar sheet */}
            <View style={styles.calSheet}>
              <View style={styles.calHeader} />
              {/* Grid of dots */}
              <View style={styles.calDotRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.calDot} />
                ))}
              </View>
              <View style={styles.calDotRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.calDot} />
                ))}
              </View>
            </View>
            {/* Clock badge */}
            <View style={styles.clockBadge}>
              <Ionicons name="time" size={16} color="#0047D0" />
            </View>
          </View>
        </Pressable>
      </View>

      {/* ── 4. PAGINATION DOTS ── */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.dot, activeActionDot === i && styles.dotActive]}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    // No border radius — blends directly into page
  },

  /* ─── Top bar ─── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  pinIconWrap: {
    marginRight: 5,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  locationSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 1,
  },

  /* ─── Right actions ─── */
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  earnPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 5,
  },
  coinsWrap: {
    width: 24,
    height: 20,
    position: 'relative',
  },
  coinB: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#D97706',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  coinF: {
    position: 'absolute',
    left: 7,
    top: 0,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#FBBF24',
    borderWidth: 1.2,
    borderColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#78350F',
  },
  earnLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 11,
  },
  earnAmt: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 14,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0047D0',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },

  /* ─── Hero content row ─── */
  heroRow: {
    flexDirection: 'row',
    paddingLeft: 14,
    paddingRight: 0,
    alignItems: 'flex-end',
    minHeight: 148,
    position: 'relative',
  },
  heroLeft: {
    flex: 1,
    paddingRight: 8,
    paddingBottom: 4,
    zIndex: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  brandText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  headline: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  highlightText: {
    color: '#FACC15',
    fontWeight: '900',
  },
  swoosh: {
    marginTop: 5,
    width: 76,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FACC15',
  },
  heroImage: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: SCREEN_W * 0.44,
    height: 165,
  },

  /* ─── Quick action cards ─── */
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 10,
    marginTop: 14,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
    elevation: 4,
    shadowColor: '#00008B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  cardPressed: {
    opacity: 0.93,
    transform: [{ scale: 0.985 }],
  },
  cardInner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  cardIcon: {
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 16.5,
    letterSpacing: -0.2,
  },
  instantPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    marginTop: 5,
  },
  pillEmoji: {
    fontSize: 10,
  },
  pillTxt: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0047D0',
  },
  schedulePill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 5,
  },

  /* ─── Stopwatch graphic ─── */
  stopwatchWrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  stopwatchTop: {
    width: 10,
    height: 5,
    backgroundColor: '#0047D0',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginBottom: 1,
  },
  stopwatch: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF4FF',
    borderWidth: 3,
    borderColor: '#0047D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swTime: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 15,
  },
  swUnit: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#0047D0',
    lineHeight: 10,
  },

  /* ─── Calendar + Clock graphic ─── */
  calGraphicWrap: {
    width: 52,
    height: 52,
    position: 'relative',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  calSheet: {
    width: 42,
    height: 42,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0047D0',
    overflow: 'hidden',
  },
  calHeader: {
    height: 10,
    backgroundColor: '#0047D0',
    width: '100%',
  },
  calDotRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  calDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
  },
  clockBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0047D0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── Dots ─── */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
});
