import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Certificate, ArrowSquareOut } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getMyCertificates } from '@/lib/api/enrollment';
import type { CertificateRecord } from '@/lib/api/enrollment';

const GRAD_COLORS = ['#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#4338CA'];
function gradColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return GRAD_COLORS[Math.abs(h) % GRAD_COLORS.length];
}

export default function CertificatesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: () => getMyCertificates({ limit: 50 }),
  });

  const certs: CertificateRecord[] = data?.items ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Certificates</Text>
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

      {!isLoading && !isError && certs.length === 0 && (
        <View style={styles.center}>
          <Certificate size={48} color={theme.border} weight="regular" />
          <Text style={[styles.stateTitle, { color: theme.text }]}>No certificates yet</Text>
          <Text style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
            Complete a course to earn your first certificate.
          </Text>
        </View>
      )}

      {!isLoading && !isError && certs.length > 0 && (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {certs.map((cert) => (
            <CertCard key={cert.id} cert={cert} theme={theme} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function CertCard({ cert, theme }: { cert: CertificateRecord; theme: ReturnType<typeof useTheme> }) {
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {cert.course.thumbnail ? (
        <Image source={{ uri: cert.course.thumbnail }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: gradColor(cert.course.id), justifyContent: 'center', alignItems: 'center' }]}>
          <Certificate size={28} color="rgba(255,255,255,0.7)" weight="regular" />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={2}>
          {cert.course.title}
        </Text>
        <Text style={[styles.tutorName, { color: theme.textSecondary }]} numberOfLines={1}>
          {cert.course.tutor.fullName}
        </Text>
        <Text style={[styles.issuedDate, { color: theme.textSecondary }]}>
          Issued {issuedDate}
        </Text>
        <Pressable
          onPress={() => Linking.openURL(cert.certificateUrl)}
          style={[styles.viewBtn, { borderColor: theme.primary }]}
        >
          <Text style={[styles.viewBtnText, { color: theme.primary }]}>View Certificate</Text>
          <ArrowSquareOut size={14} color={theme.primary} weight="regular" />
        </Pressable>
      </View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  stateTitle: { fontSize: 17, fontFamily: Fonts.bold, letterSpacing: -0.3, textAlign: 'center' },
  stateSubtitle: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 8 },
  retryText: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  thumb: { width: 96, flexShrink: 0 },
  cardBody: { flex: 1, padding: 12, gap: 4 },
  courseTitle: { fontSize: 13, fontFamily: Fonts.bold, lineHeight: 18 },
  tutorName: { fontSize: 11, fontFamily: Fonts.regular },
  issuedDate: { fontSize: 11, fontFamily: Fonts.regular },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  viewBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
});
