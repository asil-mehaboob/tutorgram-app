import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Plus, Tag, Trash } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { RichField } from '@/components/tutor/rich-field';
import { FieldLabel, SectionDivider, ChipRow, shared } from './shared';
import type { CourseForm, PromoCode } from './types';

// ─── Promo code row ────────────────────────────────────────────────────────────

function PromoCodeRow({
  code, index, onUpdate, onDelete, theme,
}: {
  code: PromoCode;
  index: number;
  onUpdate: (idx: number, u: Partial<PromoCode>) => void;
  onDelete: (idx: number) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[styles.promoCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Pressable style={styles.promoCardHeader} onPress={() => setExpanded(!expanded)}>
        <Tag size={15} color={theme.primary} weight="regular" />
        <Text style={[styles.promoCardTitle, { color: theme.text }]}>
          {code.code || `Promo Code ${index + 1}`}
        </Text>
        <View style={[styles.activeBadge, { backgroundColor: code.isActive ? '#E8F5E9' : theme.surfaceEl }]}>
          <Text style={[styles.activeBadgeText, { color: code.isActive ? '#2E7D32' : theme.textSecondary }]}>
            {code.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <Pressable onPress={() => onDelete(index)} hitSlop={8}>
          <Trash size={15} color={theme.error} weight="regular" />
        </Pressable>
      </Pressable>

      {expanded && (
        <View style={[styles.promoCardBody, { borderTopColor: theme.border }]}>
          <Input
            label="Code *"
            value={code.code}
            onChangeText={(v) => onUpdate(index, { code: v.toUpperCase() })}
            placeholder="e.g. SUMMER2025"
            autoCapitalize="characters"
          />
          <FieldLabel text="Discount Type" required theme={theme} />
          <ChipRow
            options={[{ value: 'PERCENTAGE', label: 'Percentage (%)' }, { value: 'FIXED', label: 'Fixed Amount (₹)' }]}
            value={code.discountType}
            onChange={(v) => onUpdate(index, { discountType: v as 'PERCENTAGE' | 'FIXED' })}
            theme={theme}
          />
          <Input
            label="Discount Value *"
            value={code.discountValue}
            onChangeText={(v) => onUpdate(index, { discountValue: v })}
            placeholder={code.discountType === 'PERCENTAGE' ? '20' : '500'}
            keyboardType="decimal-pad"
          />
          <Input
            label="Valid From *"
            value={code.validFrom}
            onChangeText={(v) => onUpdate(index, { validFrom: v })}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="Valid Till *"
            value={code.validTill}
            onChangeText={(v) => onUpdate(index, { validTill: v })}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="Usage Limit"
            value={code.usageLimit}
            onChangeText={(v) => onUpdate(index, { usageLimit: v })}
            placeholder="Leave blank for unlimited"
            keyboardType="number-pad"
          />
          <View style={styles.activeRow}>
            <Text style={[styles.activeLabel, { color: theme.text }]}>Active</Text>
            <Switch
              value={code.isActive}
              onValueChange={(v) => onUpdate(index, { isActive: v })}
              trackColor={{ true: theme.primary }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Step 7 ────────────────────────────────────────────────────────────────────

type Props = {
  form: CourseForm;
  update: (changes: Partial<CourseForm>) => void;
};

export function Step7({ form, update }: Props) {
  const theme = useTheme();

  function updatePromo(idx: number, changes: Partial<PromoCode>) {
    const next = [...form.promoCodes];
    next[idx] = { ...next[idx], ...changes };
    update({ promoCodes: next });
  }

  function deletePromo(idx: number) {
    update({ promoCodes: form.promoCodes.filter((_, i) => i !== idx) });
  }

  function addPromo() {
    update({
      promoCodes: [...form.promoCodes, {
        code: '', discountType: 'PERCENTAGE', discountValue: '',
        validFrom: '', validTill: '', usageLimit: '', isActive: true,
      }],
    });
  }

  return (
    <View style={shared.stepContent}>
      <FieldLabel text="Course Access" required theme={theme} />

      <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>Lifetime Access</Text>
          <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>
            Students keep access indefinitely after enrolling
          </Text>
        </View>
        <Switch
          value={form.hasLifetimeAccess}
          onValueChange={(v) => update({ hasLifetimeAccess: v })}
          trackColor={{ true: theme.primary }}
        />
      </View>

      {!form.hasLifetimeAccess && (
        <Input
          label="Course Expiry Date *"
          value={form.courseExpiryDate}
          onChangeText={(v) => update({ courseExpiryDate: v })}
          placeholder="YYYY-MM-DD"
        />
      )}

      <SectionDivider theme={theme} />

      <RichField
        label="Requirements"
        value={form.requirements}
        onChangeText={(v) => update({ requirements: v })}
        placeholder="List any tools, hardware or accounts students need to take this course…"
        optional
        minHeight={100}
        rte
        aiField="Course requirements and tools needed"
        courseTitle={form.title}
      />

      {!form.isFree && (
        <>
          <SectionDivider theme={theme} />
          <View style={styles.promoHeader}>
            <Text style={[styles.promoTitle, { color: theme.text }]}>Promo Codes</Text>
            <Pressable onPress={addPromo} style={[styles.addPromoBtn, { borderColor: theme.primary }]}>
              <Plus size={14} color={theme.primary} weight="regular" />
              <Text style={[styles.addPromoBtnText, { color: theme.primary }]}>Add Code</Text>
            </Pressable>
          </View>
          {form.promoCodes.length === 0 ? (
            <Text style={[styles.noPromos, { color: theme.textSecondary }]}>
              No promo codes yet. Add one to offer discounts to students.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {form.promoCodes.map((pc, i) => (
                <PromoCodeRow key={i} code={pc} index={i} onUpdate={updatePromo} onDelete={deletePromo} theme={theme} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14 },
  toggleLabel: { fontSize: 14, fontFamily: Fonts.semiBold },
  toggleDesc: { fontSize: 12, fontFamily: Fonts.regular },
  promoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promoTitle: { fontSize: 15, fontFamily: Fonts.bold },
  addPromoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  addPromoBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  noPromos: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: 12 },
  promoCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  promoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  promoCardTitle: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadgeText: { fontSize: 11, fontFamily: Fonts.semiBold },
  promoCardBody: { padding: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  activeLabel: { fontSize: 14, fontFamily: Fonts.medium },
});
