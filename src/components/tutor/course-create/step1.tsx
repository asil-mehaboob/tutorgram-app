import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookOpen, ArrowRight } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { getCategories } from '@/lib/api/tutor-courses';
import type { Category } from '@/lib/api/tutor-courses';
import { LEVELS, LANGUAGES } from './constants';
import { ChipRow, FieldLabel, SectionDivider, CategoryModal, shared } from './shared';
import type { CourseForm, DeliveryType } from './types';

type Props = {
  form: CourseForm;
  update: (changes: Partial<CourseForm>) => void;
  categories: Category[];
};

export function Step1({ form, update, categories }: Props) {
  const theme = useTheme();
  const [catOpen, setCatOpen] = useState(false);
  const [subCatOpen, setSubCatOpen] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('recorded');

  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const hasSubcats = (selectedCategory?.subCategories?.length ?? 0) > 0;

  return (
    <View style={shared.stepContent}>
      <Input
        label="Course Title *"
        value={form.title}
        onChangeText={(v) => update({ title: v })}
        placeholder="e.g. Complete React Native Development"
        maxLength={100}
      />
      <Text style={[shared.charHint, { color: form.title.length > 85 ? theme.error : theme.textSecondary }]}>
        {form.title.length}/100
      </Text>

      <SectionDivider theme={theme} />

      <FieldLabel text="Course Delivery Type" required theme={theme} />
      <View style={styles.deliveryRow}>
        <Pressable
          onPress={() => setDeliveryType('recorded')}
          style={[styles.deliveryCard, {
            borderColor: deliveryType === 'recorded' ? theme.primary : theme.border,
            backgroundColor: deliveryType === 'recorded' ? theme.primaryLight : theme.surface,
          }]}
        >
          <View style={[styles.deliveryRadio, { borderColor: deliveryType === 'recorded' ? theme.primary : theme.border }]}>
            {deliveryType === 'recorded' && <View style={[styles.deliveryRadioDot, { backgroundColor: theme.primary }]} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.deliveryLabel, { color: deliveryType === 'recorded' ? theme.primary : theme.text }]}>Recorded</Text>
            <Text style={[styles.deliveryDesc, { color: theme.textSecondary }]}>Students access anytime</Text>
          </View>
        </Pressable>

        <View style={[styles.deliveryCard, styles.deliveryCardDisabled, { borderColor: theme.border, backgroundColor: theme.surfaceEl }]}>
          <View style={[styles.deliveryRadio, { borderColor: theme.border }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.deliveryLabelRow}>
              <Text style={[styles.deliveryLabel, { color: theme.textSecondary }]}>Live</Text>
              <View style={[styles.comingSoonBadge, { backgroundColor: theme.surfaceEl, borderColor: theme.border }]}>
                <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>Coming Soon</Text>
              </View>
            </View>
            <Text style={[styles.deliveryDesc, { color: theme.textSecondary }]}>Real-time sessions</Text>
          </View>
        </View>
      </View>

      <SectionDivider theme={theme} />

      <FieldLabel text="Category" required theme={theme} />
      <Pressable
        onPress={() => setCatOpen(true)}
        style={[shared.selectBtn, { borderColor: form.categoryId ? theme.primary : theme.border, backgroundColor: theme.surface }]}
      >
        <BookOpen size={16} color={form.categoryId ? theme.primary : theme.textSecondary} weight="regular" />
        <Text style={[shared.selectBtnText, { color: form.categoryId ? theme.text : theme.textSecondary }]} numberOfLines={1}>
          {form.categoryName || 'Select a category'}
        </Text>
        <ArrowRight size={14} color={theme.textSecondary} weight="bold" />
      </Pressable>

      {hasSubcats && (
        <>
          <FieldLabel text="Subcategory" optional theme={theme} />
          <Pressable
            onPress={() => setSubCatOpen(true)}
            style={[shared.selectBtn, { borderColor: form.subCategoryId ? theme.primary : theme.border, backgroundColor: theme.surface }]}
          >
            <Text style={[shared.selectBtnText, { color: form.subCategoryId ? theme.text : theme.textSecondary }]} numberOfLines={1}>
              {form.subCategoryName || 'Select subcategory (optional)'}
            </Text>
            <ArrowRight size={14} color={theme.textSecondary} weight="bold" />
          </Pressable>
        </>
      )}

      <SectionDivider theme={theme} />

      <FieldLabel text="Level" required theme={theme} />
      <ChipRow options={LEVELS} value={form.level} onChange={(v) => update({ level: v })} theme={theme} />

      <SectionDivider theme={theme} />

      <FieldLabel text="Language" required theme={theme} />
      <ChipRow
        options={LANGUAGES.map((l) => ({ value: l, label: l }))}
        value={form.language}
        onChange={(v) => update({ language: v })}
        theme={theme}
      />

      <CategoryModal
        visible={catOpen}
        onClose={() => setCatOpen(false)}
        categories={categories}
        selectedId={form.categoryId}
        onSelect={(id, name) => update({ categoryId: id, categoryName: name, subCategoryId: '', subCategoryName: '' })}
      />

      {hasSubcats && selectedCategory && (
        <CategoryModal
          visible={subCatOpen}
          onClose={() => setSubCatOpen(false)}
          title="Select Subcategory"
          categories={selectedCategory.subCategories.map((s) => ({ id: s.id, name: s.name, subCategories: [] }))}
          selectedId={form.subCategoryId}
          onSelect={(id, name) => update({ subCategoryId: id, subCategoryName: name })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  deliveryRow: { flexDirection: 'row', gap: 10 },
  deliveryCard: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12 },
  deliveryCardDisabled: { opacity: 0.6 },
  deliveryRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  deliveryRadioDot: { width: 8, height: 8, borderRadius: 4 },
  deliveryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deliveryLabel: { fontSize: 14, fontFamily: Fonts.bold },
  deliveryDesc: { fontSize: 11, fontFamily: Fonts.regular },
  comingSoonBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  comingSoonText: { fontSize: 9, fontFamily: Fonts.semiBold, textTransform: 'uppercase', letterSpacing: 0.3 },
});
