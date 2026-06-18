import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Receipt, CheckCircle, XCircle, Clock } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getTransactions } from '@/lib/api/commerce';
import type { TransactionRecord } from '@/lib/api/commerce';

const STATUS_CONFIG = {
  COMPLETED: { label: 'Paid', Icon: CheckCircle },
  PENDING: { label: 'Pending', Icon: Clock },
  FAILED: { label: 'Failed', Icon: XCircle },
  REFUNDED: { label: 'Refunded', Icon: ArrowLeft },
};

function statusColor(status: string, theme: ReturnType<typeof useTheme>): string {
  switch (status) {
    case 'COMPLETED': return theme.success;
    case 'PENDING': return theme.star;
    case 'FAILED': return theme.error;
    default: return theme.textSecondary;
  }
}

export default function PurchaseHistoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions({ limit: 50 }),
  });

  const transactions: TransactionRecord[] = data?.items ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Purchase History</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={[styles.stateTitle, { color: theme.text }]}>Failed to load</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && transactions.length === 0 && (
        <View style={styles.center}>
          <Receipt size={48} color={theme.border} weight="regular" />
          <Text style={[styles.stateTitle, { color: theme.text }]}>No purchases yet</Text>
          <Text style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
            Your course purchases will appear here.
          </Text>
        </View>
      )}

      {!isLoading && !isError && transactions.length > 0 && (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} theme={theme} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function TransactionRow({ tx, theme }: { tx: TransactionRecord; theme: ReturnType<typeof useTheme> }) {
  const cfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.PENDING;
  const color = statusColor(tx.status, theme);
  const date = new Date(tx.paidAt ?? tx.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const amount = `${tx.currency} ${tx.finalAmount.toLocaleString('en-IN')}`;

  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {tx.course.thumbnail ? (
        <Image source={{ uri: tx.course.thumbnail }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: theme.surfaceEl, justifyContent: 'center', alignItems: 'center' }]}>
          <Receipt size={22} color={theme.border} weight="regular" />
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={2}>
          {tx.course.title}
        </Text>
        <Text style={[styles.date, { color: theme.textSecondary }]}>{date}</Text>
        <View style={styles.metaRow}>
          <cfg.Icon size={13} color={color} weight="fill" />
          <Text style={[styles.status, { color: color }]}>{cfg.label}</Text>
          <Text style={[styles.dot, { color: theme.border }]}>·</Text>
          <Text style={[styles.amount, { color: theme.text }]}>{amount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontFamily: Fonts.bold, letterSpacing: -0.2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  stateTitle: { fontSize: 17, fontFamily: Fonts.bold, letterSpacing: -0.3, textAlign: 'center' },
  stateSubtitle: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 8 },
  retryText: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  row: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  thumb: { width: 90, flexShrink: 0 },
  rowBody: { flex: 1, padding: 12, gap: 4 },
  courseTitle: { fontSize: 13, fontFamily: Fonts.bold, lineHeight: 18 },
  date: { fontSize: 11, fontFamily: Fonts.regular },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  status: { fontSize: 12, fontFamily: Fonts.semiBold },
  dot: { fontSize: 10 },
  amount: { fontSize: 13, fontFamily: Fonts.bold },
});
