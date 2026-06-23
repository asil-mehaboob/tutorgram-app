import { useState } from 'react';
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
import { ArrowLeft, Eye, EyeSlash } from 'phosphor-react-native';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { changePassword } from '@/lib/api/identity';

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showDialog } = useDialog();

  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!current) e.current = 'Current password is required';
    if (!newPass) e.newPass = 'New password is required';
    else if (newPass.length < 8) e.newPass = 'At least 8 characters required';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPass))
      e.newPass = 'Include uppercase, lowercase, and a number';
    if (newPass !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () => changePassword({ currentPassword: current, newPassword: newPass }),
    onSuccess: () => {
      showDialog({ title: 'Password changed', message: 'Your password has been updated successfully.', type: 'success', actions: [{ label: 'OK', onPress: () => router.back() }] });
    },
    onError: (err: Error) => {
      showDialog({ title: 'Failed', message: err.message, type: 'error' });
    },
  });

  function handleSubmit() {
    if (!validate()) return;
    mutate();
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft size={22} color={theme.text} weight="regular" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Change Password</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Enter your current password, then choose a new one.
          </Text>

          <View style={styles.form}>
            <View>
              <Input
                label="Current password"
                placeholder="Enter current password"
                secureTextEntry={!showCurrent}
                value={current}
                onChangeText={setCurrent}
                autoComplete="current-password"
                error={errors.current}
              />
              <Pressable onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn} hitSlop={8}>
                {showCurrent ? <EyeSlash size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
              </Pressable>
            </View>

            <View>
              <Input
                label="New password"
                placeholder="Min 8 chars with upper, lower & number"
                secureTextEntry={!showNew}
                value={newPass}
                onChangeText={setNewPass}
                autoComplete="new-password"
                error={errors.newPass}
              />
              <Pressable onPress={() => setShowNew(v => !v)} style={styles.eyeBtn} hitSlop={8}>
                {showNew ? <EyeSlash size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
              </Pressable>
            </View>

            <Input
              label="Confirm new password"
              placeholder="Re-enter new password"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
            />

            <Button label="Update Password" onPress={handleSubmit} loading={isPending} />
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
  hint: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 20 },
  form: { gap: 16 },
  eyeBtn: { position: 'absolute', right: 14, top: 40 },
});
