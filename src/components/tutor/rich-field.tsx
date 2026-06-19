import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  TextB, TextItalic, ListBullets, ListNumbers, TextHOne, Quotes,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getAiComplete } from '@/lib/api/tutor-courses';

type RichFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  maxLength?: number;
  minHeight?: number;
  aiField?: string;
  courseTitle?: string;
  rte?: boolean;
};

type Selection = { start: number; end: number };

function insertAround(text: string, sel: Selection, before: string, after = before): string {
  const selected = text.slice(sel.start, sel.end);
  return text.slice(0, sel.start) + before + (selected || 'text') + after + text.slice(sel.end);
}

function insertLinePrefix(text: string, sel: Selection, prefix: string): string {
  const lineStart = text.lastIndexOf('\n', sel.start - 1) + 1;
  const lineText = text.slice(lineStart, sel.end);
  const lines = lineText.split('\n');
  const prefixed = lines.map((l) => {
    if (l.startsWith(prefix)) return l;
    return prefix + l;
  }).join('\n');
  return text.slice(0, lineStart) + prefixed + text.slice(sel.end);
}

function insertNumberedList(text: string, sel: Selection): string {
  const lineStart = text.lastIndexOf('\n', sel.start - 1) + 1;
  const lineText = text.slice(lineStart, sel.end);
  const lines = lineText.split('\n');
  let n = 1;
  const prefixed = lines.map((l) => `${n++}. ${l}`).join('\n');
  return text.slice(0, lineStart) + prefixed + text.slice(sel.end);
}

export function RichField({
  label, value, onChangeText, placeholder, required, optional,
  maxLength, minHeight = 120, aiField, courseTitle, rte = false,
}: RichFieldProps) {
  const theme = useTheme();
  const [aiLoading, setAiLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const selRef = useRef<Selection>({ start: 0, end: 0 });
  const inputRef = useRef<TextInput>(null);

  async function handleAiComplete() {
    if (!aiField) return;
    setAiLoading(true);
    try {
      const ctx: Record<string, string> = { courseTitle: courseTitle ?? '' };
      if (value.trim()) ctx.currentContent = value.trim().slice(0, 500);
      const result = await getAiComplete(aiField, ctx);
      onChangeText(result.completion);
    } catch (e: any) {
      Alert.alert('AI Complete failed', e?.message ?? 'Could not generate content. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  function applyFormat(type: 'bold' | 'italic' | 'bullet' | 'numbered' | 'heading' | 'quote') {
    const sel = selRef.current;
    let next = value;
    switch (type) {
      case 'bold': next = insertAround(value, sel, '**'); break;
      case 'italic': next = insertAround(value, sel, '_'); break;
      case 'bullet': next = insertLinePrefix(value, sel, '• '); break;
      case 'numbered': next = insertNumberedList(value, sel); break;
      case 'heading': next = insertLinePrefix(value, sel, '## '); break;
      case 'quote': next = insertLinePrefix(value, sel, '> '); break;
    }
    onChangeText(next);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const over = maxLength && value.length >= maxLength * 0.9;

  return (
    <View style={styles.container}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.text }]}>
          {label}
          {required && <Text style={{ color: theme.error }}> *</Text>}
          {optional && <Text style={[styles.optionalTag, { color: theme.textSecondary }]}> (optional)</Text>}
        </Text>
        {aiField && (
          <Pressable
            onPress={handleAiComplete}
            disabled={aiLoading}
            style={[styles.aiBtn, { borderColor: theme.border, backgroundColor: theme.surface, opacity: aiLoading ? 0.6 : 1 }]}
          >
            <Text style={[styles.aiBtnText, { color: theme.text }]}>
              {aiLoading ? 'Completing...' : 'Complete with AI'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* RTE toolbar */}
      {rte && (
        <View style={[styles.toolbar, { backgroundColor: theme.surfaceEl, borderColor: theme.border }]}>
          {([
            { type: 'bold', icon: <TextB size={15} color={theme.text} weight="bold" /> },
            { type: 'italic', icon: <TextItalic size={15} color={theme.text} weight="regular" /> },
            { type: 'heading', icon: <TextHOne size={15} color={theme.text} weight="regular" /> },
            { type: 'quote', icon: <Quotes size={15} color={theme.text} weight="regular" /> },
            { type: 'bullet', icon: <ListBullets size={15} color={theme.text} weight="regular" /> },
            { type: 'numbered', icon: <ListNumbers size={15} color={theme.text} weight="regular" /> },
          ] as { type: Parameters<typeof applyFormat>[0]; icon: React.ReactNode }[]).map((btn) => (
            <Pressable
              key={btn.type}
              onPress={() => applyFormat(btn.type)}
              style={({ pressed }) => [styles.toolbarBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              {btn.icon}
            </Pressable>
          ))}
        </View>
      )}

      {/* Input */}
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          rte && styles.inputRte,
          { borderColor: focused ? theme.primary : theme.border, backgroundColor: theme.surface, color: theme.text, minHeight },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline
        textAlignVertical="top"
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSelectionChange={(e) => { selRef.current = e.nativeEvent.selection; }}
      />

      {maxLength && (
        <Text style={[styles.charCount, { color: over ? theme.error : theme.textSecondary }]}>
          {value.length} / {maxLength}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, flexShrink: 1 },
  optionalTag: { fontSize: 12, fontFamily: Fonts.regular },
  aiBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  aiBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  toolbar: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
  toolbarBtn: { padding: 8, borderRadius: 6 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  inputRte: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  charCount: { fontSize: 11, fontFamily: Fonts.regular, textAlign: 'right' },
});
