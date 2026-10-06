import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS, SPACING } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type CreateAccountRouteProp = RouteProp<AuthStackParamList, 'CreateAccount'>;
type CreateAccountNavProp = CompositeNavigationProp<
  StackNavigationProp<AuthStackParamList, 'CreateAccount'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  route: CreateAccountRouteProp;
  navigation: CreateAccountNavProp;
}

export const CreateAccountScreen: React.FC<Props> = ({ navigation }) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let valid = true;
    const cleanName = fullName.trim();

    if (!cleanName) {
      setNameError('Full name is required');
      valid = false;
    } else if (!/^[a-zA-Z\s]{2,50}$/.test(cleanName)) {
      setNameError('Please enter a valid name (letters only, min 2 characters)');
      valid = false;
    } else {
      setNameError('');
    }

    const cleanEmail = email.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    return valid;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      await register(fullName.trim(), email.trim() || undefined);
      const rootNav = navigation.getParent<StackNavigationProp<RootStackParamList>>();
      if (rootNav) {
        rootNav.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'HomeTab' } }],
        });
      } else {
        navigation.navigate('MainTabs', { screen: 'HomeTab' });
      }
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Could not complete registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerBox}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Just a few details to get started</Text>
          </View>

          <Input
            label=""
            placeholder="Full name"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (nameError) setNameError('');
            }}
            error={nameError}
            leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.primaryLight} />}
            autoCapitalize="words"
          />

          <Input
            label=""
            placeholder="Email (optional)"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError('');
            }}
            error={emailError}
            leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.primaryLight} />}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Button
            title="Create Account"
            onPress={handleCreate}
            loading={loading}
            variant="primary"
            size="lg"
            style={styles.createBtn}
          />

          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsHighlight}>Terms & Privacy Policy</Text>
          </Text>
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
  headerBox: {
    marginBottom: SPACING.xxl,
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
  },
  createBtn: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  termsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  termsHighlight: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
