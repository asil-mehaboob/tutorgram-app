import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDialog } from '@/lib/dialog/context';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getAiComplete } from '@/lib/api/tutor-courses';
import { FieldLabel, SectionDivider, shared } from './shared';
import type { CourseForm } from './types';

type Props = {
  form: CourseForm;
  update: (changes: Partial<CourseForm>) => void;
};

export function Step2({ form, update }: Props) {
  const theme = useTheme();
  const { showDialog } = useDialog();
  const [shortAiLoading, setShortAiLoading] = useState(false);
  const [detailAiLoading, setDetailAiLoading] = useState(false);

  async function handleShortDescAI() {
    setShortAiLoading(true);
    try {
      const ctx: Record<string, string> = { courseTitle: form.title };
      if (form.shortDescription.trim()) ctx.currentContent = form.shortDescription.trim().slice(0, 500);
      const result = await getAiComplete('Short course description', ctx);
      const plain = result.completion.replace(/<[^>]*>/g, '').trim().slice(0, 300);
      update({ shortDescription: plain });
    } catch (e: any) {
      showDialog({ title: 'AI Complete failed', message: e?.message ?? 'Could not generate content. Please try again.', type: 'error' });
    } finally {
      setShortAiLoading(false);
    }
  }

  async function handleDetailDescAI() {
    setDetailAiLoading(true);
    try {
      const ctx: Record<string, string> = { courseTitle: form.title };
      const current = form.detailedDescription.replace(/<[^>]*>/g, '').trim();
      if (current) ctx.currentContent = current.slice(0, 500);
      const result = await getAiComplete('Detailed course description', ctx);
      const plain = result.completion.replace(/<[^>]*>/g, '').trim();
      update({ detailedDescription: plain });
    } catch (e: any) {
      showDialog({ title: 'AI Complete failed', message: e?.message ?? 'Could not generate content. Please try again.', type: 'error' });
    } finally {
      setDetailAiLoading(false);
    }
  }

  const detailPlain = form.detailedDescription.replace(/<[^>]*>/g, '');

  return (
    <View style={shared.stepContent}>
      {/* Short Description */}
      <View style={styles.fieldWrap}>
        <View style={styles.labelRow}>
          <FieldLabel text="Short Description" required theme={theme} />
          <Pressable
            onPress={handleShortDescAI}
            disabled={shortAiLoading}
            style={[styles.aiBtn, { borderColor: theme.border, backgroundColor: theme.surface, opacity: shortAiLoading ? 0.6 : 1 }]}
          >
            <Text style={[styles.aiBtnText, { color: theme.text }]}>
              {shortAiLoading ? 'Completing…' : 'Complete with AI'}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
          Shown on course cards and search results. Keep it concise and compelling.
        </Text>
        <TextInput
          style={[styles.textarea, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
          value={form.shortDescription}
          onChangeText={(v) => update({ shortDescription: v.slice(0, 300) })}
          placeholder="1–2 lines shown on course cards…"
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={3}
          maxLength={300}
          textAlignVertical="top"
        />
        <Text style={[shared.charHint, { color: form.shortDescription.length > 270 ? theme.error : theme.textSecondary }]}>
          {form.shortDescription.length}/300
        </Text>
      </View>

      <SectionDivider theme={theme} />

      {/* Detailed Description */}
      <View style={styles.fieldWrap}>
        <View style={styles.labelRow}>
          <FieldLabel text="Detailed Description" required theme={theme} />
          <Pressable
            onPress={handleDetailDescAI}
            disabled={detailAiLoading}
            style={[styles.aiBtn, { borderColor: theme.border, backgroundColor: theme.surface, opacity: detailAiLoading ? 0.6 : 1 }]}
          >
            <Text style={[styles.aiBtnText, { color: theme.text }]}>
              {detailAiLoading ? 'Completing…' : 'Complete with AI'}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
          Give students a thorough understanding of what they'll get from this course.
        </Text>
        <TextInput
          style={[styles.textarea, styles.textareaLarge, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
          value={detailPlain}
          onChangeText={(v) => update({ detailedDescription: v })}
          placeholder="Describe the course in detail — what students will learn, who it's for, what makes it unique…"
          placeholderTextColor={theme.textSecondary}
          multiline
          textAlignVertical="top"
        />
        <Text style={[shared.charHint, { color: detailPlain.length > 0 && detailPlain.length < 50 ? theme.error : theme.textSecondary }]}>
          {detailPlain.length} chars (min 50)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldHint: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 16 },
  textarea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.regular,
    minHeight: 90,
  },
  textareaLarge: {
    minHeight: 200,
  },
  aiBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  aiBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
});
