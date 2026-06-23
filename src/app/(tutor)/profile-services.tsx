import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useDialog } from '@/lib/dialog/context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, PencilSimple, Trash } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getServices, createService, updateService, deleteService } from '@/lib/api/tutor-profile-api';
import type { TutorService } from '@/lib/api/tutor-profile-api';

const EMPTY: Omit<TutorService, 'id'> = { name: '', description: null, price: null, isActive: true };

export default function ProfileServices() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { showDialog } = useDialog();
  const [editing, setEditing] = useState<TutorService | null>(null);
  const [form, setForm] = useState<Omit<TutorService, 'id'>>(EMPTY);
  const [priceStr, setPriceStr] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({ queryKey: ['tutor-services'], queryFn: getServices, staleTime: 5 * 60_000 });
  const createM = useMutation({ mutationFn: () => createService(form), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-services'] }); closeForm(); } });
  const updateM = useMutation({ mutationFn: () => updateService(editing!.id, form), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-services'] }); closeForm(); } });
  const deleteM = useMutation({ mutationFn: (id: string) => deleteService(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-services'] }) });

  function openAdd() { setEditing(null); setForm(EMPTY); setPriceStr(''); setShowForm(true); }
  function openEdit(item: TutorService) { setEditing(item); setForm({ name: item.name, description: item.description, price: item.price, isActive: item.isActive }); setPriceStr(item.price != null ? String(item.price) : ''); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY); setPriceStr(''); }

  function handlePriceChange(v: string) {
    setPriceStr(v);
    const n = parseFloat(v);
    setForm((f) => ({ ...f, price: isNaN(n) ? null : n }));
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}><ArrowLeft size={22} color={theme.text} weight="regular" /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Services</Text>
        <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8}><Plus size={22} color={theme.primary} weight="regular" /></Pressable>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.textSecondary }]}>No services added yet</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
                {!item.isActive && (
                  <View style={[styles.inactiveBadge, { backgroundColor: theme.surfaceEl }]}>
                    <Text style={[styles.inactiveText, { color: theme.textSecondary }]}>Inactive</Text>
                  </View>
                )}
              </View>
              {item.description && <Text style={[styles.cardSub, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text>}
              {item.price != null && <Text style={[styles.price, { color: theme.primary }]}>₹{item.price.toLocaleString('en-IN')}</Text>}
            </View>
            <View style={styles.cardActions}>
              <Pressable onPress={() => openEdit(item)} hitSlop={8}><PencilSimple size={18} color={theme.textSecondary} weight="regular" /></Pressable>
              <Pressable onPress={() => showDialog({ title: 'Delete', message: `Remove "${item.name}"?`, type: 'warning', actions: [{ label: 'Cancel', variant: 'cancel' }, { label: 'Delete', variant: 'destructive', onPress: () => deleteM.mutate(item.id) }] })} hitSlop={8}><Trash size={18} color={theme.error} weight="regular" /></Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Edit Service' : 'Add Service'}</Text>
            <Pressable onPress={closeForm}><Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Input label="Service Name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. 1-on-1 Mentoring" />
            <Input label="Description" value={form.description ?? ''} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="What does this service include?" multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
            <Input label="Price (₹)" value={priceStr} onChangeText={handlePriceChange} placeholder="e.g. 2000" keyboardType="numeric" />
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Active</Text>
              <Switch value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} trackColor={{ true: theme.primary }} />
            </View>
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
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontFamily: Fonts.semiBold },
  cardSub: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17 },
  price: { fontSize: 13, fontFamily: Fonts.bold },
  inactiveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  inactiveText: { fontSize: 10, fontFamily: Fonts.semiBold },
  cardActions: { flexDirection: 'row', gap: 16, paddingTop: 2 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontFamily: Fonts.bold },
  cancelText: { fontSize: 15, fontFamily: Fonts.medium },
  modalScroll: { padding: 16, gap: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchLabel: { fontSize: 15, fontFamily: Fonts.medium },
});
