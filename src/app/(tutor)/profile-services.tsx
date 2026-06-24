import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useDialog } from '@/lib/dialog/context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, PencilSimple, Trash, HandCoins } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/ui/rich-text';
import { RichField } from '@/components/tutor/rich-field';
import { getServices, createService, updateService, deleteService } from '@/lib/api/tutor-profile-api';
import type { TutorService } from '@/lib/api/tutor-profile-api';

type FormFields = Omit<TutorService, 'id' | 'description'>;

const EMPTY: FormFields = { name: '', price: null, isActive: true };

export default function ProfileServices() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { showDialog } = useDialog();
  const [editing, setEditing] = useState<TutorService | null>(null);
  const [form, setForm] = useState<FormFields>(EMPTY);
  const [description, setDescription] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({ queryKey: ['tutor-services'], queryFn: getServices, staleTime: 5 * 60_000 });

  const fullForm = () => ({ ...form, description });

  const createM = useMutation({ mutationFn: () => createService(fullForm()), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-services'] }); closeForm(); } });
  const updateM = useMutation({ mutationFn: () => updateService(editing!.id, fullForm()), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutor-services'] }); closeForm(); } });
  const deleteM = useMutation({ mutationFn: (id: string) => deleteService(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-services'] }) });

  function openAdd() { setEditing(null); setForm(EMPTY); setDescription(''); setPriceStr(''); setShowForm(true); }
  function openEdit(item: TutorService) {
    setEditing(item);
    setForm({ name: item.name, price: item.price, isActive: item.isActive });
    setDescription(item.description ?? '');
    setPriceStr(item.price != null ? String(item.price) : '');
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY); setDescription(''); setPriceStr(''); }

  function handlePriceChange(v: string) {
    setPriceStr(v);
    const n = parseFloat(v);
    setForm((f) => ({ ...f, price: isNaN(n) ? null : n }));
  }

  function confirmDelete(item: TutorService) {
    showDialog({
      title: 'Delete service',
      message: `Remove "${item.name}"?`,
      type: 'warning',
      actions: [
        { label: 'Cancel', variant: 'cancel' },
        { label: 'Delete', variant: 'destructive', onPress: () => deleteM.mutate(item.id) },
      ],
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Services</Text>
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
            <HandCoins size={40} color={theme.border} weight="thin" />
            <Text style={[styles.empty, { color: theme.textSecondary }]}>No services added yet</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth },
          ]}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                {!item.isActive && (
                  <View style={[styles.inactiveBadge, { backgroundColor: theme.surfaceEl }]}>
                    <Text style={[styles.inactiveText, { color: theme.textSecondary }]}>Inactive</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <Pressable onPress={() => openEdit(item)} hitSlop={10} style={styles.actionBtn}>
                  <PencilSimple size={16} color={theme.textSecondary} weight="regular" />
                </Pressable>
                <Pressable onPress={() => confirmDelete(item)} hitSlop={10} style={styles.actionBtn}>
                  <Trash size={16} color={theme.error} weight="regular" />
                </Pressable>
              </View>
            </View>

            {item.price != null && (
              <Text style={[styles.price, { color: theme.primary }]}>₹{item.price.toLocaleString('en-IN')}</Text>
            )}

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
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editing ? 'Edit Service' : 'Add Service'}</Text>
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
                label="Service Name *"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="e.g. 1-on-1 Mentoring"
              />
              <Input
                label="Price (₹)"
                value={priceStr}
                onChangeText={handlePriceChange}
                placeholder="e.g. 2000"
                keyboardType="numeric"
              />
              <RichField
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="What does this service include?"
                minHeight={160}
              />
              <View style={[styles.switchRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Active (visible to students)</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(v) => setForm({ ...form, isActive: v })}
                  trackColor={{ true: theme.primary }}
                />
              </View>
              <Button
                label={editing ? 'Save Changes' : 'Add Service'}
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
  cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 14, fontFamily: Fonts.semiBold, lineHeight: 20 },
  inactiveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  inactiveText: { fontSize: 10, fontFamily: Fonts.semiBold },
  cardActions: { flexDirection: 'row', gap: 12, paddingTop: 1 },
  actionBtn: { padding: 2 },
  price: { fontSize: 13, fontFamily: Fonts.bold, marginBottom: 2 },
  descWrap: { marginTop: 8 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontFamily: Fonts.bold },
  cancelText: { fontSize: 15, fontFamily: Fonts.medium },
  modalScroll: { padding: 16, gap: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  switchLabel: { fontSize: 15, fontFamily: Fonts.medium },
});
