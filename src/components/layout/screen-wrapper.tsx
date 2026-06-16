import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type ScreenWrapperProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export function ScreenWrapper({ children, scrollable = true, style, contentStyle }: ScreenWrapperProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const containerStyle = [styles.container, { backgroundColor: theme.background }, style];

  const content = [
    styles.content,
    {
      paddingTop: insets.top + Spacing.three,
      paddingBottom: insets.bottom + Spacing.four,
    },
    contentStyle,
  ];

  if (!scrollable) {
    return (
      <View style={containerStyle}>
        <View style={content}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={containerStyle}
      contentContainerStyle={content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    flexGrow: 1,
  },
});
