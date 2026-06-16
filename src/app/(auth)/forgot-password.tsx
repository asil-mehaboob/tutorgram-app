import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { forgotPassword } from '@/lib/api/auth';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) { setError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return; }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
          </Pressable>

          <View style={styles.logoRow}>
            <Image
              source={require('@/assets/images/logo.svg')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          {!sent ? (
            <>
              <View style={styles.headingBlock}>
                <Text style={[styles.heading, { color: theme.text }]}>Reset your password</Text>
                <Text style={[styles.subheading, { color: theme.textSecondary }]}>
                  Enter your email and we'll send a reset link.
                </Text>
              </View>
              <View style={styles.form}>
                <Input
                  label="Email address"
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  error={error}
                />
                <Button label="Send Reset Link" onPress={handleSubmit} loading={loading} />
              </View>
            </>
          ) : (
            <View style={styles.successBlock}>
              <View style={[styles.successCircle, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.successIcon, { color: theme.primary }]}>✓</Text>
              </View>
              <Text style={[styles.heading, { color: theme.text, textAlign: 'center' }]}>
                Check your inbox
              </Text>
              <Text style={[styles.subheading, { color: theme.textSecondary, textAlign: 'center' }]}>
                We sent a password reset link to{'\n'}
                <Text style={{ color: theme.text, fontFamily: Fonts.semiBold }}>{email}</Text>
              </Text>
              <Button
                label="Back to Log In"
                variant="outline"
                onPress={() => router.replace('/(auth)/login')}
                style={styles.backLoginBtn}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 24,
    justifyContent: 'center',
  },
  backBtn: { position: 'absolute', top: 20, left: 24 },
  backText: { fontSize: 16, fontFamily: Fonts.semiBold },
  logoRow: { alignItems: 'center' },
  logo: { width: 140, height: 38 },
  headingBlock: { gap: 6 },
  heading: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 21,
  },
  form: { gap: 16 },
  successBlock: {
    alignItems: 'center',
    gap: 16,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 32,
    fontFamily: Fonts.bold,
  },
  backLoginBtn: { alignSelf: 'stretch', marginTop: 8 },
});
