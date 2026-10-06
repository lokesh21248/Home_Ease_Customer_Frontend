import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Button } from '../../components/common/Button';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { sendOtp } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validate Indian 10-digit phone number
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const isValidPhone = cleanNumber.length === 10 && /^[6-9]\d{9}$/.test(cleanNumber);

  const handleContinue = async () => {
    if (!isValidPhone) {
      setError('Please enter a valid 10-digit mobile number starting with 6-9');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const fullPhone = `+91 ${cleanNumber.slice(0, 5)} ${cleanNumber.slice(5)}`;
      await sendOtp(fullPhone);
      navigation.navigate('Otp', { phone: fullPhone });
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Could not send OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Top Header Row with Help */}
          <View style={styles.topBar}>
            <View style={{ width: 40 }} />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Alert.alert('Help & Support', 'For assistance logging in, please call our 24/7 hotline at 1800-425-9999.')}
              style={styles.helpButton}
            >
              <Text style={styles.helpText}>Help</Text>
            </TouchableOpacity>
          </View>

          {/* Heading */}
          <View style={styles.headerBox}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Enter your mobile number to continue</Text>
          </View>

          {/* Phone Input Box */}
          <View style={styles.inputContainer}>
            <View style={styles.countryCodeBox}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.countryCode}>+91</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} style={{ marginLeft: 4 }} />
            </View>
            <View style={styles.dividerVertical} />
            <TextInput
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (error) setError('');
              }}
              placeholder="Phone number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={10}
              style={styles.phoneInput}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Continue Button */}
          <Button
            title="Continue"
            onPress={handleContinue}
            disabled={!isValidPhone}
            loading={loading}
            variant="primary"
            size="lg"
            style={styles.continueBtn}
          />

          {/* Divider */}
          <View style={styles.orDividerRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          {/* Create Account Link */}
          <View style={styles.createAccountRow}>
            <Text style={styles.newToAppText}>New to the app?</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const fullPhone = cleanNumber.length === 10 ? `+91 ${cleanNumber}` : '+91 98765 43210';
                navigation.navigate('CreateAccount', { phone: fullPhone });
              }}
            >
              <Text style={styles.createLinkText}>Create new account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.base,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  helpButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  helpText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  headerBox: {
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(50, 100, 80, 0.15)',
    height: 56,
    paddingHorizontal: 14,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 18,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  dividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(50, 100, 80, 0.15)',
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryDark,
    height: '100%',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    marginLeft: 4,
  },
  continueBtn: {
    marginTop: SPACING.xl,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xxl,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(50, 100, 80, 0.12)',
  },
  orText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  createAccountRow: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  newToAppText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  createLinkText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textDecorationLine: 'underline',
  },
});
