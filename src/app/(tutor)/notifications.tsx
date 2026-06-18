import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, CheckCircle } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';
import { getNotifications, markNotificationsRead } from '@/lib/api/tutor-dashboard';
import type { TutorNotification } from '@/lib/api/tutor-dashboard';

export default function TutorNotifications() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tutor-notifications'],
    queryFn: getNotifications,
    staleTime: 60_000,
  });

  const markRead = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-notifications'] }),
  });

  const unreadCount = (data ?? []).filter((n) => !n.isRead).length;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={() => markRead.mutate()} style={styles.markBtn}>
            <CheckCircle size={18} color={theme.primary} weight="regular" />
            <Text style={[styles.markText, { color: theme.primary }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : !data?.length ? (
        <View style={styles.center}>
          <Bell size={52} color={theme.border} weight="regular" />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotifRow item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function NotifRow({ item }: { item: TutorNotification }) {
  const theme = useTheme();
  return (
    <View style={[
      styles.notifRow,
      { borderBottomColor: theme.border, backgroundColor: item.isRead ? 'transparent' : theme.primaryLight },
    ]}>
      <View style={[styles.dot, { backgroundColor: item.isRead ? theme.border : theme.primary }]} />
      <View style={styles.notifBody}>
        <Text style={[styles.notifTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.notifMsg, { color: theme.textSecondary }]}>{item.message}</Text>
        <Text style={[styles.notifTime, { color: theme.textSecondary }]}>
          {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: Fonts.bold },
  markBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markText: { fontSize: 13, fontFamily: Fonts.semiBold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, fontFamily: Fonts.regular },
  list: { paddingVertical: 0 },
  notifRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  notifBody: { flex: 1, gap: 3 },
  notifTitle: { fontSize: 14, fontFamily: Fonts.semiBold },
  notifMsg: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 2 },
});
