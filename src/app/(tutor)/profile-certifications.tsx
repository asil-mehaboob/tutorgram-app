import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, PencilSimple, Trash } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getCertifications, createCertification, updateCertification, deleteCertification } from '@/lib/api/tutor-profile-api';
import type { TutorCertification } from '@/lib/api/tutor-profile-api';

const EMPTY: Omit<TutorCertification, 'id'> = { name: '', issuer: '', issueDate: null, expiryDate: null, credentialId: null, credentialUrl: null };

export default function ProfileCertifications() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TutorCertification | null>(null);
  const [form, setForm] = useState<Omit<TutorCertification, 'id'>>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({ queryKey: ['tutor-certifications'], queryFn: getCertifications, staleTime: 5 * 60_000 });
  const createM = useMutation({ mutationFn: () => createCertification(form), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-certifications'] }); closeForm(); } });
  const updateM = useMutation({ mutationFn: () => updateCertification(editing!.id, form), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-certifications'] }); closeForm(); } });
  const deleteM = useMutation({ mutationFn: (id: string) => deleteCertification(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-certifications'] }) });

  function openAdd() { setEditing(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(item: TutorCertification) { setEditing(item); setForm({ name: item.name, issuer: item.issuer, issueDate: item.issueDate, expiryDate: item.expiryDate, credentialId: item.credentialId, credentialUrl: item.credentialUrl }); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY); }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}><ArrowLeft size={22} color={theme.text} weight="regular" /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Certifications</Text>
        <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8}><Plus size={22} color={theme.primary} weight="regular" /></Pressable>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.textSecondary }]}>No certifications added yet</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{item.issuer}</Text>
              {(item.issueDate || item.expiryDate) && (
                <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                  {item.issueDate}{item.expiryDate ? ` — ${item.expiryDate}` : ''}
                </Text>
              )}
              {item.credentialId && <Text style={[styles.cardDate, { color: theme.textSecondary }]}>ID: {item.credentialId}</Text>}
            </View>
            <View style={styles.cardActions}>
              <Pressable onPress={() => openEdit(item)} hitSlop={8}><PencilSimple size={18} color={theme.textSecondary} weight="regular" /></Pressable>
              <Pressable onPress={() => Alert.alert('Delete', `Remove "${item.name}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteM.mutate(item.id) }])} hitSlop={8}><Trash size={18} color={theme.error} weight="regular" /></Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Edit Certification' : 'Add Certification'}</Text>
            <Pressable onPress={closeForm}><Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Input label="Certificate Name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. AWS Solutions Architect" />
            <Input label="Issuing Organization *" value={form.issuer} onChangeText={(v) => setForm({ ...form, issuer: v })} placeholder="e.g. Amazon Web Services" />
            <Input label="Issue Date" value={form.issueDate ?? ''} onChangeText={(v) => setForm({ ...form, issueDate: v })} placeholder="e.g. Mar 2022" />
            <Input label="Expiry Date" value={form.expiryDate ?? ''} onChangeText={(v) => setForm({ ...form, expiryDate: v })} placeholder="e.g. Mar 2025 (leave blank if no expiry)" />
            <Input label="Credential ID" value={form.credentialId ?? ''} onChangeText={(v) => setForm({ ...form, credentialId: v })} placeholder="Credential ID (optional)" />
            <Input label="Credential URL" value={form.credentialUrl ?? ''} onChangeText={(v) => setForm({ ...form, credentialUrl: v })} placeholder="https://..." autoCapitalize="none" />
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
