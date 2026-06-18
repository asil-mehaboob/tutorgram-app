import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Star, CurrencyInr, Users, ChartBar } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing, BottomTabInset } from '@/constants/theme';
import { StatTile } from '@/components/tutor/stat-tile';
import { getPerformanceOverview, getRevenueData } from '@/lib/api/tutor-performance';

function BarChart({ data }: { data: { month: string; revenue: number }[] }) {
  const theme = useTheme();
  const last6 = data.slice(-6);
  const max = Math.max(...last6.map((d) => d.revenue), 1);

  return (
    <View style={styles.barChart}>
      {last6.map((d) => {
        const h = Math.max(4, (d.revenue / max) * 80);
        return (
          <View key={d.month} style={styles.barCol}>
            <Text style={[styles.barValue, { color: theme.primary }]}>
              {d.revenue > 0 ? `₹${(d.revenue / 1000).toFixed(0)}K` : ''}
            </Text>
            <View style={[styles.bar, { height: h, backgroundColor: theme.primary, opacity: 0.8 }]} />
            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{d.month.slice(0, 3)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function StarDistribution({ distribution }: { distribution: { stars: number; count: number; percentage: number }[] }) {
  const theme = useTheme();
  const sorted = [...distribution].sort((a, b) => b.stars - a.stars);

  return (
    <View style={styles.starDist}>
      {sorted.map((d) => (
        <View key={d.stars} style={styles.starRow}>
          <View style={styles.starLabel}>
            <Star size={12} color={theme.star} weight="fill" />
            <Text style={[styles.starNum, { color: theme.textSecondary }]}>{d.stars}</Text>
          </View>
          <View style={[styles.distTrack, { backgroundColor: theme.surfaceEl }]}>
            <View style={[styles.distFill, { width: `${d.percentage}%`, backgroundColor: theme.star }]} />
          </View>
          <Text style={[styles.distPct, { color: theme.textSecondary }]}>{d.percentage.toFixed(0)}%</Text>
        </View>
      ))}
    </View>
  );
}

export default function TutorPerformance() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const overviewQ = useQuery({
    queryKey: ['tutor-performance-overview'],
    queryFn: getPerformanceOverview,
    staleTime: 5 * 60_000,
  });

  const revenueQ = useQuery({
    queryKey: ['tutor-revenue'],
    queryFn: getRevenueData,
    staleTime: 5 * 60_000,
  });

  const d = overviewQ.data;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Analytics</Text>
      </View>

      {overviewQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : overviewQ.isError ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Failed to load analytics</Text>
        </View>
      ) : d ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: BottomTabInset + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary tiles */}
          <View style={styles.statsRow}>
            <StatTile label="Revenue" value={`₹${(d.totalRevenue / 1000).toFixed(0)}K`} accent="#EC7211" />
            <StatTile label="Rating" value={d.avgRating.toFixed(1)} subValue="avg" accent={theme.star} />
          </View>
          <View style={styles.statsRow}>
            <StatTile label="Enrollments" value={d.totalEnrollments} accent="#059669" />
            <StatTile label="Completion" value={`${d.completionRate.toFixed(0)}%`} accent={theme.primary} />
          </View>

          {/* Revenue chart */}
          {d.monthlyRevenue?.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly Revenue</Text>
              <BarChart data={d.monthlyRevenue} />
            </View>
          )}

          {/* Top courses by revenue */}
          {(revenueQ.data?.courses?.length ?? 0) > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Top Courses</Text>
              {revenueQ.data?.courses.slice(0, 5).map((c, i) => (
                <View key={c.courseId} style={[styles.rankRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.rankNum, { color: theme.textSecondary }]}>#{i + 1}</Text>
                  <View style={styles.rankBody}>
                    <Text style={[styles.rankTitle, { color: theme.text }]} numberOfLines={1}>{c.title}</Text>
                    <View style={styles.rankMeta}>
                      <Users size={11} color={theme.textSecondary} weight="bold" />
                      <Text style={[styles.rankMetaText, { color: theme.textSecondary }]}>{c.enrollments}</Text>
                    </View>
                  </View>
                  <Text style={[styles.rankRevenue, { color: theme.primary }]}>
                    ₹{(c.revenue / 1000).toFixed(0)}K
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Rating distribution */}
          {d.ratingDistribution?.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Review Breakdown</Text>
                <View style={styles.ratingBig}>
                  <Text style={[styles.ratingNum, { color: theme.text }]}>{d.avgRating.toFixed(1)}</Text>
                  <Star size={16} color={theme.star} weight="fill" />
                </View>
              </View>
              <StarDistribution distribution={d.ratingDistribution.map((r) => ({ ...r, percentage: r.percentage ?? 0 }))} />
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 26, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, fontFamily: Fonts.regular },
  scroll: { padding: Spacing.three, gap: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  cardTitle: { fontSize: 15, fontFamily: Fonts.bold },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingBig: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingNum: { fontSize: 22, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 },
  barCol: { flex: 1, alignItems: 'center', gap: 3 },
  barValue: { fontSize: 9, fontFamily: Fonts.semiBold },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, fontFamily: Fonts.medium },
  starDist: { gap: 8 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starLabel: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 28 },
  starNum: { fontSize: 11, fontFamily: Fonts.medium },
  distTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 4 },
  distPct: { fontSize: 11, fontFamily: Fonts.medium, width: 30, textAlign: 'right' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  rankNum: { fontSize: 13, fontFamily: Fonts.bold, width: 24 },
  rankBody: { flex: 1, gap: 2 },
  rankTitle: { fontSize: 13, fontFamily: Fonts.semiBold },
  rankMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rankMetaText: { fontSize: 11, fontFamily: Fonts.regular },
  rankRevenue: { fontSize: 14, fontFamily: Fonts.bold },
});
