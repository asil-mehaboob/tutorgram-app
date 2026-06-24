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
import { getPaymentSettings, updatePaymentSettings } from '@/lib/api/tutor-settings-api';

export default function SettingsPayment() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['tutor-payment-settings'], queryFn: getPaymentSettings, staleTime: 5 * 60_000 });

  useEffect(() => {
    if (data) {
      setBankAccount(data.bankAccount ?? '');
      setIfscCode(data.ifscCode ?? '');
      setAccountHolder(data.accountHolder ?? '');
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => updatePaymentSettings({
      paymentMethod: 'BANK',
      bankAccount,
      ifscCode,
      accountHolder,
      upiId: null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-payment-settings'] }); router.back(); },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <ArrowLeft size={22} color={theme.text} weight="regular" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Payment Settings</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Input label="Account Number" value={bankAccount} onChangeText={setBankAccount} placeholder="Your bank account number" keyboardType="numeric" />
            <Input label="IFSC Code" value={ifscCode} onChangeText={setIfscCode} placeholder="e.g. SBIN0001234" autoCapitalize="characters" />
            <Input label="Account Holder Name" value={accountHolder} onChangeText={setAccountHolder} placeholder="As per bank records" autoCapitalize="words" />
            {mutation.isError && (
              <Text style={[styles.error, { color: theme.error }]}>Failed to save. Try again.</Text>
            )}
            <Button label="Save Payment Settings" onPress={() => mutation.mutate()} loading={mutation.isPending} />
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
  error: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
});
