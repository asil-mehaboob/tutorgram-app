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
import { login as apiLogin, loginWithGoogle, getMe } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/context';
import type { AuthUser } from '@/lib/auth/context';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

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
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      const sessionToken = await apiLogin(email.trim().toLowerCase(), password);
      const me = await getMe();
      const user: AuthUser = {
        id: me.session.id,
        email: me.session.email ?? email,
        name: me.session.name ?? me.identity.fullName,
        role: me.session.role,
      };
      await login(sessionToken, user);
      router.replace('/(student)');
    } catch (err: unknown) {
      Alert.alert('Sign in failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
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

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
            <Text style={[styles.heading, { color: theme.text }]}>Log in to your account</Text>
            <Text style={[styles.subheading, { color: theme.textSecondary }]}>
              Welcome back! Access thousands of courses.
            </Text>
          </View>

          {/* Google button */}
          <Pressable
            onPress={handleGoogleLogin}
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
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotRow}
              hitSlop={8}
            >
              <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot password?</Text>
            </Pressable>

            <Button label="Log In" onPress={handleLogin} loading={loading} disabled={googleLoading} />
          </View>

          {/* Sign up */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/signup')} hitSlop={8}>
              <Text style={[styles.footerLink, { color: theme.primary }]}>Sign up for free</Text>
            </Pressable>
          </View>

          <Text style={[styles.legal, { color: theme.textSecondary }]}>
            By continuing you agree to our{' '}
            <Text style={{ color: theme.text }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: theme.text }}>Privacy Policy</Text>.
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

  /* Logo */
  logoSection: {
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 44,
  },

  /* Heading */
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

  /* Google */
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },

  /* Divider */
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

  /* Form */
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

  /* Footer */
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

  /* Legal */
  legal: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 16,
  },
});
