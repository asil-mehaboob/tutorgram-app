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
import { getTutorProfile, updateTutorProfile } from '@/lib/api/tutor-profile-api';

export default function TutorProfileEdit() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['tutor-profile'], queryFn: getTutorProfile, staleTime: 5 * 60_000 });

  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [credibility, setCredibility] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setFullName(data.fullName ?? '');
    setTitle(data.professionalTitle ?? '');
    setBio(data.bio ?? '');
    setCredibility(data.primaryCredibility ?? '');
    setInitialized(true);
  }

  const mutation = useMutation({
    mutationFn: () => updateTutorProfile({ fullName, professionalTitle: title, bio, primaryCredibility: credibility }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tutor-profile'] });
      router.back();
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={22} color={theme.text} weight="bold" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
            <Input label="Professional Title" value={title} onChangeText={setTitle} placeholder="e.g. Senior Software Engineer" />
            <Input
              label="Primary Credibility"
              value={credibility}
              onChangeText={setCredibility}
              placeholder="e.g. 10+ years in web development"
            />
            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell students about yourself..."
              multiline
              numberOfLines={6}
              style={{ minHeight: 120, textAlignVertical: 'top' }}
            />

            {mutation.isError && (
              <Text style={[styles.errorText, { color: theme.error }]}>
                Failed to save. Please try again.
              </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: Fonts.bold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.three, gap: 14 },
  errorText: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
});
