import { StyleSheet, Text, type TextProps } from 'react-native';
import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.link, { color: theme.primary }],
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontSize: 16, fontFamily: Fonts.medium, lineHeight: 24 },
  title: { fontSize: 32, fontFamily: Fonts.extraBold, lineHeight: 38, letterSpacing: -0.5 },
  subtitle: { fontSize: 22, fontFamily: Fonts.bold, lineHeight: 28, letterSpacing: -0.3 },
  small: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 20 },
  smallBold: { fontSize: 14, fontFamily: Fonts.bold, lineHeight: 20 },
  link: { fontSize: 14, fontFamily: Fonts.medium, lineHeight: 20 },
  code: { fontFamily: Fonts.mono, fontSize: 12 },
});
