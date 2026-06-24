import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing } from '@/constants/theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, style, multiline, numberOfLines, ...rest }: InputProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      )}
      <TextInput
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            color: theme.text,
            borderColor: error ? theme.error : theme.border,
            fontFamily: Fonts.medium,
          },
          multiline && styles.multiline,
          style,
        ]}
        placeholderTextColor={theme.textSecondary}
        {...rest}
      />
      {error && (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.one },
  label: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.1,
    marginBottom: 1,
  },
  input: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  multiline: {
    height: undefined,
    minHeight: 52,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
});
