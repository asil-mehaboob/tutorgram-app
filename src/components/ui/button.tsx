import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'ghost' | 'outline';

type ButtonProps = PressableProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ label, variant = 'primary', loading = false, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bgColor =
    variant === 'primary' ? theme.primary : 'transparent';
  const textColor =
    variant === 'primary' ? theme.primaryForeground : theme.primary;
  const borderColor =
    variant === 'outline' ? theme.primary : 'transparent';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.87 : 1,
        },
        style,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  label: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    letterSpacing: -0.1,
  },
});
