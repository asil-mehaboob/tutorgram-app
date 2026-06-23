import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDialog } from '@/lib/dialog/context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, ArrowLeft, GraduationCap, ChalkboardTeacher } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { forgotPassword } from '@/lib/api/auth';
import { tutorForgotPassword } from '@/lib/api/tutor-auth';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showDialog } = useDialog();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'tutor' ? 'tutor' : 'student';
  const isTutor = role === 'tutor';

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
      if (isTutor) {
        await tutorForgotPassword(email.trim().toLowerCase());
      } else {
        await forgotPassword(email.trim().toLowerCase());
      }
      setSent(true);
    } catch (err: unknown) {
      showDialog({ title: 'Error', message: err instanceof Error ? err.message : 'Something went wrong.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>

          {/* Role indicator bar */}
          <View style={styles.roleBar}>
            <Pressable onPress={() => router.replace(`/(auth)/login?role=${role}`)} hitSlop={12} style={styles.backBtn}>
              <ArrowLeft size={20} color={theme.textSecondary} />
            </Pressable>
            <View style={[styles.roleChip, { backgroundColor: theme.primaryLight }]}>
              {isTutor
                ? <ChalkboardTeacher size={13} color={theme.primary} weight="fill" />
                : <GraduationCap size={13} color={theme.primary} weight="fill" />}
              <Text style={[styles.roleChipText, { color: theme.primary }]}>
                {isTutor ? 'Tutor' : 'Student'}
              </Text>
            </View>
          </View>

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
              <CheckCircle size={64} color={theme.primary} weight="duotone" />
              <Text style={[styles.heading, { color: theme.text, textAlign: 'center' }]}>
                Check your inbox
              </Text>
              <Text style={[styles.subheading, { color: theme.textSecondary, textAlign: 'center' }]}>
                We sent a password reset link to{'\n'}
                <Text style={{ color: theme.text, fontFamily: Fonts.semiBold }}>{email}</Text>
              </Text>
              <Button
                label="Back to Sign In"
                variant="outline"
                onPress={() => router.replace(`/(auth)/login?role=${role}`)}
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

  roleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    top: 16,
    left: 24,
    right: 24,
  },
  backBtn: {
    padding: 4,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleChipText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.1,
  },

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
  backLoginBtn: { alignSelf: 'stretch', marginTop: 8 },
});
