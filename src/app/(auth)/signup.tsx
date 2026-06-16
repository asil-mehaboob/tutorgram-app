import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { sendOtp, verifyOtp, register, loginWithGoogle, getMe } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/context';
import type { AuthUser } from '@/lib/auth/context';

WebBrowser.maybeCompleteAuthSession();

type Step = 'phone' | 'otp' | 'details';

const STEPS = ['Phone', 'Verify', 'Details'];

export default function SignupScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verifiedTokenId, setVerifiedTokenId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stepIndex = step === 'phone' ? 0 : step === 'otp' ? 1 : 2;

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    try {
      const sessionToken = await loginWithGoogle(async (url, redirectUrl) => {
        const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
        return result;
      });
      const me = await getMe();
      const user: AuthUser = {
        id: me.session.id,
        email: me.session.email ?? '',
        name: me.session.name ?? me.identity.fullName,
        role: me.session.role,
      };
      await login(sessionToken, user);
      router.replace('/(student)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (!msg.includes('cancelled')) Alert.alert('Error', msg);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSendOtp() {
    const e: Record<string, string> = {};
    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (!/^\+[1-9]\d{7,14}$/.test(phone.trim()))
      e.phone = 'Use international format, e.g. +919876543210';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await sendOtp(phone.trim());
      setStep('otp');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const e: Record<string, string> = {};
    if (!otp.trim()) e.otp = 'Enter the 6-digit code';
    else if (!/^\d{6}$/.test(otp.trim())) e.otp = 'OTP must be exactly 6 digits';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const tokenId = await verifyOtp(phone.trim(), otp.trim());
      setVerifiedTokenId(tokenId);
      setStep('details');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2)
      e.fullName = 'Name must be at least 2 characters';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'At least 8 characters required';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      e.password = 'Include uppercase, lowercase, and a number';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: phone.trim(),
        verifiedTokenId,
      });
      Alert.alert('Account created!', 'Sign in to start learning.', [
        { text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <Image
              source={require('@/assets/images/logo.svg')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          <Text style={[styles.heading, { color: theme.text }]}>Create your account</Text>

          {/* Step indicator */}
          <View style={styles.steps}>
            {STEPS.map((label, i) => (
              <View key={label} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor:
                        i < stepIndex
                          ? theme.success
                          : i === stepIndex
                          ? theme.primary
                          : theme.border,
                    },
                  ]}
                >
                  {i < stepIndex ? (
                    <Text style={styles.stepDotText}>✓</Text>
                  ) : (
                    <Text style={styles.stepDotText}>{i + 1}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: i === stepIndex ? theme.text : theme.textSecondary },
                  ]}
                >
                  {label}
                </Text>
                {i < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: i < stepIndex ? theme.success : theme.border },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          {/* Google (only on phone step) */}
          {step === 'phone' && (
            <>
              <Pressable
                onPress={handleGoogleSignup}
                disabled={googleLoading || loading}
                style={({ pressed }) => [
                  styles.googleBtn,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed || googleLoading ? 0.8 : 1,
                  },
                ]}
              >
                <Image
                  source={require('@/assets/images/favicon.svg')}
                  style={styles.googleIcon}
                  contentFit="contain"
                />
                <Text style={[styles.googleBtnText, { color: theme.text }]}>
                  {googleLoading ? 'Redirecting…' : 'Sign up with Google'}
                </Text>
              </Pressable>

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <Text style={[styles.dividerText, { color: theme.textSecondary }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>
            </>
          )}

          {/* Step content */}
          {step === 'phone' && (
            <View style={styles.form}>
              <Text style={[styles.stepHint, { color: theme.textSecondary }]}>
                We'll send a verification code to your phone number.
              </Text>
              <Input
                label="Phone number"
                placeholder="+919876543210"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
              />
              <Button label="Send Verification Code" onPress={handleSendOtp} loading={loading} />
            </View>
          )}

          {step === 'otp' && (
            <View style={styles.form}>
              <Text style={[styles.stepHint, { color: theme.textSecondary }]}>
                Enter the 6-digit code sent to {phone}
              </Text>
              <Input
                label="Verification code"
                placeholder="123456"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                error={errors.otp}
                maxLength={6}
              />
              <Button label="Verify Code" onPress={handleVerifyOtp} loading={loading} />
              <Button
                label="Resend code"
                variant="ghost"
                onPress={() => { setStep('phone'); setOtp(''); setErrors({}); }}
              />
            </View>
          )}

          {step === 'details' && (
            <View style={styles.form}>
              <Text style={[styles.stepHint, { color: theme.textSecondary }]}>
                Almost there — fill in your account details.
              </Text>
              <Input
                label="Full name"
                placeholder="John Doe"
                autoComplete="name"
                value={fullName}
                onChangeText={setFullName}
                error={errors.fullName}
              />
              <Input
                label="Email address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
              />
              <View>
                <Input
                  label="Password"
                  placeholder="Min 8 chars with upper, lower & number"
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.showPasswordBtn}
                  hitSlop={8}
                >
                  {showPassword
                    ? <EyeSlash size={18} color={theme.textSecondary} />
                    : <Eye size={18} color={theme.textSecondary} />}
                </Pressable>
              </View>
              <Button label="Create Account" onPress={handleRegister} loading={loading} />
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={8}>
              <Text style={[styles.footerLink, { color: theme.primary }]}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    gap: 24,
  },
  logoRow: { alignItems: 'center' },
  logo: { width: 160, height: 44 },
  heading: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  stepLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  stepLine: {
    width: 24,
    height: 1.5,
    marginHorizontal: 4,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  googleIcon: { width: 20, height: 20 },
  googleBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  form: { gap: 16 },
  stepHint: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  showPasswordBtn: {
    position: 'absolute',
    right: 14,
    top: 38,
  },
  showPasswordText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: { fontSize: 14, fontFamily: Fonts.regular },
  footerLink: { fontSize: 14, fontFamily: Fonts.bold },
});
