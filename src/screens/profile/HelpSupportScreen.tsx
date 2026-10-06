import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type HelpNavProp = StackNavigationProp<RootStackParamList, 'HelpSupport'>;

interface Props {
  navigation: HelpNavProp;
}

const FAQS = [
  {
    q: 'How do I reschedule or cancel my booking?',
    a: 'You can reschedule or cancel directly from the "My Bookings" tab by tapping "View Details" on the active booking and selecting "Reschedule" or "Cancel Booking".',
  },
  {
    q: 'Are the cleaning chemicals and tools provided by HomeEase?',
    a: 'Yes, all verified HomeEase service professionals arrive equipped with professional, eco-friendly supplies and industrial cleaning equipment.',
  },
  {
    q: 'What is HomeEase Service Assurance?',
    a: 'Every booking comes with a 30-day rework warranty. If you are not satisfied with the service quality, our team will re-assign a pro to resolve it for free.',
  },
  {
    q: 'What payment modes are accepted?',
    a: 'We accept UPI (GPay, PhonePe, Paytm), Credit & Debit cards, Net Banking, HomeEase Wallet, and Cash on Delivery.',
  },
];

export const HelpSupportScreen: React.FC<Props> = ({ navigation }) => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleCall = () => {
    Linking.openURL('tel:18004259999').catch(() => {
      Alert.alert('Phone Call', 'Call our 24/7 toll-free helpline at 1800-425-9999.');
    });
  };

  const handleChat = () => {
    Alert.alert('Live Support Chat', 'Support Agent connected: "Hello Lokesh, how can we assist you with HomeEase today?"');
  };

  const handleIssuePress = (issueType: string) => {
    Alert.alert(issueType, `We have registered your query for ${issueType}. Our support manager will contact you within 15 minutes.`);
  };

  return (
    <ScreenWrapper>
      <Header title="Help & Support" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Support Hotline / Quick Contact Cards */}
        <View style={styles.contactRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCall}
            style={[styles.contactCard, SHADOWS.card]}
          >
            <View style={styles.contactIconCircle}>
              <Ionicons name="call" size={22} color={COLORS.primaryDark} />
            </View>
            <Text style={styles.contactTitle}>Call Us</Text>
            <Text style={styles.contactSub}>24/7 Toll Free</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleChat}
            style={[styles.contactCard, SHADOWS.card]}
          >
            <View style={styles.contactIconCircle}>
              <Ionicons name="chatbubbles" size={22} color={COLORS.primaryDark} />
            </View>
            <Text style={styles.contactTitle}>Chat Support</Text>
            <Text style={styles.contactSub}>Instant reply</Text>
          </TouchableOpacity>
        </View>

        {/* Issue Categories from Prompt */}
        <Text style={styles.sectionTitle}>Common Issues</Text>
        <View style={[styles.issuesCard, SHADOWS.subtle]}>
          {[
            { id: '1', title: 'Booking & Scheduling Issues', icon: 'calendar-outline' },
            { id: '2', title: 'Payment & Refund Inquiries', icon: 'card-outline' },
            { id: '3', title: 'Cancellation & Rescheduling Help', icon: 'close-circle-outline' },
            { id: '4', title: 'Professional Conduct Feedback', icon: 'person-outline' },
          ].map((item, idx, arr) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleIssuePress(item.title)}
              style={[
                styles.issueRow,
                idx !== arr.length - 1 && styles.issueRowBorder,
              ]}
            >
              <Ionicons name={item.icon as any} size={20} color={COLORS.primaryDark} />
              <Text style={styles.issueText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs Section */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQS.map((faq, index) => {
          const isOpen = expandedFaq === index;
          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.85}
              onPress={() => setExpandedFaq(isOpen ? null : index)}
              style={[styles.faqCard, SHADOWS.subtle]}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={COLORS.primaryDark}
                />
              </View>
              {isOpen && <Text style={styles.faqAnswer}>{faq.a}</Text>}
            </TouchableOpacity>
          );
        })}
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
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  contactCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  contactIconCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  contactSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  issuesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: SPACING.lg,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  issueRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 100, 80, 0.08)',
  },
  issueText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
    flex: 1,
  },
  faqCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    flex: 1,
    paddingRight: 8,
  },
  faqAnswer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50, 100, 80, 0.1)',
    paddingTop: 8,
  },
});
