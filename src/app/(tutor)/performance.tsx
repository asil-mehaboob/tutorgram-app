import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBar,
  Chat,
  CurrencyInr,
  GraduationCap,
  Pulse,
  Star,
  Target,
  TrendUp,
  Users,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Fonts, Spacing } from '@/constants/theme';
import {
  getPerformanceOverview,
  getRevenueData,
  getReviewAnalytics,
  getStudentAnalytics,
} from '@/lib/api/tutor-performance';

const TABS = ['Overview', 'Revenue', 'Students', 'Reviews'] as const;
type Tab = (typeof TABS)[number];

const PALETTE = ['#2849EA', '#3b5ef7', '#5470F0', '#7B8FE8', '#9BA8F0', '#b6bef4', '#1E3BD4'];
const STAR_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

function fmtRevenue(v: number) {
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v}`;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────
function toXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = toXY(cx, cy, r, start);
  const e = toXY(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M${cx},${cy} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${r},${r} 0 ${large} 1 ${e.x.toFixed(2)},${e.y.toFixed(2)} Z`;
}

// ─── Area chart (SVG) ─────────────────────────────────────────────────────────
function AreaLineChart({
  data,
  color,
  gradientId,
}: {
  data: { label: string; value: number }[];
  color: string;
  gradientId: string;
}) {
  const { width: screenW } = useWindowDimensions();
  const theme = useTheme();
  if (data.length < 2) return null;

  const W = screenW - 32;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 30, left: 16 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const max = Math.max(...data.map((d) => d.value), 1);
  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * cW,
    y: PAD.top + (1 - d.value / max) * cH,
    label: d.label,
  }));

  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpx = ((prev.x + pt.x) / 2).toFixed(1);
    return `${acc} C${cpx},${prev.y.toFixed(1)} ${cpx},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, '');

  const baseY = PAD.top + cH;
  const fillPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${baseY} L${pts[0].x.toFixed(1)},${baseY} Z`;

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={fillPath} fill={`url(#${gradientId})`} />
      <Path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={3} fill={color} />
      ))}
      {pts.map((pt, i) => (
        <SvgText
          key={i}
          x={pt.x}
          y={H - 6}
          textAnchor="middle"
          fontSize={10}
          fill={theme.textSecondary}
        >
          {pt.label.slice(0, 3)}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── Donut chart (SVG) ────────────────────────────────────────────────────────
function DonutChart({
  segments,
  centerLabel,
  centerSub,
}: {
  segments: { value: number; color: string }[];
  centerLabel: string;
  centerSub: string;
}) {
  const theme = useTheme();
  const SIZE = 150;
  const CX = SIZE / 2;
  const R = 58;
  const HOLE = 36;
  const GAP = 4;

  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;

  return (
    <Svg width={SIZE} height={SIZE}>
      {segments.map((seg, i) => {
        const sweep = (seg.value / total) * 360;
        if (sweep < 1) { angle += sweep; return null; }
        const path = sectorPath(CX, CX, R, angle + GAP / 2, angle + sweep - GAP / 2);
        angle += sweep;
        return <Path key={i} d={path} fill={seg.color} />;
      })}
      <Circle cx={CX} cy={CX} r={HOLE} fill={theme.surface} />
      <SvgText
        x={CX}
        y={CX - 4}
        textAnchor="middle"
        fontSize={18}
        fill={theme.text}
      >
        {centerLabel}
      </SvgText>
      <SvgText
        x={CX}
        y={CX + 14}
        textAnchor="middle"
        fontSize={10}
        fill={theme.textSecondary}
      >
        {centerSub}
      </SvgText>
    </Svg>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({
  title,
  subtitle,
  children,
  noPad,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  noPad?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={noPad ? undefined : styles.cardBody}>{children}</View>
    </View>
  );
}

// ─── KPI card (2-column grid) ─────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  Icon: React.ElementType;
  color?: string;
}) {
  const theme = useTheme();
  const accent = color ?? theme.primary;
  return (
    <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.kpiIconRow]}>
        <Icon size={13} color={theme.textSecondary} weight="regular" />
        <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.kpiValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>{sub}</Text> : null}
      <View style={[styles.kpiAccent, { backgroundColor: accent }]} />
    </View>
  );
}

