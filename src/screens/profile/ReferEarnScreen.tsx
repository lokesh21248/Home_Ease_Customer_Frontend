import React from 'react';
import { View, Text, StyleSheet, ScrollView, Share, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type ReferNavProp = StackNavigationProp<RootStackParamList, 'ReferEarn'>;

interface Props {
  navigation: ReferNavProp;
}

export const ReferEarnScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const referralCode = user?.referralCode || 'HOMEEASE200';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on HomeEase! Use my referral code ${referralCode} to get ₹200 OFF on your first home cleaning or repair service. Download HomeEase: https://homeease.app/invite/${referralCode}`,
      });
    } catch {
      Alert.alert('Sharing', 'Could not open native share sheet.');
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Refer & Earn" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gift Graphic Circle */}
        <View style={styles.giftIconContainer}>
          <View style={styles.giftCircle}>
            <Ionicons name="gift" size={48} color={COLORS.primaryDark} />
          </View>
          <Text style={styles.heroTitle}>Invite Friends, Get ₹200</Text>
          <Text style={styles.heroSubtitle}>
            Share your love for clean homes. When your friends complete their first booking, both of you get ₹200 in your HomeEase wallet!
          </Text>
        </View>

        {/* Code Box */}
        <View style={[styles.codeCard, SHADOWS.card]}>
          <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
          <Text style={styles.codeValue}>{referralCode}</Text>
        </View>

        {/* How it works */}
        <View style={[styles.howItWorksCard, SHADOWS.subtle]}>
          <Text style={styles.howHeader}>How it works</Text>

          <View style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>Share your invite link</Text>
              <Text style={styles.stepDesc}>Send your unique referral code or link to friends & family.</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>Friend books a service</Text>
              <Text style={styles.stepDesc}>They enjoy ₹200 flat discount on their first home appointment.</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>You get ₹200 credited</Text>
              <Text style={styles.stepDesc}>Instant reward added to your HomeEase wallet upon service completion.</Text>
            </View>
          </View>
        </View>

        {/* Native Share Button */}
        <Button
          title="Share Referral Code"
          onPress={handleShare}
          variant="primary"
          size="lg"
          leftIcon={<Ionicons name="share-social-outline" size={20} color={COLORS.primaryDark} />}
          style={{ marginTop: SPACING.lg }}
        />
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  giftIconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  giftCircle: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  codeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    marginVertical: SPACING.md,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 2,
    marginTop: 4,
  },
  howItWorksCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    gap: 14,
  },
  howHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepTextCol: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  stepDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
