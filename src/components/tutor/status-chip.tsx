import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import type { CourseStatus } from '@/lib/api/tutor-courses';

type StatusChipProps = {
  status: CourseStatus;
  small?: boolean;
};

const STATUS_CONFIG: Record<CourseStatus, { label: string; light: string; dark: string; textLight: string; textDark: string }> = {
  PUBLISHED: { label: 'Published', light: '#E8F5E9', dark: '#1B3A1B', textLight: '#1E6B1E', textDark: '#4ADE80' },
  DRAFT: { label: 'Draft', light: '#F5F5F5', dark: '#3A3A3A', textLight: '#6A6F73', textDark: '#9E9E9E' },
  PENDING_REVIEW: { label: 'In Review', light: '#FFF3E0', dark: '#3D2000', textLight: '#E65100', textDark: '#FFB74D' },
  ARCHIVED: { label: 'Archived', light: '#EDE7F6', dark: '#2A1F3D', textLight: '#5E35B1', textDark: '#B39DDB' },
  REJECTED: { label: 'Rejected', light: '#FFEBEE', dark: '#3D1515', textLight: '#D32F2F', textDark: '#EF9A9A' },
};

export function StatusChip({ status, small }: StatusChipProps) {
  const theme = useTheme();
  const isDark = theme.background === '#1C1D1F';
  const cfg = STATUS_CONFIG[status];

  return (
    <View style={[
      styles.chip,
      small && styles.chipSmall,
      { backgroundColor: isDark ? cfg.dark : cfg.light },
    ]}>
      <Text style={[
        styles.label,
        small && styles.labelSmall,
        { color: isDark ? cfg.textDark : cfg.textLight },
      ]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  chipSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  labelSmall: {
    fontSize: 10,
  },
});
