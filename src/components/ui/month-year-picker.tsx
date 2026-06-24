import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Props = {
  visible: boolean;
  value: string;           // "Jan 2022" or ""
  onConfirm: (value: string) => void;
  onCancel: () => void;
  label?: string;
};

function parseValue(value: string): { month: number; year: number } {
  const now = new Date();
  if (!value) return { month: now.getMonth(), year: now.getFullYear() };

  // YYYY-MM-DD or YYYY-MM — parse without timezone shift
  const isoMatch = value.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) {
    return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10) - 1 };
  }

  // "Mar 2024" display format
  const parts = value.split(' ');
  const month = MONTHS.indexOf(parts[0]);
  const year = parseInt(parts[1], 10);
  if (month >= 0 && !isNaN(year)) return { month, year };

  return { month: now.getMonth(), year: now.getFullYear() };
}

export function MonthYearPicker({ visible, value, onConfirm, onCancel, label }: Props) {
  const theme = useTheme();
  const initial = parseValue(value);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  // Reset to value each time the picker opens
  function handleShow() {
    const p = parseValue(value);
    setMonth(p.month);
    setYear(p.year);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleShow}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Pill */}
          <View style={[styles.pill, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Pressable onPress={onCancel} hitSlop={12}>
              <Text style={[styles.headerBtn, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{label ?? 'Select Date'}</Text>
            <Pressable onPress={() => onConfirm(`${MONTHS[month]} ${year}`)} hitSlop={12}>
              <Text style={[styles.headerBtn, { color: theme.primary, fontFamily: Fonts.semiBold }]}>Done</Text>
            </Pressable>
          </View>

          {/* Year row */}
          <View style={styles.yearRow}>
            <Pressable onPress={() => setYear((y) => y - 1)} style={styles.yearArrow} hitSlop={8}>
              <CaretLeft size={18} color={theme.text} weight="bold" />
            </Pressable>
            <Text style={[styles.yearText, { color: theme.text }]}>{year}</Text>
            <Pressable onPress={() => setYear((y) => y + 1)} style={styles.yearArrow} hitSlop={8}>
              <CaretRight size={18} color={theme.text} weight="bold" />
            </Pressable>
          </View>

          {/* Month grid */}
          <View style={styles.grid}>
            {MONTHS.map((m, i) => {
              const selected = i === month;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMonth(i)}
                  style={[
                    styles.monthCell,
                    selected && { backgroundColor: theme.primary },
                    !selected && { backgroundColor: 'transparent' },
                  ]}
                >
                  <Text
                    style={[
                      styles.monthText,
                      { color: selected ? '#fff' : theme.text },
                    ]}
                  >
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Spacer for bottom safe area */}
          <View style={{ height: 24 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
  },
  pill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  headerBtn: {
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 14,
  },
  yearArrow: {
    padding: 6,
  },
  yearText: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
    minWidth: 70,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
  },
  monthCell: {
    width: '22%',
    flexGrow: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
});
