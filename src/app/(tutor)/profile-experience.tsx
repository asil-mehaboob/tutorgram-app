import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, PencilSimple, Trash } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getExperience, createExperience, updateExperience, deleteExperience } from '@/lib/api/tutor-profile-api';
import type { TutorExperience } from '@/lib/api/tutor-profile-api';

const EMPTY: Omit<TutorExperience, 'id'> = { title: '', company: '', location: '', startDate: '', endDate: null, isCurrent: false, description: '' };

export default function ProfileExperience() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TutorExperience | null>(null);
  const [form, setForm] = useState<Omit<TutorExperience, 'id'>>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({ queryKey: ['tutor-experience'], queryFn: getExperience, staleTime: 5 * 60_000 });

  const createM = useMutation({ mutationFn: () => createExperience(form), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-experience'] }); closeForm(); } });
  const updateM = useMutation({ mutationFn: () => updateExperience(editing!.id, form), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-experience'] }); closeForm(); } });
  const deleteM = useMutation({ mutationFn: (id: string) => deleteExperience(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-experience'] }) });

  function openAdd() { setEditing(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(item: TutorExperience) { setEditing(item); setForm({ title: item.title, company: item.company, location: item.location ?? '', startDate: item.startDate, endDate: item.endDate, isCurrent: item.isCurrent, description: item.description ?? '' }); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY); }

  function confirmDelete(item: TutorExperience) {
    Alert.alert('Delete', `Remove "${item.title} at ${item.company}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteM.mutate(item.id) },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Experience</Text>
        <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8}>
          <Plus size={22} color={theme.primary} weight="regular" />
        </Pressable>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.textSecondary }]}>No experience added yet</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{item.company}{item.location ? ` · ${item.location}` : ''}</Text>
              <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                {item.startDate}{item.isCurrent ? ' — Present' : item.endDate ? ` — ${item.endDate}` : ''}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable onPress={() => openEdit(item)} hitSlop={8}>
                <PencilSimple size={18} color={theme.textSecondary} weight="regular" />
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                <Trash size={18} color={theme.error} weight="regular" />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Edit Experience' : 'Add Experience'}</Text>
            <Pressable onPress={closeForm}><Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Input label="Job Title *" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="e.g. Senior Developer" />
            <Input label="Company *" value={form.company} onChangeText={(v) => setForm({ ...form, company: v })} placeholder="Company name" />
            <Input label="Location" value={form.location ?? ''} onChangeText={(v) => setForm({ ...form, location: v })} placeholder="e.g. Bangalore, India" />
            <Input label="Start Date" value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} placeholder="e.g. Jan 2020" />
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Currently working here</Text>
              <Switch value={form.isCurrent} onValueChange={(v) => setForm({ ...form, isCurrent: v })} trackColor={{ true: theme.primary }} />
            </View>
            {!form.isCurrent && (
              <Input label="End Date" value={form.endDate ?? ''} onChangeText={(v) => setForm({ ...form, endDate: v })} placeholder="e.g. Dec 2023" />
            )}
            <Input label="Description" value={form.description ?? ''} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Describe your role..." multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top' }} />
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchLabel: { fontSize: 15, fontFamily: Fonts.medium },
});
