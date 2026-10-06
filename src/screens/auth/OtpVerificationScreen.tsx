import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

type OtpScreenRouteProp = RouteProp<AuthStackParamList, 'Otp'>;
type OtpScreenNavProp = CompositeNavigationProp<
  StackNavigationProp<AuthStackParamList, 'Otp'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  route: OtpScreenRouteProp;
  navigation: OtpScreenNavProp;
}

export const OtpVerificationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { verifyOtp, sendOtp } = useAuth();
  const phone = route.params?.phone || '+91 98765 43210';

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState<number>(28);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    setError('');

    // Handle full paste (e.g. user pasted 6 digits)
    if (text.length > 1) {
      const digits = text.replace(/[^0-9]/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-advance
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      setLoading(true);
      await sendOtp(phone);
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('OTP Sent', 'A fresh 6-digit code has been sent.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the OTP code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await verifyOtp(code);
      if (result.isNewUser) {
        navigation.navigate('CreateAccount', { phone });
      } else {
        const rootNav = navigation.getParent<StackNavigationProp<RootStackParamList>>();
        if (rootNav) {
          rootNav.reset({
            index: 0,
            routes: [{ name: 'MainTabs', params: { screen: 'HomeTab' } }],
          });
        } else {
          navigation.navigate('MainTabs', { screen: 'HomeTab' });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const isComplete = otp.every((digit) => digit.length > 0);

  return (
    <ScreenWrapper>
      <Header onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>
            We have sent a 6-digit OTP to <Text style={styles.phoneHighlight}>{phone}</Text>
          </Text>

          {/* 6 Digit Input Boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={index === 0}
                selectTextOnFocus
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : undefined,
                  error ? styles.otpBoxError : undefined,
                ]}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Resend Timer & Change Number */}
          <View style={styles.metaRow}>
            {timer > 0 ? (
              <Text style={styles.timerText}>Resend OTP in {timer}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendActiveText}>Resend OTP</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.changeNumberText}>Change number</Text>
            </TouchableOpacity>
          </View>

          {/* Verify Button */}
          <Button
            title="Verify"
            onPress={handleVerify}
            disabled={!isComplete}
            loading={loading}
            variant="primary"
            size="lg"
            style={styles.verifyBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  phoneHighlight: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(50, 100, 80, 0.18)',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  otpBoxFilled: {
    borderColor: COLORS.primaryLight,
    backgroundColor: '#FFFFFF',
  },
  otpBoxError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  metaRow: {
    alignItems: 'center',
    marginVertical: SPACING.base,
    gap: 12,
  },
  timerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  resendActiveText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textDecorationLine: 'underline',
  },
  changeNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
    textDecorationLine: 'underline',
  },
  verifyBtn: {
    marginTop: SPACING.lg,
  },
});
