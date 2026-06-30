import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GraduationCap, ChalkboardTeacher, ArrowRight } from 'phosphor-react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeContext } from '@/lib/theme/context';

type Role = 'student' | 'tutor';

export default function RoleSelectScreen() {
  const theme = useTheme();
  const { resolvedTheme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const isDark = resolvedTheme === 'dark';
  const [selected, setSelected] = useState<Role | null>(null);

  function handleContinue() {
    if (!selected) return;
    router.push(`/(auth)/login?role=${selected}`);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/logo.svg')}
          style={styles.logo}
          contentFit="contain"
          tintColor={isDark ? '#FFFFFF' : undefined}
        />
        <Text style={[styles.headline, { color: theme.text }]}>
          Welcome to{'\n'}Tutorgram
        </Text>
        <Text style={[styles.subline, { color: theme.textSecondary }]}>
          The learning platform built for real outcomes.
        </Text>
      </View>

      {/* Role cards — flex fills remaining space */}
      <View style={styles.cardsArea}>
        <Text style={[styles.prompt, { color: theme.textSecondary }]}>Who are you?</Text>

        <RoleCard
          icon={
            <GraduationCap
              size={36}
              weight="duotone"
              color={selected === 'student' ? theme.primary : theme.textSecondary}
            />
          }
          title="I'm a Student"
          tagline="Learn"
          description="Access thousands of courses taught by expert tutors and advance your skills."
          selected={selected === 'student'}
          onPress={() => setSelected('student')}
          theme={theme}
        />
        <RoleCard
          icon={
            <ChalkboardTeacher
              size={36}
              weight="duotone"
              color={selected === 'tutor' ? theme.primary : theme.textSecondary}
            />
          }
          title="I'm a Tutor"
          tagline="Teach"
          description="Share your knowledge, build your brand, and earn from your expertise."
          selected={selected === 'tutor'}
          onPress={() => setSelected('tutor')}
          theme={theme}
        />
      </View>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleContinue}
          disabled={!selected}
          style={({ pressed }) => [
            styles.continueBtn,
            {
              backgroundColor: selected ? theme.primary : theme.surfaceEl,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={[
            styles.continueBtnText,
            { color: selected ? theme.primaryForeground : theme.textSecondary },
          ]}>
            Continue
          </Text>
          <ArrowRight
            size={18}
            color={selected ? theme.primaryForeground : theme.textSecondary}
            weight="bold"
          />
        </Pressable>

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
      </View>
    </View>
  );
}

type RoleCardProps = {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
};

function RoleCard({ icon, title, tagline, description, selected, onPress, theme }: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? theme.primaryLight : theme.surfaceEl,
          borderColor: selected ? theme.primary : theme.border,
          borderWidth: selected ? 1.5 : 1,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: selected ? theme.primaryLight : theme.surface }]}>
          {icon}
        </View>
        <View style={[styles.taglinePill, { borderColor: selected ? theme.primary : theme.border }]}>
          <Text style={[styles.taglineText, { color: selected ? theme.primary : theme.textSecondary }]}>
            {tagline}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{description}</Text>

      <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
  },

  header: {
    paddingTop: 32,
    paddingBottom: 28,
    gap: 10,
  },
  logo: {
    width: 148,
    height: 40,
    marginBottom: 12,
  },
  headline: {
    fontSize: 34,
    fontFamily: Fonts.extraBold,
    letterSpacing: -1,
    lineHeight: 46,
  },
  subline: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },

  cardsArea: {
    flex: 1,
    gap: 12,
    paddingBottom: 12,
  },
  prompt: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  card: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taglinePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  taglineText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  footer: {
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
  },
  continueBtn: {
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  legal: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 16,
  },
});
