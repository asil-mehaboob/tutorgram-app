import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDialog } from '@/lib/dialog/context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, PencilSimple, Trash, GraduationCap, CalendarBlank } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/ui/rich-text';
import { RichField } from '@/components/tutor/rich-field';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { getEducation, createEducation, updateEducation, deleteEducation } from '@/lib/api/tutor-profile-api';
import type { TutorEducation } from '@/lib/api/tutor-profile-api';

type FormFields = Omit<TutorEducation, 'id' | 'description'>;

const EMPTY: FormFields = { institution: '', degree: '', field: '', startDate: '', endDate: null };

// Parses YYYY-MM-DD / ISO strings without timezone shift
function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const parts = value.split('T')[0].split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (!year) return value;
  if (!month) return String(year);
  return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function toStorageDate(display: string): string {
  if (!display) return '';
  if (/^\d{4}-\d{2}/.test(display)) return display;
  const d = new Date(display);
  if (isNaN(d.getTime())) return display;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.datePressable, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <CalendarBlank size={18} color={theme.textSecondary} weight="regular" />
        <Text style={[styles.dateValue, { color: value ? theme.text : theme.textSecondary }]}>
          {value ? formatDate(value) : 'Select month & year'}
        </Text>
      </Pressable>
      <MonthYearPicker
        visible={open}
        value={value}
        label={label}
        onConfirm={(v) => { onChange(toStorageDate(v)); setOpen(false); }}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
}

export default function ProfileEducation() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { showDialog } = useDialog();

  const [editing, setEditing] = useState<TutorEducation | null>(null);
  const [form, setForm] = useState<FormFields>(EMPTY);
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({ queryKey: ['tutor-education'], queryFn: getEducation, staleTime: 5 * 60_000 });

  const fullForm = () => ({ ...form, description });

  const createM = useMutation({ mutationFn: () => createEducation(fullForm()), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-education'] }); closeForm(); } });
  const updateM = useMutation({ mutationFn: () => updateEducation(editing!.id, fullForm()), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-education'] }); closeForm(); } });
  const deleteM = useMutation({ mutationFn: (id: string) => deleteEducation(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-education'] }) });

  function openAdd() { setEditing(null); setForm(EMPTY); setDescription(''); setShowForm(true); }
  function openEdit(item: TutorEducation) {
    setEditing(item);
    setForm({ institution: item.institution, degree: item.degree, field: item.field ?? '', startDate: item.startDate, endDate: item.endDate });
    setDescription(item.description ?? '');
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY); setDescription(''); }

  function confirmDelete(item: TutorEducation) {
    showDialog({
      title: 'Delete education',
      message: `Remove "${item.degree}${item.field ? ` in ${item.field}` : ''}"?`,
      type: 'warning',
      actions: [
        { label: 'Cancel', variant: 'cancel' },
        { label: 'Delete', variant: 'destructive', onPress: () => deleteM.mutate(item.id) },
      ],
    });
  }

  const dateRange = (item: TutorEducation) => {
    const start = formatDate(item.startDate);
    const end = formatDate(item.endDate);
    if (!start && !end) return '';
    if (!end) return start;
    if (!start) return end;
    return `${start} – ${end}`;
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Education</Text>
        <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8}>
          <Plus size={22} color={theme.primary} weight="regular" />
        </Pressable>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <GraduationCap size={40} color={theme.border} weight="thin" />
            <Text style={[styles.empty, { color: theme.textSecondary }]}>No education added yet</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth },
          ]}>
            {/* Top row: degree + actions */}
            <View style={styles.cardTopRow}>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                {item.degree}{item.field ? ` in ${item.field}` : ''}
              </Text>
              <View style={styles.cardActions}>
                <Pressable onPress={() => openEdit(item)} hitSlop={10} style={styles.actionBtn}>
                  <PencilSimple size={16} color={theme.textSecondary} weight="regular" />
                </Pressable>
                <Pressable onPress={() => confirmDelete(item)} hitSlop={10} style={styles.actionBtn}>
                  <Trash size={16} color={theme.error} weight="regular" />
                </Pressable>
              </View>
            </View>

            {/* Institution */}
            <Text style={[styles.cardInstitution, { color: theme.textSecondary }]}>{item.institution}</Text>

            {/* Date range */}
            {!!dateRange(item) && (
              <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{dateRange(item)}</Text>
            )}

            {/* Description */}
            {!!item.description && (
              <View style={styles.descWrap}>
                <RichText html={item.description} />
              </View>
            )}
          </View>
        )}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Edit Education' : 'Add Education'}</Text>
              <Pressable onPress={closeForm} hitSlop={8}>
                <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={[styles.modalScroll, { paddingBottom: insets.bottom + 32 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Input
                label="Institution *"
                value={form.institution}
                onChangeText={(v) => setForm({ ...form, institution: v })}
                placeholder="University or school name"
              />
              <Input
                label="Degree *"
                value={form.degree}
                onChangeText={(v) => setForm({ ...form, degree: v })}
                placeholder="e.g. B.Tech, MBA, B.Sc"
              />
              <Input
                label="Field of Study"
                value={form.field ?? ''}
                onChangeText={(v) => setForm({ ...form, field: v })}
                placeholder="e.g. Computer Science"
              />
              <DateField
                label="Start Date"
                value={form.startDate}
                onChange={(v) => setForm({ ...form, startDate: v })}
              />
              <DateField
                label="End Date"
                value={form.endDate ?? ''}
                onChange={(v) => setForm({ ...form, endDate: v || null })}
              />
              <RichField
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your studies, achievements, activities..."
                minHeight={160}
              />
              <Button
                label={editing ? 'Save Changes' : 'Add Education'}
                onPress={() => editing ? updateM.mutate() : createM.mutate()}
                loading={createM.isPending || updateM.isPending}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: Fonts.bold },
  addBtn: { padding: 4 },
  list: { paddingTop: 8 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  empty: { fontSize: 14, fontFamily: Fonts.regular },
  card: { paddingHorizontal: Spacing.three, paddingVertical: 16, borderTopWidth: 0 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  cardTitle: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: 12, paddingTop: 1 },
  actionBtn: { padding: 2 },
  cardInstitution: { fontSize: 13, fontFamily: Fonts.regular, marginBottom: 3 },
  cardDate: { fontSize: 12, fontFamily: Fonts.regular, marginBottom: 2 },
  descWrap: { marginTop: 8 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontFamily: Fonts.bold },
  cancelText: { fontSize: 15, fontFamily: Fonts.medium },
  modalScroll: { padding: 16, gap: 14 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold, letterSpacing: 0.1 },
  datePressable: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14 },
  dateValue: { fontSize: 15, fontFamily: Fonts.medium },
});
