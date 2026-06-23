import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDialog } from '@/lib/dialog/context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, PencilSimple, Trash } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getEducation, createEducation, updateEducation, deleteEducation } from '@/lib/api/tutor-profile-api';
import type { TutorEducation } from '@/lib/api/tutor-profile-api';

const EMPTY: Omit<TutorEducation, 'id'> = { institution: '', degree: '', field: '', startDate: '', endDate: null, description: '' };

export default function ProfileEducation() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { showDialog } = useDialog();
  const [editing, setEditing] = useState<TutorEducation | null>(null);
  const [form, setForm] = useState<Omit<TutorEducation, 'id'>>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({ queryKey: ['tutor-education'], queryFn: getEducation, staleTime: 5 * 60_000 });
  const createM = useMutation({ mutationFn: () => createEducation(form), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-education'] }); closeForm(); } });
  const updateM = useMutation({ mutationFn: () => updateEducation(editing!.id, form), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-education'] }); closeForm(); } });
  const deleteM = useMutation({ mutationFn: (id: string) => deleteEducation(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-education'] }) });

  function openAdd() { setEditing(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(item: TutorEducation) { setEditing(item); setForm({ institution: item.institution, degree: item.degree, field: item.field ?? '', startDate: item.startDate, endDate: item.endDate, description: item.description ?? '' }); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY); }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}><ArrowLeft size={22} color={theme.text} weight="regular" /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Education</Text>
        <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8}>
          <Plus size={22} color={theme.primary} weight="regular" />
        </Pressable>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.textSecondary }]}>No education added yet</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.degree}{item.field ? ` in ${item.field}` : ''}</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{item.institution}</Text>
              <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{item.startDate}{item.endDate ? ` — ${item.endDate}` : ''}</Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable onPress={() => openEdit(item)} hitSlop={8}><PencilSimple size={18} color={theme.textSecondary} weight="regular" /></Pressable>
              <Pressable onPress={() => showDialog({ title: 'Delete', message: `Remove "${item.degree}"?`, type: 'warning', actions: [{ label: 'Cancel', variant: 'cancel' }, { label: 'Delete', variant: 'destructive', onPress: () => deleteM.mutate(item.id) }] })} hitSlop={8}><Trash size={18} color={theme.error} weight="regular" /></Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Edit Education' : 'Add Education'}</Text>
            <Pressable onPress={closeForm}><Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Input label="Institution *" value={form.institution} onChangeText={(v) => setForm({ ...form, institution: v })} placeholder="University or school name" />
            <Input label="Degree *" value={form.degree} onChangeText={(v) => setForm({ ...form, degree: v })} placeholder="e.g. B.Tech, MBA" />
            <Input label="Field of Study" value={form.field ?? ''} onChangeText={(v) => setForm({ ...form, field: v })} placeholder="e.g. Computer Science" />
            <Input label="Start Year" value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} placeholder="e.g. 2016" />
            <Input label="End Year" value={form.endDate ?? ''} onChangeText={(v) => setForm({ ...form, endDate: v })} placeholder="e.g. 2020 (or leave blank)" />
            <Button label="Save" onPress={() => editing ? updateM.mutate() : createM.mutate()} loading={createM.isPending || updateM.isPending} />
          </ScrollView>
        </View>
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
  list: { padding: Spacing.three, gap: 10 },
  empty: { textAlign: 'center', fontSize: 15, fontFamily: Fonts.regular, paddingVertical: 40 },
  card: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 14, fontFamily: Fonts.semiBold },
  cardSub: { fontSize: 13, fontFamily: Fonts.regular },
  cardDate: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 16, paddingTop: 2 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontFamily: Fonts.bold },
  cancelText: { fontSize: 15, fontFamily: Fonts.medium },
  modalScroll: { padding: 16, gap: 14 },
});
