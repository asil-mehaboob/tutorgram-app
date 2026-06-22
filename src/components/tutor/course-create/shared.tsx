import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BookOpen, ArrowRight } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import type { Category } from '@/lib/api/tutor-courses';

// ─── Shared UI ────────────────────────────────────────────────────────────────

export function ChipRow<T extends string>({
  options, value, onChange, theme,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={shared.chipWrap}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[shared.chip, {
              borderColor: sel ? theme.primary : theme.border,
              backgroundColor: sel ? theme.primaryLight : theme.surface,
            }]}
          >
            <Text style={[shared.chipText, { color: sel ? theme.primary : theme.textSecondary }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FieldLabel({
  text, required, optional, theme,
}: {
  text: string;
  required?: boolean;
  optional?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Text style={[shared.fieldLabel, { color: theme.text }]}>
      {text}
      {required && <Text style={{ color: theme.error }}> *</Text>}
      {optional && <Text style={[shared.optTag, { color: theme.textSecondary }]}> (optional)</Text>}
    </Text>
  );
}

export function SectionDivider({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return <View style={[shared.divider, { backgroundColor: theme.border }]} />;
}

export function CategoryModal({
  visible, onClose, categories, onSelect, selectedId, title = 'Select Category',
}: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  onSelect: (id: string, name: string) => void;
  selectedId: string;
  title?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={shared.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[shared.modalSheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[shared.modalHandle, { backgroundColor: theme.border }]} />
          <Text style={[shared.modalTitle, { color: theme.text }]}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={shared.catGrid}>
            {categories.map((c) => {
              const sel = c.id === selectedId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => { onSelect(c.id, c.name); onClose(); }}
                  style={[shared.catCard, {
                    borderColor: sel ? theme.primary : theme.border,
                    backgroundColor: sel ? theme.primaryLight : theme.surface,
                  }]}
                >
                  <BookOpen size={18} color={sel ? theme.primary : theme.textSecondary} weight={sel ? 'fill' : 'regular'} />
                  <Text style={[shared.catCardText, { color: sel ? theme.primary : theme.text }]} numberOfLines={2}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Delays mounting children (including any bridges/hooks inside) until delayMs has passed.
// Shows nothing while waiting — callers can wrap in a placeholder if needed.
export function DelayMount({ delayMs, children }: { delayMs: number; children: React.ReactNode }) {
  const [ready, setReady] = useState(delayMs === 0);
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(t);
  }, []);
  return ready ? <>{children}</> : null;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

export const shared = StyleSheet.create({
  stepContent: { gap: 18 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: Fonts.medium },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  optTag: { fontSize: 12, fontFamily: Fonts.regular },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  charHint: { fontSize: 11, fontFamily: Fonts.regular, textAlign: 'right', marginTop: -6 },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  selectBtnText: { flex: 1, fontSize: 14, fontFamily: Fonts.regular },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: Fonts.bold, marginBottom: 16 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: { width: '47%', borderWidth: 1, borderRadius: 10, padding: 12, gap: 8, alignItems: 'flex-start' },
  catCardText: { fontSize: 13, fontFamily: Fonts.semiBold, lineHeight: 18 },
});
