import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Heart, Star, Trash } from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getWishlist, removeFromWishlist } from '@/lib/api/commerce';
import type { WishlistItem } from '@/lib/api/commerce';

const GRAD_COLORS = ['#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#4338CA'];
function gradColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return GRAD_COLORS[Math.abs(h) % GRAD_COLORS.length];
}

export default function WishlistScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => getWishlist({ limit: 50 }),
  });

  const { mutate: remove } = useMutation({
    mutationFn: (courseId: string) => removeFromWishlist(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const items: WishlistItem[] = data?.items ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Wishlist</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={[styles.stateTitle, { color: theme.text }]}>Failed to load</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <View style={styles.center}>
          <Heart size={48} color={theme.border} weight="regular" />
          <Text style={[styles.stateTitle, { color: theme.text }]}>Your wishlist is empty</Text>
          <Text style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
            Save courses you're interested in to view them here.
          </Text>
        </View>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
            {items.length} course{items.length !== 1 ? 's' : ''} saved
          </Text>
          {items.map((item) => (
            <WishlistCard key={item.id} item={item} theme={theme} onRemove={() => remove(item.course.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function WishlistCard({
  item,
  theme,
  onRemove,
}: {
  item: WishlistItem;
  theme: ReturnType<typeof useTheme>;
  onRemove: () => void;
}) {
  const priceLabel = item.course.isFree
    ? 'Free'
    : item.course.effectivePrice != null
    ? `₹${item.course.effectivePrice.toLocaleString('en-IN')}`
    : '';

  return (
    <Pressable
    onPress={() => router.push(`/(student)/course/${item.course.slug}` as never)}
    style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
  >
      {item.course.thumbnail ? (
        <Image source={{ uri: item.course.thumbnail }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: gradColor(item.course.id), justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.thumbInitial}>{item.course.title.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={2}>
          {item.course.title}
        </Text>
        <Text style={[styles.tutorName, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.course.tutor.fullName}
        </Text>
        <View style={styles.ratingRow}>
          <Star size={11} color={theme.star} weight="fill" />
          <Text style={[styles.rating, { color: theme.star }]}>
            {item.course.averageRating.toFixed(1)}
          </Text>
        </View>
        <Text style={[styles.price, { color: item.course.isFree ? theme.success : theme.text }]}>
          {priceLabel}
        </Text>
      </View>
      <Pressable onPress={onRemove} style={styles.removeBtn} hitSlop={8}>
        <Trash size={18} color={theme.textSecondary} weight="regular" />
      </Pressable>
    </Pressable>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  stateTitle: { fontSize: 17, fontFamily: Fonts.bold, letterSpacing: -0.3, textAlign: 'center' },
  stateSubtitle: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 8 },
  retryText: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  countLabel: { fontSize: 13, fontFamily: Fonts.regular, marginBottom: 4 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  thumb: { width: 96, flexShrink: 0 },
  thumbInitial: { color: 'rgba(255,255,255,0.7)', fontSize: 26, fontFamily: Fonts.extraBold },
  cardBody: { flex: 1, padding: 12, gap: 4 },
  courseTitle: { fontSize: 13, fontFamily: Fonts.bold, lineHeight: 18 },
  tutorName: { fontSize: 11, fontFamily: Fonts.regular },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 12, fontFamily: Fonts.bold },
  price: { fontSize: 14, fontFamily: Fonts.extraBold, letterSpacing: -0.2 },
  removeBtn: { padding: 12, justifyContent: 'flex-start' },
});
