import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { trackingApi } from '../../api/trackingApi';
import { TrackingData } from '../../types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { Rating } from '../../components/common/Rating';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type TrackingRouteProp = RouteProp<RootStackParamList, 'LiveTracking'>;
type TrackingNavProp = StackNavigationProp<RootStackParamList, 'LiveTracking'>;

interface Props {
  route: TrackingRouteProp;
  navigation: TrackingNavProp;
}

export const LiveTrackingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [eta, setEta] = useState<number>(8);

  const loadTracking = async () => {
    try {
      const data = await trackingApi.getLiveTracking(bookingId);
      if (data) {
        setTracking(data);
      }
    } catch (e) {
      console.warn('Failed to refresh tracking:', e);
    }
  };

  useEffect(() => {
    loadTracking();
    const interval = setInterval(() => {
      setEta((prev) => (prev > 1 ? prev - 1 : 1));
      loadTracking();
    }, 6000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const handleCall = () => {
    Alert.alert('Call Professional', `Dialing Raj Kumar (${tracking?.professional.phone || '+91 98765 12345'})...`, [
      { text: 'Cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${tracking?.professional.phone || '+919876512345'}`) },
    ]);
  };

  const handleChat = () => {
    Alert.alert('Live Chat', 'Chat session with Raj Kumar connected. "Hello, I am reaching your location shortly!"');
  };

  return (
    <ScreenWrapper>
      <Header title="Tracking" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Header matching Image 1 Screen 12 & Backend stages */}
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>
            {tracking?.status === 'SEARCHING_WORKER'
              ? 'Searching nearby professionals...'
              : tracking?.status === 'ACCEPTED'
              ? 'Professional assigned & on the way'
              : tracking?.status === 'IN_PROGRESS'
              ? 'Service in progress'
              : tracking?.status === 'COMPLETED'
              ? 'Service completed'
              : tracking?.status === 'CANCELLED'
              ? 'Booking cancelled'
              : 'Professional on the way'}
          </Text>
          <Text style={styles.etaText}>
            {tracking?.status === 'SEARCHING_WORKER'
              ? 'Connecting you with the best verified partner'
              : tracking?.status === 'IN_PROGRESS'
              ? 'Professional has unlocked the job with your PIN'
              : tracking?.status === 'COMPLETED'
              ? 'Thank you for choosing HomeEase'
              : `Arriving in ${eta} minutes`}
          </Text>
        </View>

        {/* 4-Digit Security PIN Card (Backend Critical UI Requirement) */}
        <View style={[styles.pinSecurityCard, SHADOWS.card]}>
          <View style={styles.pinHeaderRow}>
            <View style={styles.pinIconCircle}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primaryDark} />
            </View>
            <View style={styles.pinHeaderCol}>
              <Text style={styles.pinHeaderTitle}>4-Digit Security PIN</Text>
              <Text style={styles.pinHeaderSub}>Share this code when the worker arrives to start the job</Text>
            </View>
          </View>
          <View style={styles.pinBoxesRow}>
            {(tracking?.pinCode || '4821').split('').map((char, index) => (
              <View key={index} style={styles.pinDigitBox}>
                <Text style={styles.pinDigitText}>{char}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Map Visualization Card */}
        <View style={[styles.mapContainer, SHADOWS.card]}>
          <View style={styles.mapCanvas}>
            {/* Visual Route Grid & Road */}
            <View style={styles.roadDiagonal} />
            <View style={styles.roadHorizontal} />

            {/* Customer Location Pin */}
            <View style={styles.customerPinBox}>
              <View style={styles.pinCircleUser}>
                <Ionicons name="home" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.pinLabel}>Your Home</Text>
            </View>

            {/* Professional Moving Marker */}
            <View style={styles.proMarkerBox}>
              <View style={styles.pinCirclePro}>
                <Ionicons name="bicycle" size={18} color={COLORS.primaryDark} />
              </View>
            </View>

            {/* Distance / ETA Floating Pill from Image 1 Screen 12 */}
            <View style={[styles.floatingEtaPill, SHADOWS.card]}>
              <Text style={styles.floatingEtaTitle}>{eta} min</Text>
              <Text style={styles.floatingEtaSub}>1.2 km</Text>
            </View>
          </View>
        </View>

        {/* Professional Details Card matching Image 1 Screen 12 */}
        {tracking?.professional && (
          <View style={[styles.proCard, SHADOWS.card]}>
            <View style={styles.proInfoRow}>
              <Image source={{ uri: tracking.professional.avatarUrl }} style={styles.proAvatar} />
              <View style={styles.proDetails}>
                <Text style={styles.proName}>{tracking.workerName || tracking.professional.name}</Text>
                <View style={styles.proRatingRow}>
                  <Rating
                    rating={tracking.professional.rating}
                    reviewsCount={tracking.professional.reviewsCount}
                    size={13}
                  />
                </View>
                <Text style={styles.proRole}>{tracking.professional.role}</Text>
              </View>
            </View>

            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCall}
                style={[styles.contactBtn, styles.callBtn]}
              >
                <Ionicons name="call-outline" size={18} color={COLORS.primaryDark} />
                <Text style={styles.contactBtnText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleChat}
                style={[styles.contactBtn, styles.chatBtn]}
              >
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.primaryDark} />
                <Text style={styles.contactBtnText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Live Timeline Status */}
        <View style={[styles.timelineCard, SHADOWS.subtle]}>
          <Text style={styles.timelineHeader}>Service Timeline</Text>

          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, styles.stepCompleted]}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Booking Confirmed</Text>
              <Text style={styles.stepDesc}>10:00 AM</Text>
            </View>
          </View>
          <View style={styles.stepLineActive} />

          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, styles.stepCompleted]}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Professional Assigned</Text>
              <Text style={styles.stepDesc}>Raj Kumar allocated</Text>
            </View>
          </View>
          <View style={styles.stepLineActive} />

          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <View style={styles.stepInnerDot} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>On The Way</Text>
              <Text style={styles.stepDesc}>ETA ~{eta} minutes</Text>
            </View>
          </View>
          <View style={styles.stepLinePending} />

          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, styles.stepPending]} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Service In Progress</Text>
              <Text style={styles.stepDesc}>Estimated duration: 2 hrs</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xs,
    paddingBottom: 40,
  },
  statusBox: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  etaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  pinSecurityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  pinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: 10,
  },
  pinIconCircle: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinHeaderCol: {
    flex: 1,
  },
  pinHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  pinHeaderSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  pinBoxesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  pinDigitBox: {
    width: 46,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(235, 245, 240, 0.85)',
    borderWidth: 1.5,
    borderColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDigitText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 1,
  },
  mapContainer: {
    height: 240,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    backgroundColor: '#D6ECE0',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: SPACING.md,
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roadDiagonal: {
    position: 'absolute',
    width: 220,
    height: 6,
    backgroundColor: '#2D72D9',
    borderRadius: 3,
    transform: [{ rotate: '-35deg' }],
    top: 110,
    left: 70,
  },
  roadHorizontal: {
    position: 'absolute',
    width: 140,
    height: 6,
    backgroundColor: '#2D72D9',
    borderRadius: 3,
    top: 55,
    left: 20,
  },
  customerPinBox: {
    position: 'absolute',
    top: 30,
    left: 40,
    alignItems: 'center',
  },
  pinCircleUser: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  proMarkerBox: {
    position: 'absolute',
    bottom: 50,
    right: 70,
    alignItems: 'center',
  },
  pinCirclePro: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  floatingEtaPill: {
    position: 'absolute',
    top: 24,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  floatingEtaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  floatingEtaSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  proCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: SPACING.md,
  },
  proInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proAvatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  proDetails: {
    flex: 1,
    marginLeft: 14,
  },
  proName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  proRatingRow: {
    marginVertical: 2,
  },
  proRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(235, 245, 240, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(50, 100, 80, 0.15)',
    gap: 6,
  },
  callBtn: {},
  chatBtn: {},
  contactBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  timelineCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  timelineHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepCompleted: {
    backgroundColor: COLORS.success,
  },
  stepActive: {
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
  },
  stepInnerDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryDark,
  },
  stepPending: {
    backgroundColor: 'rgba(200, 215, 208, 0.5)',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  stepDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  stepLineActive: {
    width: 2,
    height: 18,
    backgroundColor: COLORS.success,
    marginLeft: 10,
    marginVertical: 2,
  },
  stepLinePending: {
    width: 2,
    height: 18,
    backgroundColor: 'rgba(200, 215, 208, 0.5)',
    marginLeft: 10,
    marginVertical: 2,
  },
});
