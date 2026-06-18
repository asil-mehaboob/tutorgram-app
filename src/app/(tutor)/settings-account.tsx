import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAccountSettings, updateAccountSettings } from '@/lib/api/tutor-settings-api';

export default function SettingsAccount() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['tutor-settings-account'], queryFn: getAccountSettings, staleTime: 5 * 60_000 });

  if (data && !initialized) { setName(data.name); setEmail(data.email); setInitialized(true); }

  const mutation = useMutation({
    mutationFn: () => updateAccountSettings({ name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-settings-account'] }); router.back(); },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.back}><ArrowLeft size={22} color={theme.text} weight="bold" /></Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Account Settings</Text>
        </View>
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Input label="Full Name" value={name} onChangeText={setName} placeholder="Your full name" />
            <Input label="Email Address" value={email} editable={false} style={{ opacity: 0.6 }} />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Email address cannot be changed here.</Text>
            {mutation.isError && <Text style={[styles.error, { color: theme.error }]}>Failed to save. Try again.</Text>}
            <Button label="Save Changes" onPress={() => mutation.mutate()} loading={mutation.isPending} />
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: Fonts.bold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.three, gap: 14 },
  hint: { fontSize: 12, fontFamily: Fonts.regular, marginTop: -8 },
  error: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
});
