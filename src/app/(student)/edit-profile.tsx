import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDialog } from '@/lib/dialog/context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateMe } from '@/lib/api/identity';
import { useAuth } from '@/lib/auth/context';

export default function EditProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showDialog } = useDialog();
  const { state } = useAuth();
  const user = state.status === 'authenticated' ? state.user : null;

  const [fullName, setFullName] = useState(user?.name ?? '');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = 'Name must be at least 2 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () => updateMe({
      fullName: fullName.trim(),
      bio: bio.trim() || null,
      phoneNumber: phoneNumber.trim() || null,
    }),
    onSuccess: () => {
      showDialog({ title: 'Profile updated', message: 'Your changes have been saved.', type: 'success', actions: [{ label: 'OK', onPress: () => router.back() }] });
    },
    onError: (err: Error) => {
      showDialog({ title: 'Update failed', message: err.message, type: 'error' });
    },
  });

  function handleSave() {
    if (!validate()) return;
    mutate();
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft size={22} color={theme.text} weight="regular" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar placeholder */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {fullName.trim().charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={[styles.avatarHint, { color: theme.textSecondary }]}>
              {user?.email}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full name"
              placeholder="Your full name"
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
              error={errors.fullName}
            />
            <Input
              label="Bio"
              placeholder="Tell us a bit about yourself"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              style={{ height: 88, textAlignVertical: 'top', paddingTop: 12 }}
            />
            <Input
              label="Phone number"
              placeholder="+919876543210"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <Button label="Save Changes" onPress={handleSave} loading={isPending} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontFamily: Fonts.bold, letterSpacing: -0.2 },
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 24 },
  avatarSection: { alignItems: 'center', gap: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 26, fontFamily: Fonts.extraBold },
  avatarHint: { fontSize: 13, fontFamily: Fonts.regular },
  form: { gap: 16 },
});
