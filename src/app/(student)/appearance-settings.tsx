import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Sun, Moon, Monitor, CheckCircle } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { useThemeContext, type ThemePreference } from '@/lib/theme/context';

type Option = {
  value: ThemePreference;
  label: string;
  description: string;
  Icon: typeof Sun;
};

const OPTIONS: Option[] = [
  { value: 'light', label: 'Light', description: 'Always use the light appearance', Icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Always use the dark appearance', Icon: Moon },
  { value: 'system', label: 'System default', description: 'Follow your device’s appearance setting', Icon: Monitor },
];

export default function AppearanceSettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemeContext();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Appearance</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Choose how Tutorgram looks to you. This overrides your device setting while you're in the app.
        </Text>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {OPTIONS.map((opt, i) => {
            const selected = preference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPreference(opt.value)}
                style={({ pressed }) => [
                  styles.row,
                  i < OPTIONS.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.border,
                  },
                  { backgroundColor: pressed ? theme.surfaceEl : 'transparent' },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: selected ? theme.primaryLight : theme.surfaceEl }]}>
                  <opt.Icon
                    size={18}
                    color={selected ? theme.primary : theme.textSecondary}
                    weight={selected ? 'fill' : 'regular'}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.text }]}>{opt.label}</Text>
                  <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>{opt.description}</Text>
                </View>
                {selected && <CheckCircle size={20} color={theme.primary} weight="fill" />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  hint: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19 },
  group: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontFamily: Fonts.medium },
  rowDesc: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17 },
});
