import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { getPrivacySettings, updatePrivacySettings } from '@/lib/api/tutor-settings-api';
import type { ProfileVisibility } from '@/lib/api/tutor-settings-api';

const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string; desc: string }[] = [
  { value: 'public', label: 'Public', desc: 'Anyone can view your profile' },
  { value: 'students only', label: 'Students Only', desc: 'Only enrolled students can view your profile' },
  { value: 'private', label: 'Private', desc: 'Your profile is hidden from everyone' },
];

export default function SettingsPrivacy() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['tutor-privacy'], queryFn: getPrivacySettings, staleTime: 5 * 60_000 });

  const mutation = useMutation({
    mutationFn: (update: Parameters<typeof updatePrivacySettings>[0]) => updatePrivacySettings(update),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-privacy'] }),
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PROFILE VISIBILITY</Text>
            <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {VISIBILITY_OPTIONS.map((opt, i) => {
                const selected = (data?.profileVisibility ?? 'public') === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => mutation.mutate({ profileVisibility: opt.value })}
                    style={({ pressed }) => [
                      styles.row,
                      { borderBottomColor: theme.border, borderBottomWidth: i < VISIBILITY_OPTIONS.length - 1 ? StyleSheet.hairlineWidth : 0 },
                      pressed && { backgroundColor: theme.surfaceEl },
                    ]}
                  >
                    <View style={styles.rowText}>
                      <Text style={[styles.rowLabel, { color: theme.text }]}>{opt.label}</Text>
                      <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>{opt.desc}</Text>
                    </View>
                    {selected && <Check size={18} color={theme.primary} weight="bold" />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CONTACT VISIBILITY</Text>
            <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.text }]}>Show Email</Text>
                  <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>Display email on your public profile</Text>
                </View>
                <Switch
                  value={data?.showEmail ?? false}
                  onValueChange={() => mutation.mutate({ showEmail: !data?.showEmail })}
                  trackColor={{ true: theme.primary }}
                />
              </View>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.text }]}>Show Phone</Text>
                  <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>Display phone number on your public profile</Text>
                </View>
                <Switch
                  value={data?.showPhone ?? false}
                  onValueChange={() => mutation.mutate({ showPhone: !data?.showPhone })}
                  trackColor={{ true: theme.primary }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: Fonts.bold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.three, gap: 24 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.8, paddingHorizontal: 4 },
  group: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontFamily: Fonts.medium },
  rowDesc: { fontSize: 12, fontFamily: Fonts.regular },
});
