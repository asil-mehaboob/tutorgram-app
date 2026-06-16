import { useThemeContext } from '@/lib/theme/context';

export function useTheme() {
  return useThemeContext().colors;
}
