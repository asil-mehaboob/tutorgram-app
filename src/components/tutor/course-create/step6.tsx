import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CurrencyInr } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { FieldLabel, SectionDivider, shared } from './shared';
import type { CourseForm } from './types';

type Props = {
  form: CourseForm;
  update: (changes: Partial<CourseForm>) => void;
};

export function Step6({ form, update }: Props) {
  const theme = useTheme();
  const finalPrice = form.price && form.discountPercent
    ? Math.round(parseFloat(form.price || '0') * (1 - parseFloat(form.discountPercent || '0') / 100))
    : null;

  return (
    <View style={shared.stepContent}>
      <FieldLabel text="Course Type" required theme={theme} />
      <View style={styles.options}>
        {[
          { key: true, label: 'Free', desc: 'No cost for students to enroll' },
          { key: false, label: 'Paid', desc: 'Set a price for enrollment' },
        ].map((o) => {
          const sel = form.isFree === o.key;
          return (
            <Pressable
              key={String(o.key)}
              onPress={() => update({ isFree: o.key })}
              style={[styles.card, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}
            >
              <View style={[styles.radio, { borderColor: sel ? theme.primary : theme.border }]}>
                {sel && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
              </View>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={[styles.cardLabel, { color: sel ? theme.primary : theme.text }]}>{o.label}</Text>
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{o.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {!form.isFree && (
        <>
          <SectionDivider theme={theme} />

          <View style={styles.priceRow}>
            <View style={[styles.priceInputWrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <CurrencyInr size={16} color={theme.textSecondary} weight="regular" />
              <TextInput
                style={[styles.priceInput, { color: theme.text }]}
                value={form.price}
                onChangeText={(v) => update({ price: v })}
                placeholder="0"
                keyboardType="decimal-pad"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Course Price (₹)</Text>
          </View>

          <View style={styles.discountRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Discount %"
                value={form.discountPercent}
                onChangeText={(v) => update({ discountPercent: v })}
                placeholder="0–100"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Discount Valid Till"
                value={form.discountValidTill}
                onChangeText={(v) => update({ discountValidTill: v })}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          {finalPrice !== null && (
            <View style={[styles.priceSummary, { backgroundColor: theme.primaryLight }]}>
              <CurrencyInr size={14} color={theme.primary} weight="regular" />
              <Text style={[styles.priceSummaryText, { color: theme.primary }]}>
                Original ₹{form.price}{'  →  '}Final ₹{finalPrice}{'  '}({form.discountPercent}% off)
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: 12, padding: 14 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  cardLabel: { fontSize: 16, fontFamily: Fonts.bold },
  cardDesc: { fontSize: 12, fontFamily: Fonts.regular },
  priceRow: { gap: 6 },
  priceInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, height: 50 },
  priceInput: { flex: 1, fontSize: 20, fontFamily: Fonts.bold },
  priceLabel: { fontSize: 12, fontFamily: Fonts.medium },
  discountRow: { flexDirection: 'row', gap: 10 },
  priceSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8 },
  priceSummaryText: { fontSize: 13, fontFamily: Fonts.semiBold, flex: 1 },
});
