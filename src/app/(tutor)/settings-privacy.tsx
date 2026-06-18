import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { getPrivacySettings, updatePrivacySettings } from '@/lib/api/tutor-settings-api';
import type { PrivacySettings } from '@/lib/api/tutor-settings-api';

const PREFS: { key: keyof PrivacySettings; label: string; desc: string }[] = [
  { key: 'profileVisible', label: 'Public Profile', desc: 'Allow students to view your full profile' },
  { key: 'showEmail', label: 'Show Email', desc: 'Display email on your public profile' },
  { key: 'showPhone', label: 'Show Phone', desc: 'Display phone number on your public profile' },
];

export default function SettingsPrivacy() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['tutor-privacy'], queryFn: getPrivacySettings, staleTime: 5 * 60_000 });

  const mutation = useMutation({
    mutationFn: (update: Partial<PrivacySettings>) => updatePrivacySettings(update),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-privacy'] }),
  });

  function toggle(key: keyof PrivacySettings) {
    if (!data) return;
    mutation.mutate({ [key]: !data[key] });
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back}><ArrowLeft size={22} color={theme.text} weight="bold" /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy</Text>
      </View>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {PREFS.map((p, i) => (
              <View key={p.key} style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: i < PREFS.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.text }]}>{p.label}</Text>
                  <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>{p.desc}</Text>
                </View>
                <Switch value={data?.[p.key] ?? false} onValueChange={() => toggle(p.key)} trackColor={{ true: theme.primary }} />
              </View>
            ))}
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
  scroll: { padding: Spacing.three },
  group: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontFamily: Fonts.medium },
  rowDesc: { fontSize: 12, fontFamily: Fonts.regular },
});
