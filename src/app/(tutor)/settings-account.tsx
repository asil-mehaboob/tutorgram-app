import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichField } from '@/components/tutor/rich-field';
import { getAccountSettings, updateAccountSettings } from '@/lib/api/tutor-settings-api';

export default function SettingsAccount() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['tutor-settings-account'], queryFn: getAccountSettings, staleTime: 5 * 60_000 });

  useEffect(() => {
    if (data) {
      setFullName(data.fullName ?? '');
      setEmail(data.email ?? '');
      setPhone(data.phone ?? '');
      setBio(data.bio ?? '');
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => updateAccountSettings({ fullName, phone: phone || null, bio: bio || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tutor-settings-account'] });
      qc.invalidateQueries({ queryKey: ['tutor-profile'] });
      router.back();
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <ArrowLeft size={22} color={theme.text} weight="regular" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Account Settings</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              autoCapitalize="words"
            />
            <View>
              <Input
                label="Email Address"
                value={email}
                editable={false}
                style={{ opacity: 0.6 }}
              />
              <Text style={[styles.hint, { color: theme.textSecondary }]}>Email address cannot be changed here.</Text>
            </View>
            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 00000 00000"
              keyboardType="phone-pad"
            />
            <RichField
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell students about yourself..."
              minHeight={180}
            />
            {mutation.isError && (
              <Text style={[styles.error, { color: theme.error }]}>Failed to save. Try again.</Text>
            )}
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
  hint: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 4 },
  error: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
});
