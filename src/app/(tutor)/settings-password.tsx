import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Eye, EyeSlash } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { changeTutorPassword } from '@/lib/api/tutor-settings-api';

export default function SettingsPassword() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => changeTutorPassword({ currentPassword: current, newPassword: newPass }),
    onSuccess: () => router.back(),
    onError: (e: Error) => setError(e.message),
  });

  function validate() {
    if (!current) { setError('Current password is required'); return false; }
    if (newPass.length < 8) { setError('New password must be at least 8 characters'); return false; }
    if (!/[A-Z]/.test(newPass) || !/[a-z]/.test(newPass) || !/[0-9]/.test(newPass)) {
      setError('Password must include uppercase, lowercase, and a number');
      return false;
    }
    if (newPass !== confirm) { setError('Passwords do not match'); return false; }
    setError('');
    return true;
  }

  function handleSubmit() { if (validate()) mutation.mutate(); }

  const EyeIcon = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <Pressable onPress={onToggle} style={styles.eyeBtn}>
      {show ? <Eye size={18} color={theme.textSecondary} /> : <EyeSlash size={18} color={theme.textSecondary} />}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}><ArrowLeft size={22} color={theme.text} weight="regular" /></Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Change Password</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.inputWrap}>
            <Input label="Current Password" value={current} onChangeText={setCurrent} secureTextEntry={!showCurrent} />
            <EyeIcon show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} />
          </View>
          <View style={styles.inputWrap}>
            <Input label="New Password" value={newPass} onChangeText={setNewPass} secureTextEntry={!showNew} />
            <EyeIcon show={showNew} onToggle={() => setShowNew(!showNew)} />
          </View>
          <View style={styles.inputWrap}>
            <Input label="Confirm New Password" value={confirm} onChangeText={setConfirm} secureTextEntry={!showConfirm} />
            <EyeIcon show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
          </View>
          {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
          <Button label="Update Password" onPress={handleSubmit} loading={mutation.isPending} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: Fonts.bold },
  scroll: { padding: Spacing.three, gap: 14 },
  inputWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 14, bottom: 16 },
  error: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
});
