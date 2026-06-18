import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bank, CurrencyInr, PaypalLogo } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getPaymentSettings, updatePaymentSettings } from '@/lib/api/tutor-settings-api';
import type { PaymentMethod } from '@/lib/api/tutor-settings-api';

const METHODS: { key: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { key: 'BANK', label: 'Bank Transfer', icon: <Bank size={18} color="#2849EA" /> },
  { key: 'UPI', label: 'UPI', icon: <CurrencyInr size={18} color="#2849EA" /> },
  { key: 'PAYPAL', label: 'PayPal', icon: <PaypalLogo size={18} color="#003087" /> },
];

export default function SettingsPayment() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [bankAccount, setBankAccount] = useState('');
  const [bankRouting, setBankRouting] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['tutor-payment-settings'], queryFn: getPaymentSettings, staleTime: 5 * 60_000 });

  useEffect(() => {
    if (data) {
      if (data.method) setMethod(data.method);
      setBankAccount(data.bankAccountNumber ?? '');
      setBankRouting(data.bankRoutingNumber ?? '');
      setBankName(data.bankAccountName ?? '');
      setUpiId(data.upiId ?? '');
      setPaypalEmail(data.paypalEmail ?? '');
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => updatePaymentSettings({
      method,
      bankAccountNumber: method === 'BANK' ? bankAccount : null,
      bankRoutingNumber: method === 'BANK' ? bankRouting : null,
      bankAccountName: method === 'BANK' ? bankName : null,
      upiId: method === 'UPI' ? upiId : null,
      paypalEmail: method === 'PAYPAL' ? paypalEmail : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-payment-settings'] }); router.back(); },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}><ArrowLeft size={22} color={theme.text} weight="regular" /></Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Payment Settings</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PAYOUT METHOD</Text>
            <View style={styles.methodRow}>
              {METHODS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => setMethod(m.key)}
                  style={[styles.methodBtn, { borderColor: method === m.key ? theme.primary : theme.border, backgroundColor: method === m.key ? theme.primaryLight : theme.surface }]}
                >
                  {m.icon}
                  <Text style={[styles.methodLabel, { color: method === m.key ? theme.primary : theme.text }]}>{m.label}</Text>
                </Pressable>
              ))}
            </View>

            {method === 'BANK' && (
              <>
                <Input label="Account Number" value={bankAccount} onChangeText={setBankAccount} placeholder="Your bank account number" keyboardType="numeric" />
                <Input label="IFSC / Routing Number" value={bankRouting} onChangeText={setBankRouting} placeholder="IFSC code" />
                <Input label="Account Holder Name" value={bankName} onChangeText={setBankName} placeholder="As per bank records" />
              </>
            )}
            {method === 'UPI' && (
              <Input label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="yourname@upi" autoCapitalize="none" />
            )}
            {method === 'PAYPAL' && (
              <Input label="PayPal Email" value={paypalEmail} onChangeText={setPaypalEmail} placeholder="paypal@email.com" autoCapitalize="none" keyboardType="email-address" />
            )}

            {mutation.isError && <Text style={[styles.error, { color: theme.error }]}>Failed to save. Try again.</Text>}
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
  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.8 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  methodLabel: { fontSize: 11, fontFamily: Fonts.semiBold, textAlign: 'center' },
  error: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
});
