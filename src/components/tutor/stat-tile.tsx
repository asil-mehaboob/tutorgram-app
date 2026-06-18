import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';

type StatTileProps = {
  label: string;
  value: string | number;
  subValue?: string;
  accent?: string;
};

export function StatTile({ label, value, subValue, accent }: StatTileProps) {
  const theme = useTheme();
  const tileAccent = accent ?? theme.primary;

  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.accentBar, { backgroundColor: tileAccent }]} />
      <Text style={[styles.value, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      {subValue ? (
        <Text style={[styles.subValue, { color: tileAccent }]} numberOfLines={1}>
          {subValue}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: 'hidden',
    minWidth: 100,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  value: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  subValue: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    marginTop: 4,
  },
});
