import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Crown, Tag, X } from 'phosphor-react-native';
import { router } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/context';
import { useDialog } from '@/lib/dialog/context';
import { Fonts, Spacing } from '@/constants/theme';
import {
  getUserPlan,
  createSubscription,
  verifySubscription,
  validateCoupon,
} from '@/lib/api/tutor-subscription';

type BillingCycle = 'monthly' | 'yearly';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    monthlyPrice: 2499,
    yearlyPrice: 11999,
    features: [
      'Up to 5 courses',
      'Basic analytics',
      'Student messaging',
      'Certificates',
      'Standard support',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    monthlyPrice: 3499,
    yearlyPrice: 26999,
    features: [
      'Unlimited courses',
      'Advanced analytics',
      'Student messaging',
      'Certificates',
      'AI course assistant',
      'Priority support',
      'Franchise eligibility',
    ],
    recommended: true,
  },
];

export default function TutorSubscription() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { showDialog } = useDialog();
  const { state: authState } = useAuth();
  const user = authState.status === 'authenticated' ? authState.user : null;

  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponInfo, setCouponInfo] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [loadingPlanKey, setLoadingPlanKey] = useState<string | null>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['tutor-plan'],
    queryFn: getUserPlan,
    staleTime: 5 * 60_000,
  });

  // Init billing toggle from active plan
  useEffect(() => {
    if (plan?.billingCycle) setBilling(plan.billingCycle);
  }, [plan?.billingCycle]);

  const couponMutation = useMutation({
    mutationFn: () => validateCoupon(couponCode.trim().toUpperCase()),
    onSuccess: (data) => {
      if (data.valid && data.coupon) {
        setCouponId(data.coupon.id);
        setCouponInfo({ code: data.coupon.code, discount: data.coupon.discountValue });
        setCouponError('');
      } else {
        setCouponError('Invalid or expired coupon code');
        setCouponId(null);
        setCouponInfo(null);
      }
    },
    onError: () => {
      setCouponError('Failed to validate coupon. Try again.');
      setCouponId(null);
      setCouponInfo(null);
    },
  });

  function clearCoupon() {
    setCouponCode('');
    setCouponId(null);
    setCouponInfo(null);
    setCouponError('');
  }

  async function handleSubscribe(planKey: string) {
    setLoadingPlanKey(planKey);
    try {
      const order = await createSubscription({ planKey, couponId: couponId ?? undefined });

      const paymentData = await RazorpayCheckout.open({
        key: order.keyId,
        subscription_id: order.subscriptionId,
        name: 'Tutorgram',
        description: `${planKey.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Plan`,
        currency: 'INR',
        prefill: {
          name: user?.name ?? '',
          email: user?.email ?? '',
          contact: '',
        },
        theme: { color: theme.primary },
      });

      await verifySubscription({
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_subscription_id: paymentData.razorpay_subscription_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      await qc.invalidateQueries({ queryKey: ['tutor-plan'] });
      await qc.invalidateQueries({ queryKey: ['tutor-profile'] });

      showDialog({
        title: 'Subscription Active!',
        message: 'Your plan is now active. Enjoy all the features.',
        type: 'success',
        actions: [{ label: 'Done', onPress: () => router.back() }],
      });
    } catch (err: unknown) {
      // Razorpay returns code 0 for user cancellation
      const rzpErr = err as { code?: number; description?: string };
      if (rzpErr?.code === 0) return;
      showDialog({
        title: 'Payment Failed',
        message: rzpErr?.description ?? (err instanceof Error ? err.message : 'Something went wrong.'),
        type: 'error',
      });
    } finally {
      setLoadingPlanKey(null);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Subscription</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          {/* Active plan banner */}
          {plan?.isPaid && (
            <View style={[styles.currentBanner, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
              <Crown size={20} color={theme.primary} weight="fill" />
              <Text style={[styles.currentText, { color: theme.primary }]}>
                Active: {plan.planName} · {plan.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
              </Text>
            </View>
          )}

          {/* Billing toggle */}
          <View style={[styles.billingToggle, { backgroundColor: theme.surfaceEl }]}>
            <Pressable
              onPress={() => setBilling('monthly')}
              style={[styles.toggleBtn, billing === 'monthly' && { backgroundColor: theme.surface }]}
            >
              <Text style={[styles.toggleText, { color: billing === 'monthly' ? theme.text : theme.textSecondary }]}>
                Monthly
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setBilling('yearly')}
              style={[styles.toggleBtn, billing === 'yearly' && { backgroundColor: theme.surface }]}
            >
              <Text style={[styles.toggleText, { color: billing === 'yearly' ? theme.text : theme.textSecondary }]}>
                Yearly
              </Text>
              <View style={[styles.saveBadge, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.saveText, { color: '#1E6B1E' }]}>Save 40%</Text>
              </View>
            </Pressable>
          </View>

          {/* Coupon code row */}
          {!plan?.isPaid && (
            <View style={styles.couponWrap}>
              {couponInfo ? (
                <View style={[styles.couponApplied, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                  <Tag size={14} color={theme.primary} weight="fill" />
                  <Text style={[styles.couponAppliedText, { color: theme.primary }]}>
                    {couponInfo.code} — {couponInfo.discount}% off applied
                  </Text>
                  <Pressable onPress={clearCoupon} hitSlop={8}>
                    <X size={14} color={theme.primary} weight="bold" />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.couponRow}>
                  <TextInput
                    value={couponCode}
                    onChangeText={(v) => { setCouponCode(v); setCouponError(''); }}
                    placeholder="Coupon code"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="characters"
                    style={[styles.couponInput, { backgroundColor: theme.surface, borderColor: couponError ? theme.error : theme.border, color: theme.text }]}
                  />
                  <Pressable
                    onPress={() => couponMutation.mutate()}
                    disabled={!couponCode.trim() || couponMutation.isPending}
                    style={[styles.couponBtn, { backgroundColor: theme.primary, opacity: !couponCode.trim() ? 0.5 : 1 }]}
                  >
                    <Text style={styles.couponBtnText}>{couponMutation.isPending ? '…' : 'Apply'}</Text>
                  </Pressable>
                </View>
              )}
              {!!couponError && (
                <Text style={[styles.couponError, { color: theme.error }]}>{couponError}</Text>
              )}
            </View>
          )}

          {/* Plan cards */}
          {PLANS.map((p) => {
            const price = billing === 'monthly' ? p.monthlyPrice : p.yearlyPrice;
            const planKey = `${p.key}_${billing}`;
            const isActive = plan?.isPaid && plan.planKey === planKey;
            const isLoading = loadingPlanKey === planKey;

            return (
              <View
                key={p.key}
                style={[
                  styles.planCard,
                  { backgroundColor: theme.surface, borderColor: p.recommended ? theme.primary : theme.border },
                  p.recommended && styles.planCardRecommended,
                  isActive && { borderColor: theme.primary, borderWidth: 2 },
                ]}
              >
                {p.recommended && !isActive && (
                  <View style={[styles.recommendedBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.recommendedText}>Most Popular</Text>
                  </View>
                )}
                {isActive && (
                  <View style={[styles.recommendedBadge, { backgroundColor: theme.success }]}>
                    <Text style={styles.recommendedText}>Your Plan</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: theme.text }]}>{p.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.price, { color: theme.text }]}>
                      ₹{price.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.pricePer, { color: theme.textSecondary }]}>
                      /{billing === 'monthly' ? 'mo' : 'yr'}
                    </Text>
                  </View>
                </View>
                <View style={styles.featureList}>
                  {p.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <CheckCircle size={16} color={theme.primary} weight="fill" />
                      <Text style={[styles.featureText, { color: theme.textSecondary }]}>{f}</Text>
                    </View>
                  ))}
                </View>
                {isActive ? (
                  <View style={[styles.activeBtn, { backgroundColor: theme.surfaceEl }]}>
                    <Text style={[styles.activeBtnText, { color: theme.textSecondary }]}>Current Plan</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleSubscribe(planKey)}
                    disabled={!!loadingPlanKey}
                    style={({ pressed }) => [
                      styles.subscribeBtn,
                      { backgroundColor: p.recommended ? theme.primary : theme.surface, borderColor: theme.primary, opacity: (pressed || !!loadingPlanKey) ? 0.75 : 1 },
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={p.recommended ? '#fff' : theme.primary} />
                    ) : (
                      <Text style={[styles.subscribeBtnText, { color: p.recommended ? '#fff' : theme.primary }]}>
                        {plan?.isPaid ? 'Switch Plan' : 'Get Started'}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}

          <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
            All plans include a 7-day free trial. Cancel anytime. Prices are in INR and include GST.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: Fonts.bold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.three, gap: 16 },
  currentBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  currentText: { fontSize: 14, fontFamily: Fonts.semiBold },
  billingToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  toggleText: { fontSize: 14, fontFamily: Fonts.semiBold },
  saveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  saveText: { fontSize: 10, fontFamily: Fonts.bold },
  couponWrap: { gap: 6 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 14, fontFamily: Fonts.medium },
  couponBtn: { height: 44, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  couponBtnText: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
  couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  couponAppliedText: { flex: 1, fontSize: 13, fontFamily: Fonts.semiBold },
  couponError: { fontSize: 12, fontFamily: Fonts.regular },
  planCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 16, overflow: 'hidden' },
  planCardRecommended: { borderWidth: 1.5 },
  recommendedBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 10 },
  recommendedText: { fontSize: 11, fontFamily: Fonts.bold, color: '#fff' },
  planHeader: { gap: 4, marginTop: 8 },
  planName: { fontSize: 20, fontFamily: Fonts.extraBold },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  price: { fontSize: 30, fontFamily: Fonts.extraBold, letterSpacing: -1 },
  pricePer: { fontSize: 14, fontFamily: Fonts.regular, paddingBottom: 4 },
  featureList: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, fontFamily: Fonts.regular },
  subscribeBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  subscribeBtnText: { fontSize: 15, fontFamily: Fonts.bold },
  activeBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  activeBtnText: { fontSize: 15, fontFamily: Fonts.semiBold },
  disclaimer: { fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 18 },
});
