import { useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LinkedinLogo, YoutubeLogo, TwitterLogo, GithubLogo, InstagramLogo, Globe } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSocialLinks, upsertSocialLinks } from '@/lib/api/tutor-profile-api';

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', icon: LinkedinLogo, placeholder: 'https://linkedin.com/in/yourprofile' },
  { key: 'youtube', label: 'YouTube', icon: YoutubeLogo, placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'twitter', label: 'Twitter / X', icon: TwitterLogo, placeholder: 'https://twitter.com/yourhandle' },
  { key: 'github', label: 'GitHub', icon: GithubLogo, placeholder: 'https://github.com/yourusername' },
  { key: 'instagram', label: 'Instagram', icon: InstagramLogo, placeholder: 'https://instagram.com/yourhandle' },
  { key: 'website', label: 'Website', icon: Globe, placeholder: 'https://yourwebsite.com' },
];

export default function ProfileSocialLinks() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [links, setLinks] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({ queryKey: ['tutor-social-links'], queryFn: getSocialLinks, staleTime: 5 * 60_000 });

  useEffect(() => {
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((l) => { map[l.platform] = l.url; });
      setLinks(map);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = Object.entries(links)
        .filter(([, url]) => url.trim())
        .map(([platform, url]) => ({ platform, url: url.trim() }));
      return upsertSocialLinks(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tutor-social-links'] });
      router.back();
    },
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}><ArrowLeft size={22} color={theme.text} weight="regular" /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Social Links</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            return (
              <View key={p.key} style={styles.row}>
                <Icon size={20} color={theme.textSecondary} weight="regular" style={styles.platformIcon} />
                <View style={styles.inputWrap}>
                  <Input
                    label={p.label}
                    value={links[p.key] ?? ''}
                    onChangeText={(v) => setLinks({ ...links, [p.key]: v })}
                    placeholder={p.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
              </View>
            );
          })}
          {mutation.isError && (
            <Text style={[styles.errorText, { color: theme.error }]}>Failed to save. Please try again.</Text>
          )}
          <Button label="Save Links" onPress={() => mutation.mutate()} loading={mutation.isPending} />
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
  scroll: { padding: Spacing.three, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  platformIcon: { marginBottom: 12 },
  inputWrap: { flex: 1 },
  errorText: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
});