// ─── Rank row (course with progress bar) ──────────────────────────────────────
function RankRow({
  rank,
  name,
  value,
  pct,
  color,
}: {
  rank: number;
  name: string;
  value: string;
  pct: number;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.rankRow, { borderTopColor: theme.border }]}>
      <Text style={[styles.rankNum, { color: theme.textSecondary }]}>{rank}</Text>
      <View style={styles.rankBody}>
        <View style={styles.rankTop}>
          <Text style={[styles.rankName, { color: theme.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.rankValue, { color: theme.text }]}>{value}</Text>
        </View>
        <View style={[styles.track, { backgroundColor: theme.surfaceEl }]}>
          <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ active, onSelect }: { active: Tab; onSelect: (t: Tab) => void }) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBar}
      style={[styles.tabScroll, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
    >
      {TABS.map((t) => {
        const isActive = t === active;
        return (
          <Pressable key={t} onPress={() => onSelect(t)} style={styles.tabItem}>
            <Text style={[styles.tabLabel, { color: isActive ? theme.primary : theme.textSecondary }]}>
              {t}
            </Text>
            {isActive && (
              <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── State blocks ─────────────────────────────────────────────────────────────
function LoadingBlock() {
  const theme = useTheme();
  return (
    <View style={styles.stateBlock}>
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}

function ErrorBlock({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stateBlock}>
      <Text style={[styles.stateText, { color: theme.textSecondary }]}>{message}</Text>
    </View>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const theme = useTheme();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tutor-performance-overview'],
    queryFn: getPerformanceOverview,
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <LoadingBlock />;
  if (isError) return <ErrorBlock message="Failed to load overview" />;
  if (!data) return null;

  const chartData = (data.monthlyRevenue ?? []).map((d) => ({
    label: d.month,
    value: d.revenue,
  }));

  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard label="Revenue" value={fmtRevenue(data.totalRevenue ?? 0)} sub="All time" Icon={CurrencyInr} color="#2849EA" />
        <KpiCard label="Enrollments" value={data.totalEnrollments ?? 0} sub="All time" Icon={Users} color="#059669" />
        <KpiCard label="Avg Rating" value={(data.avgRating ?? 0).toFixed(1)} sub="Out of 5.0" Icon={Star} color={theme.star} />
        <KpiCard label="Completion" value={`${(data.completionRate ?? 0).toFixed(0)}%`} sub="Avg across courses" Icon={Target} color="#7C3AED" />
      </View>

      {chartData.length >= 2 && (
        <Card title="Monthly Revenue" subtitle="Last 6 months" noPad>
          <View style={styles.chartWrap}>
            <AreaLineChart data={chartData.slice(-6)} color={theme.primary} gradientId="overviewGrad" />
          </View>
        </Card>
      )}
    </View>
  );
}

// ─── Revenue tab ──────────────────────────────────────────────────────────────
function RevenueTab() {
  const revQ = useQuery({ queryKey: ['tutor-revenue'], queryFn: getRevenueData, staleTime: 5 * 60_000 });
  const ovQ = useQuery({ queryKey: ['tutor-performance-overview'], queryFn: getPerformanceOverview, staleTime: 5 * 60_000 });

  if (revQ.isLoading) return <LoadingBlock />;
  if (revQ.isError) return <ErrorBlock message="Failed to load revenue data" />;
  const rev = revQ.data;
  if (!rev) return null;

  const courses = rev.courses ?? [];
  const totalEnrollments = courses.reduce((s, c) => s + c.enrollments, 0);
  const avgPerStudent = totalEnrollments > 0 ? Math.round((rev.totalRevenue ?? 0) / totalEnrollments) : 0;
  const sorted = [...courses].sort((a, b) => b.revenue - a.revenue);
  const maxRev = sorted[0]?.revenue ?? 1;

  const trendData = (ovQ.data?.monthlyRevenue ?? []).map((d) => ({ label: d.month, value: d.revenue }));

  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard label="Total Revenue" value={fmtRevenue(rev.totalRevenue ?? 0)} sub="All courses" Icon={CurrencyInr} color="#2849EA" />
        <KpiCard label="Avg / Student" value={fmtRevenue(avgPerStudent)} sub="Per enrollment" Icon={TrendUp} color="#059669" />
      </View>

      {trendData.length >= 2 && (
        <Card title="Revenue Trend" subtitle="Last 6 months" noPad>
          <View style={styles.chartWrap}>
            <AreaLineChart data={trendData.slice(-6)} color="#2849EA" gradientId="revenueGrad" />
          </View>
        </Card>
      )}

      {sorted.length > 0 && (
        <Card title="Revenue by Course" noPad>
          {sorted.map((c, i) => (
            <RankRow
              key={c.courseId}
              rank={i + 1}
              name={c.title}
              value={fmtRevenue(c.revenue)}
              pct={maxRev ? (c.revenue / maxRev) * 100 : 0}
              color={PALETTE[i % PALETTE.length]}
            />
          ))}
        </Card>
      )}
    </View>
  );
}

// ─── Students tab ─────────────────────────────────────────────────────────────
function StudentsTab() {
  const stuQ = useQuery({ queryKey: ['tutor-student-analytics'], queryFn: getStudentAnalytics, staleTime: 5 * 60_000 });
  const revQ = useQuery({ queryKey: ['tutor-revenue'], queryFn: getRevenueData, staleTime: 5 * 60_000 });

  if (stuQ.isLoading) return <LoadingBlock />;
  if (stuQ.isError) return <ErrorBlock message="Failed to load student data" />;
  const d = stuQ.data;
  if (!d) return null;

  const sorted = [...(revQ.data?.courses ?? [])].sort((a, b) => b.enrollments - a.enrollments);
  const maxEnroll = sorted[0]?.enrollments ?? 1;

  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard label="Total Students" value={d.totalStudents ?? 0} sub="All time" Icon={Users} color="#2849EA" />
        <KpiCard label="New This Month" value={d.newStudentsThisMonth ?? 0} sub="New enrollments" Icon={GraduationCap} color="#059669" />
        <KpiCard label="Completion" value={`${(d.completionRate ?? 0).toFixed(0)}%`} sub="Across courses" Icon={Target} color="#7C3AED" />
        <KpiCard label="Avg Progress" value={`${(d.avgProgress ?? 0).toFixed(0)}%`} sub="Per student" Icon={Pulse} color="#EC7211" />
      </View>

      {sorted.length > 0 && (
        <Card title="Students by Course" noPad>
          {sorted.map((c, i) => (
            <RankRow
              key={c.courseId}
              rank={i + 1}
              name={c.title}
              value={`${c.enrollments}`}
              pct={maxEnroll ? (c.enrollments / maxEnroll) * 100 : 0}
              color={PALETTE[i % PALETTE.length]}
            />
          ))}
        </Card>
      )}
    </View>
  );
}

// ─── Reviews tab ──────────────────────────────────────────────────────────────
function ReviewsTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tutor-review-analytics'],
    queryFn: getReviewAnalytics,
    staleTime: 5 * 60_000,
  });
  const theme = useTheme();

  if (isLoading) return <LoadingBlock />;
  if (isError) return <ErrorBlock message="Failed to load review data" />;
  if (!data) return null;

  const avgRating = data.avgRating ?? 0;
  const totalReviews = data.totalReviews ?? 0;
  const dist = (data.distribution ?? []).sort((a, b) => a.stars - b.stars);
  const fiveStarCount = dist.find((r) => r.stars === 5)?.count ?? 0;
  const fiveStarPct = totalReviews > 0 ? Math.round((fiveStarCount / totalReviews) * 100) : 0;

  const donutSegments = dist.map((d) => ({
    value: d.count ?? 0,
    color: STAR_COLORS[(d.stars ?? 1) - 1] ?? STAR_COLORS[4],
  }));

  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard label="Avg Rating" value={avgRating.toFixed(2)} sub="Out of 5.0" Icon={Star} color="#E59819" />
        <KpiCard label="Total Reviews" value={totalReviews} sub="All time" Icon={Chat} color="#2849EA" />
        <KpiCard label="5-Star" value={fiveStarCount} sub={`${fiveStarPct}% of total`} Icon={Star} color="#059669" />
        <KpiCard label="Courses" value={new Set((data.recentReviews ?? []).map((r) => r.courseTitle)).size} sub="Reviewed" Icon={ChartBar} color="#7C3AED" />
      </View>

      {dist.length > 0 && (
        <Card title="Rating Distribution">
          <View style={styles.donutRow}>
            <DonutChart
              segments={donutSegments}
              centerLabel={avgRating.toFixed(1)}
              centerSub="avg rating"
            />
            <View style={styles.donutLegend}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const entry = dist.find((d) => d.stars === stars);
                const pct = entry?.percentage ?? 0;
                return (
                  <View key={stars} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: STAR_COLORS[stars - 1] }]} />
                    <Star size={11} color={theme.star} weight="fill" />
                    <Text style={[styles.legendLabel, { color: theme.text }]}>{stars}</Text>
                    <Text style={[styles.legendPct, { color: theme.textSecondary }]}>
                      {(pct ?? 0).toFixed(0)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>
      )}

      {(data.recentReviews?.length ?? 0) > 0 && (
        <Card title="Recent Reviews" noPad>
          {(data.recentReviews ?? []).slice(0, 6).map((r) => {
            const dateStr = new Date(r.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            });
            return (
              <View key={r.id} style={[styles.reviewRow, { borderTopColor: theme.border }]}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={11} color={theme.star} weight={i < r.rating ? 'fill' : 'regular'} />
                    ))}
                  </View>
                  <Text style={[styles.reviewDate, { color: theme.textSecondary }]}>{dateStr}</Text>
                </View>
                <Text style={[styles.reviewName, { color: theme.text }]}>{r.studentName}</Text>
                <Text style={[styles.reviewCourse, { color: theme.textSecondary }]} numberOfLines={1}>
                  {r.courseTitle}
                </Text>
                {r.comment ? (
                  <Text style={[styles.reviewComment, { color: theme.textSecondary }]} numberOfLines={3}>
                    {r.comment}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────
export default function TutorPerformance() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>Analytics</Text>
        <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Performance insights</Text>
      </View>

      <TabBar active={tab} onSelect={setTab} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: BottomTabInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'Overview' && <OverviewTab />}
        {tab === 'Revenue' && <RevenueTab />}
        {tab === 'Students' && <StudentsTab />}
        {tab === 'Reviews' && <ReviewsTab />}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 24, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },

  tabScroll: { borderBottomWidth: StyleSheet.hairlineWidth, flexGrow: 0 },
  tabBar: { flexDirection: 'row', paddingHorizontal: Spacing.three },
  tabItem: { paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', position: 'relative' },
  tabLabel: { fontSize: 14, fontFamily: Fonts.semiBold },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    right: 14,
    height: 2,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  scroll: { padding: Spacing.three, gap: 12 },
  tabContent: { gap: 12 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 13,
    gap: 3,
    overflow: 'hidden',
  },
  kpiIconRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kpiLabel: { fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 0.2, textTransform: 'uppercase' },
  kpiValue: { fontSize: 21, fontFamily: Fonts.extraBold, letterSpacing: -0.5, marginTop: 3 },
  kpiSub: { fontSize: 11, fontFamily: Fonts.regular },
  kpiAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2.5 },

  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 14, fontFamily: Fonts.bold },
  cardSubtitle: { fontSize: 11, fontFamily: Fonts.regular },

  chartWrap: { paddingVertical: 8, alignItems: 'center' },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rankNum: { fontSize: 12, fontFamily: Fonts.bold, width: 18, textAlign: 'right' },
  rankBody: { flex: 1, gap: 5 },
  rankTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rankName: { fontSize: 13, fontFamily: Fonts.semiBold, flex: 1, marginRight: 8 },
  rankValue: { fontSize: 13, fontFamily: Fonts.bold, flexShrink: 0 },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },

  donutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  donutLegend: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontFamily: Fonts.semiBold, width: 12 },
  legendPct: { fontSize: 11, fontFamily: Fonts.regular },

  reviewRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 3, borderTopWidth: StyleSheet.hairlineWidth },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontSize: 11, fontFamily: Fonts.regular },
  reviewName: { fontSize: 13, fontFamily: Fonts.semiBold },
  reviewCourse: { fontSize: 11, fontFamily: Fonts.regular },
  reviewComment: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2, lineHeight: 17 },

  stateBlock: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  stateText: { fontSize: 14, fontFamily: Fonts.regular },
});
