import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import {
  ArrowUp,
  CurrencyInr,
  Eye,
  PencilSimple,
  Prohibit,
  Student,
  Trash,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { StatusChip } from './status-chip';
import type { CourseStatus, TutorCourse } from '@/lib/api/tutor-courses';

const FALLBACK_COLORS = ['#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#4338CA'];
function fallbackColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length];
}

function fmtRevenue(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

type PublishState =
  | { kind: 'publish' }
  | { kind: 'unpublish' }
  | { kind: 'pending' }
  | { kind: 'none' };

function getPublishState(status: CourseStatus): PublishState {
  if (status === 'DRAFT' || status === 'REJECTED') return { kind: 'publish' };
  if (status === 'PUBLISHED') return { kind: 'unpublish' };
  if (status === 'PENDING_REVIEW') return { kind: 'pending' };
  return { kind: 'none' };
}

type CourseRowProps = {
  course: TutorCourse;
  onEdit: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onDelete: () => void;
  isPublishing?: boolean;
};

export function CourseRow({ course, onEdit, onPreview, onPublish, onDelete, isPublishing }: CourseRowProps) {
  const theme = useTheme();
  const bg = fallbackColor(course.id);
  const publishState = getPublishState(course.status);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>

      {/* ── Info row ── */}
      <View style={styles.infoRow}>
        {course.thumbnail ? (
          <Image source={{ uri: course.thumbnail }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.thumbInitial}>{course.title.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {course.title}
          </Text>
          <StatusChip status={course.status} small />
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Student size={12} color={theme.textSecondary} weight="regular" />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>{course.totalStudents ?? 0}</Text>
            </View>
            <View style={styles.metaItem}>
              <CurrencyInr size={12} color={theme.textSecondary} weight="regular" />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {fmtRevenue(course.totalRevenue ?? 0)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* ── Action footer ── */}
      <View style={styles.footer}>

        <Pressable onPress={onEdit} style={({ pressed }) => [styles.footerBtn, pressed && styles.footerBtnPressed]}>
          <PencilSimple size={16} color={theme.textSecondary} weight="regular" />
          <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Edit</Text>
        </Pressable>

        <View style={[styles.vDivider, { backgroundColor: theme.border }]} />

        <Pressable onPress={onPreview} style={({ pressed }) => [styles.footerBtn, pressed && styles.footerBtnPressed]}>
          <Eye size={16} color={theme.textSecondary} weight="regular" />
          <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Preview</Text>
        </Pressable>

        <View style={[styles.vDivider, { backgroundColor: theme.border }]} />

        {publishState.kind === 'publish' && (
          <Pressable
            onPress={onPublish}
            disabled={isPublishing}
            style={({ pressed }) => [styles.footerBtn, pressed && styles.footerBtnPressed]}
          >
            {isPublishing
              ? <ActivityIndicator size={14} color="#22C55E" />
              : <ArrowUp size={16} color="#22C55E" weight="bold" />}
            <Text style={[styles.footerLabel, { color: '#22C55E' }]}>Publish</Text>
          </Pressable>
        )}

        {publishState.kind === 'unpublish' && (
          <Pressable
            onPress={onPublish}
            disabled={isPublishing}
            style={({ pressed }) => [styles.footerBtn, pressed && styles.footerBtnPressed]}
          >
            {isPublishing
              ? <ActivityIndicator size={14} color="#F59E0B" />
              : <Prohibit size={16} color="#F59E0B" weight="regular" />}
            <Text style={[styles.footerLabel, { color: '#F59E0B' }]}>Unpublish</Text>
          </Pressable>
        )}

        {publishState.kind === 'pending' && (
          <View style={[styles.footerBtn, { opacity: 0.45 }]}>
            <Prohibit size={16} color="#F59E0B" weight="regular" />
            <Text style={[styles.footerLabel, { color: '#F59E0B' }]}>In Review</Text>
          </View>
        )}

        {publishState.kind === 'none' && (
          <View style={[styles.footerBtn, { opacity: 0.3 }]}>
            <Prohibit size={16} color={theme.textSecondary} weight="regular" />
            <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Archived</Text>
          </View>
        )}

        <View style={[styles.vDivider, { backgroundColor: theme.border }]} />

        <Pressable onPress={onDelete} style={({ pressed }) => [styles.footerBtn, pressed && styles.footerBtnPressed]}>
          <Trash size={16} color="#EF4444" weight="regular" />
          <Text style={[styles.footerLabel, { color: '#EF4444' }]}>Delete</Text>
        </Pressable>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  thumb: {
    width: 80,
    height: 68,
    borderRadius: 8,
    flexShrink: 0,
  },
  thumbInitial: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  body: {
    flex: 1,
    gap: 5,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  footerBtnPressed: {
    opacity: 0.6,
  },
  footerLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
