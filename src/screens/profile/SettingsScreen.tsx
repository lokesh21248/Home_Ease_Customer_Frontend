import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type SettingsNavProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsNavProp;
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [offersEnabled, setOffersEnabled] = useState(true);
  const [language, setLanguage] = useState('English');

  const handleLanguageChange = () => {
    Alert.alert('Select Language', 'Choose your preferred display language', [
      { text: 'English', onPress: () => setLanguage('English') },
      { text: 'हिंदी (Hindi)', onPress: () => setLanguage('Hindi') },
      { text: 'తెలుగు (Telugu)', onPress: () => setLanguage('Telugu') },
      { text: 'தமிழ் (Tamil)', onPress: () => setLanguage('Tamil') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScreenWrapper>
      <Header title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Notifications Group */}
        <Text style={styles.sectionHeader}>Notifications & Alerts</Text>
        <View style={[styles.card, SHADOWS.subtle]}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Real-time alerts for booking and arrival status</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#D0DCD6', true: COLORS.primaryDark }}
              thumbColor={pushEnabled ? COLORS.accent : '#F4F3F4'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>SMS Notifications</Text>
              <Text style={styles.settingDesc}>Receive OTP and booking receipt via SMS</Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              trackColor={{ false: '#D0DCD6', true: COLORS.primaryDark }}
              thumbColor={smsEnabled ? COLORS.accent : '#F4F3F4'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Promotional Offers</Text>
              <Text style={styles.settingDesc}>Special discounts and seasonal hygiene packages</Text>
            </View>
            <Switch
              value={offersEnabled}
              onValueChange={setOffersEnabled}
              trackColor={{ false: '#D0DCD6', true: COLORS.primaryDark }}
              thumbColor={offersEnabled ? COLORS.accent : '#F4F3F4'}
            />
          </View>
        </View>

        {/* Preferences Group */}
        <Text style={styles.sectionHeader}>Preferences & Region</Text>
        <View style={[styles.card, SHADOWS.subtle]}>
          <TouchableOpacity onPress={handleLanguageChange} style={styles.clickableRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>App Language</Text>
              <Text style={styles.settingDesc}>{language}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={() => Alert.alert('Location Services', 'HomeEase uses GPS location to show nearest certified professionals.')}
            style={styles.clickableRow}
          >
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Location Permissions</Text>
              <Text style={styles.settingDesc}>Enabled (Precise)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Legal & About Group */}
        <Text style={styles.sectionHeader}>About & Legal</Text>
        <View style={[styles.card, SHADOWS.subtle]}>
          <TouchableOpacity
            onPress={() => Alert.alert('Privacy Policy', 'HomeEase is committed to protecting your privacy. Your personal information and addresses are securely encrypted and never shared.')}
            style={styles.clickableRow}
          >
            <Text style={styles.settingTitle}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={() => Alert.alert('Terms & Conditions', 'Read complete terms of service and professional service guarantees.')}
            style={styles.clickableRow}
          >
            <Text style={styles.settingTitle}>Terms & Conditions</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <Text style={styles.settingTitle}>App Version</Text>
            <Text style={styles.versionText}>1.0.0 (Build 2026.09)</Text>
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  settingDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  versionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(50, 100, 80, 0.08)',
  },
});
