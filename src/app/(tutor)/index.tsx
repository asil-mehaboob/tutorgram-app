import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Bell, ArrowRight, CheckCircle, XCircle, Clock, ArrowCounterClockwise } from 'phosphor-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/context';
import { Fonts, BottomTabInset } from '@/constants/theme';
import { StatusChip } from '@/components/tutor/status-chip';
import { getDashboardOverview } from '@/lib/api/tutor-dashboard';
import type { DashboardTransaction, DashboardCourse } from '@/lib/api/tutor-dashboard';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmt(n: number) {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

function TransactionStatusIcon({ status }: { status: DashboardTransaction['status'] }) {
  const theme = useTheme();
  switch (status) {
    case 'COMPLETED': return <CheckCircle size={16} color={theme.success} weight="fill" />;
    case 'FAILED': return <XCircle size={16} color={theme.error} weight="fill" />;
    case 'REFUNDED': return <ArrowCounterClockwise size={16} color={theme.textSecondary} weight="bold" />;
    default: return <Clock size={16} color={theme.star} weight="fill" />;
  }
}

function RevenueBar({ data }: { data: { month: string; revenue: number }[] }) {
  const theme = useTheme();
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const last6 = data.slice(-6);
  return (
    <View style={styles.barChart}>
      {last6.map((d) => {
        const h = Math.max(4, (d.revenue / max) * 52);
        return (
          <View key={d.month} style={styles.barCol}>
            <View style={[styles.bar, { height: h, backgroundColor: theme.primary, opacity: 0.85 }]} />
            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{d.month.slice(0, 3)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function TransactionRow({ tx, isLast }: { tx: DashboardTransaction; isLast: boolean }) {
  const theme = useTheme();
  const title = tx.courseTitle ?? tx.course ?? 'Course';
  const student = tx.studentName ?? tx.student ?? '';
  const amount = tx.amount ?? tx.price ?? 0;
  return (
    <View style={[styles.txRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <TransactionStatusIcon status={tx.status} />
      <View style={styles.txBody}>
        <Text style={[styles.txCourse, { color: theme.text }]} numberOfLines={1}>{title}</Text>
        {student ? <Text style={[styles.txStudent, { color: theme.textSecondary }]} numberOfLines={1}>{student}</Text> : null}
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: tx.status === 'COMPLETED' ? theme.success : theme.textSecondary }]}>
          {tx.status === 'REFUNDED' ? '-' : '+'}{fmt(amount)}
        </Text>
        <Text style={[styles.txDate, { color: theme.textSecondary }]}>
          {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
    </View>
  );
}

function QuickCourseRow({ course, isLast }: { course: DashboardCourse; isLast: boolean }) {
  const theme = useTheme();
  const FALLBACK = ['#7C3AED', '#2563EB', '#059669', '#EA580C'];
  const bg = FALLBACK[course.id.charCodeAt(0) % FALLBACK.length];
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/tutor-course/[id]/edit', params: { id: course.id } })}
      style={({ pressed }) => [
        styles.qcRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        { backgroundColor: pressed ? theme.surfaceEl : 'transparent' },
      ]}
    >
      {course.thumbnail ? (
        <Image source={{ uri: course.thumbnail }} style={styles.qcThumb} contentFit="cover" />
      ) : (
        <View style={[styles.qcThumb, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.qcInitial}>{course.title.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.qcBody}>
        <Text style={[styles.qcTitle, { color: theme.text }]} numberOfLines={1}>{course.title}</Text>
        <StatusChip status={course.status} small />
      </View>
      <ArrowRight size={16} color={theme.border} weight="bold" />
    </Pressable>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {children}
    </View>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction}>
          <Text style={[styles.seeAll, { color: theme.primary }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function TutorDashboard() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const user = state.status === 'authenticated' ? state.user : null;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tutor-dashboard'],
    queryFn: getDashboardOverview,
    staleTime: 2 * 60 * 1000,
  });

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'T';

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: BottomTabInset + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.headerStrip, { paddingTop: insets.top + 14, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.greetSmall, { color: theme.textSecondary }]}>{greeting()}</Text>
              <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                {user?.name?.split(' ')[0] ?? 'Tutor'}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tutor)/notifications')}
              style={({ pressed }) => [styles.bellBtn, { backgroundColor: pressed ? theme.surfaceEl : theme.background }]}
            >
              <Bell size={22} color={theme.text} weight="regular" />
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : isError ? (
          <View style={styles.errorState}>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>Failed to load dashboard</Text>
            <Pressable onPress={() => refetch()} style={[styles.retryBtn, { borderColor: theme.border }]}>
              <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
            </Pressable>
          </View>
        ) : data ? (
          <View style={styles.content}>
            {/* Stats strip */}
            {(() => {
              const s = data.stats;
              const courses = s.coursesCreated ?? s.totalCourses ?? 0;
              const students = s.studentsEnrolled ?? s.totalStudents ?? 0;
              const earnings = s.totalEarnings ?? 0;
              const monthlyRevenue = s.monthlyRevenue ?? [];

              return (
                <>
                  <View style={[styles.statsStrip, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                    {[
                      { label: 'Courses', value: String(courses) },
                      { label: 'Students', value: String(students) },
                      { label: 'Earnings', value: fmt(earnings) },
                    ].map((item, i, arr) => (
                      <View
                        key={item.label}
                        style={[
                          styles.statItem,
                          i < arr.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border },
                        ]}
                      >
                        <Text style={[styles.statValue, { color: theme.text }]}>{item.value}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{item.label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Revenue chart */}
                  {monthlyRevenue.length > 0 && (
                    <SectionCard>
                      <SectionHeader title="Revenue" />
                      <RevenueBar data={monthlyRevenue} />
                    </SectionCard>
                  )}
                </>
              );
            })()}

            {/* Recent Transactions */}
            {(data.transactions?.length ?? 0) > 0 && (
              <SectionCard>
                <SectionHeader title="Recent Transactions" action="See all" onAction={() => {}} />
                {data.transactions.slice(0, 5).map((tx, i, arr) => (
                  <TransactionRow key={tx.id} tx={tx} isLast={i === arr.length - 1} />
                ))}
              </SectionCard>
            )}

            {/* My Courses */}
            {(data.courses?.length ?? 0) > 0 && (
              <SectionCard>
                <SectionHeader title="My Courses" action="See all" onAction={() => router.push('/(tutor)/courses')} />
                {data.courses?.slice(0, 3).map((c, i, arr) => (
                  <QuickCourseRow key={c.id} course={c} isLast={i === arr.length - 1} />
                ))}
              </SectionCard>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {},
  headerStrip: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  greetSmall: { fontSize: 12, fontFamily: Fonts.regular, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  bellBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  statsStrip: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  statItem: { flex: 1, paddingVertical: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: Fonts.extraBold, letterSpacing: -0.4 },
  statLabel: { fontSize: 10, fontFamily: Fonts.medium, textTransform: 'uppercase', letterSpacing: 0.3 },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 20 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.bold },
  seeAll: { fontSize: 13, fontFamily: Fonts.semiBold },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 68,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, fontFamily: Fonts.medium },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  txBody: { flex: 1 },
  txCourse: { fontSize: 13, fontFamily: Fonts.semiBold },
  txStudent: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 1 },
  txRight: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: 13, fontFamily: Fonts.bold },
  txDate: { fontSize: 10, fontFamily: Fonts.regular },
  qcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  qcThumb: { width: 52, height: 40, borderRadius: 6 },
  qcInitial: { fontSize: 18, fontFamily: Fonts.bold, color: '#fff' },
  qcBody: { flex: 1, gap: 4 },
  qcTitle: { fontSize: 13, fontFamily: Fonts.semiBold },
  loading: { paddingVertical: 60, alignItems: 'center' },
  errorState: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  errorText: { fontSize: 15, fontFamily: Fonts.regular },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  retryText: { fontSize: 14, fontFamily: Fonts.semiBold },
});
