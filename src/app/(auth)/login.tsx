import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDialog } from '@/lib/dialog/context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeSlash, ArrowLeft, GraduationCap, ChalkboardTeacher } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { login as studentLogin, loginWithGoogle as studentLoginWithGoogle, getMe as studentGetMe } from '@/lib/api/auth';
import { tutorLogin, tutorLoginWithGoogle, tutorGetMe } from '@/lib/api/tutor-auth';
import { useAuth } from '@/lib/auth/context';
import type { AuthUser } from '@/lib/auth/context';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { showDialog } = useDialog();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'tutor' ? 'tutor' : 'student';
  const isTutor = role === 'tutor';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) {
      console.log('[Login] Validation failed', e);
    }
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    console.log('[Login] Sign in started', { email: email.trim().toLowerCase(), role });
    setLoading(true);
    try {
      let sessionToken: string;
      let user: AuthUser;

      if (isTutor) {
        sessionToken = await tutorLogin(email.trim().toLowerCase(), password);
        console.log('[Login] Tutor session token received');
        const me = await tutorGetMe(sessionToken);
        console.log('[Login] Tutor profile fetched', { id: me.session.id, role: me.session.role });
        user = {
          id: me.session.id,
          email: me.session.email ?? email,
          name: me.session.name ?? me.identity.fullName,
          role: me.session.role,
        };
      } else {
        sessionToken = await studentLogin(email.trim().toLowerCase(), password);
        console.log('[Login] Student session token received');
        const me = await studentGetMe();
        console.log('[Login] Student profile fetched', { id: me.session.id, role: me.session.role });
        user = {
          id: me.session.id,
          email: me.session.email ?? email,
          name: me.session.name ?? me.identity.fullName,
          role: me.session.role,
        };
      }

      await login(sessionToken, user);
      console.log('[Login] Sign in complete, navigating to home');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace((isTutor ? '/(tutor)' : '/(student)') as any);
    } catch (err: unknown) {
      console.error('[Login] Sign in error', err instanceof Error ? err.message : err);
      showDialog({ title: 'Sign in failed', message: err instanceof Error ? err.message : 'Something went wrong.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    console.log('[Login] Google sign in started', { role });
    setGoogleLoading(true);
    try {
      const openSession = async (url: string, redirectUrl: string) => {
        return WebBrowser.openAuthSessionAsync(url, redirectUrl);
      };

      let sessionToken: string;
      let user: AuthUser;

      if (isTutor) {
        sessionToken = await tutorLoginWithGoogle(openSession);
        console.log('[Login] Tutor Google OAuth token received');
        const me = await tutorGetMe(sessionToken);
        console.log('[Login] Tutor profile fetched', { id: me.session.id, role: me.session.role });
        user = {
          id: me.session.id,
          email: me.session.email ?? '',
          name: me.session.name ?? me.identity.fullName,
          role: me.session.role,
        };
      } else {
        sessionToken = await studentLoginWithGoogle(openSession);
        console.log('[Login] Student Google OAuth token received');
        const me = await studentGetMe();
        console.log('[Login] Student profile fetched', { id: me.session.id, role: me.session.role });
        user = {
          id: me.session.id,
          email: me.session.email ?? '',
          name: me.session.name ?? me.identity.fullName,
          role: me.session.role,
        };
      }

      await login(sessionToken, user);
      console.log('[Login] Google sign in complete, navigating to home');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace((isTutor ? '/(tutor)' : '/(student)') as any);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      console.error('[Login] Google sign in error', msg);
      if (!msg.includes('cancelled')) showDialog({ title: 'Error', message: msg, type: 'error' });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Role indicator bar */}
          <View style={styles.roleBar}>
            <Pressable onPress={() => router.replace('/(auth)/role-select')} hitSlop={12} style={styles.backBtn}>
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

          {/* Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require('@/assets/images/logo.svg')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          {/* Heading */}
          <View style={styles.headingSection}>
            <Text style={[styles.heading, { color: theme.text }]}>
              {isTutor ? 'Welcome back, Tutor' : 'Welcome back'}
            </Text>
            <Text style={[styles.subheading, { color: theme.textSecondary }]}>
              {isTutor
                ? 'Sign in to your tutor dashboard'
                : 'Sign in to continue learning'}
            </Text>
          </View>

          {/* Google button */}
          <Pressable
            onPress={handleGoogleLogin}
            disabled={googleLoading || loading}
            style={({ pressed }) => [
              styles.ssoBtn,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed || googleLoading ? 0.8 : 1,
              },
            ]}
          >
            <Image
              source={require('@/assets/images/favicon.svg')}
              style={styles.ssoIcon}
              contentFit="contain"
            />
            <Text style={[styles.ssoBtnText, { color: theme.text }]}>
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerLabel, { color: theme.textSecondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email address"
              placeholder="name@example.com"
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
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                style={{ paddingRight: 44 }}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                {showPassword
                  ? <EyeSlash size={18} color={theme.textSecondary} />
                  : <Eye size={18} color={theme.textSecondary} />}
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.push(`/(auth)/forgot-password?role=${role}`)}
              style={styles.forgotRow}
              hitSlop={8}
            >
              <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot password?</Text>
            </Pressable>

            <Button label="Sign In" onPress={handleLogin} loading={loading} disabled={googleLoading} />
          </View>

          {/* Sign up */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push(`/(auth)/signup?role=${role}`)} hitSlop={8}>
              <Text style={[styles.footerLink, { color: theme.primary }]}>Sign up for free</Text>
            </Pressable>
          </View>

          <Text style={[styles.legal, { color: theme.textSecondary }]}>
            By continuing you agree to our{' '}
            <Text
              style={{ color: theme.primary }}
              onPress={() => Linking.openURL('https://mytutorgram.com/terms')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={{ color: theme.primary }}
              onPress={() => Linking.openURL('https://mytutorgram.com/privacy-policy')}
            >
              Privacy Policy
            </Text>
            .
          </Text>
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

  roleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  logoSection: {
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 44,
  },

  headingSection: {
    alignItems: 'center',
    gap: 6,
  },
  heading: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
  },

  ssoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  ssoIcon: {
    width: 20,
    height: 20,
  },
  ssoBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.1,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },

  form: { gap: 16 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 40,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },

  legal: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 16,
  },
});
