import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Certificate,
  DownloadSimple,
  Eye,
  Link as LinkIcon,
  Check,
  Trophy,
  CalendarBlank,
  CircleNotch,
} from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getMyCertificates } from '@/lib/api/enrollment';
import { getSession } from '@/lib/auth/storage';
import { BASE_URL } from '@/lib/api/client';
import type { CertificateRecord } from '@/lib/api/enrollment';

const STUDENT_WEB_URL = process.env.EXPO_PUBLIC_STUDENT_API_URL ?? '';

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
  const latestDate =
    certs.length > 0
      ? new Date(certs[0].issuedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : '—';

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
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
          >
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
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard
              icon={<Trophy size={14} color={theme.primary} weight="fill" />}
              label="Total Certificates"
              value={String(certs.length)}
              theme={theme}
            />
            <StatCard
              icon={<CalendarBlank size={14} color={theme.primary} weight="fill" />}
              label="Latest Certificate"
              value={latestDate}
              theme={theme}
            />
          </View>

          {certs.map((cert) => (
            <CertCard key={cert.id} cert={cert} theme={theme} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.statIconRow}>{icon}</View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function CertCard({
  cert,
  theme,
}: {
  cert: CertificateRecord;
  theme: ReturnType<typeof useTheme>;
}) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const verifyUrl = `${STUDENT_WEB_URL}/certificates/verify/${cert.certificateCode}`;

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const token = await getSession();
      const url = `${BASE_URL}/api/learning/certificates/${cert.id}/download`;
      console.log('[CertDownload] fetching', url);

      const res = await fetch(url, {
        headers: token ? { Cookie: `authjs.session-token=${token}` } : {},
      });
      console.log('[CertDownload] response status:', res.status, 'content-type:', res.headers.get('content-type'));

      if (!res.ok) {
        const body = await res.text().catch(() => '(no body)');
        console.error('[CertDownload] server error', res.status, body);
        throw new Error(`status_${res.status}`);
      }

      const buffer = await res.arrayBuffer();
      console.log('[CertDownload] buffer size:', buffer.byteLength, 'bytes');

      if (buffer.byteLength < 100) {
        const text = new TextDecoder().decode(buffer);
        console.error('[CertDownload] suspiciously small buffer, content:', text);
        throw new Error('Invalid PDF response');
      }

      const safeName = cert.course.title.replace(/[^a-zA-Z0-9 ]/g, '').trim();
      const file = new File(Paths.cache, `Tutorgram Certificate of Completion - ${safeName}.pdf`);
      console.log('[CertDownload] writing to:', file.uri);

      const writer = file.writableStream().getWriter();
      await writer.write(new Uint8Array(buffer));
      await writer.close();
      console.log('[CertDownload] file written successfully');

      const canShare = await Sharing.isAvailableAsync();
      console.log('[CertDownload] sharing available:', canShare);

      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Save Certificate',
        });
        console.log('[CertDownload] share sheet opened');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      console.error('[CertDownload] failed:', e);
      Alert.alert(
        'PDF unavailable',
        'The PDF could not be generated right now. You can view and save the certificate from your browser instead.',
        [
          { text: 'Open in Browser', onPress: () => WebBrowser.openBrowserAsync(`${STUDENT_WEB_URL}/certificates/verify/${cert.certificateCode}`) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      if (!msg.startsWith('status_')) console.error('[CertDownload]', e);
    } finally {
      setDownloading(false);
    }
  }

  async function handleView() {
    await WebBrowser.openBrowserAsync(`${STUDENT_WEB_URL}/certificates/verify/${cert.certificateCode}`);
  }

  async function handleCopyLink() {
    await Clipboard.setStringAsync(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Thumbnail */}
      <View style={styles.thumbContainer}>
        {cert.course.thumbnail ? (
          <Image source={{ uri: cert.course.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: gradColor(cert.course.id), justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.thumbInitial}>{cert.course.title.charAt(0)}</Text>
          </View>
        )}
        {/* Watermark */}
        <View style={styles.watermark}>
          <Certificate size={24} color="rgba(255,255,255,0.25)" weight="fill" />
        </View>
        {/* Course title overlay */}
        <View style={styles.titleOverlay}>
          <Text style={styles.overlayTitle} numberOfLines={2}>
            {cert.course.title}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Instructor + date */}
        <View style={styles.metaRow}>
          <Text style={[styles.tutorName, { color: theme.textSecondary }]} numberOfLines={1}>
            {cert.course.tutor.fullName}
          </Text>
          <View style={styles.dateRow}>
            <CalendarBlank size={11} color={theme.textSecondary} />
            <Text style={[styles.issuedDate, { color: theme.textSecondary }]}>{issuedDate}</Text>
          </View>
        </View>

        {/* Certificate code pill */}
        <View style={[styles.codePill, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>ID</Text>
          <Text style={[styles.codeValue, { color: theme.text }]} numberOfLines={1}>
            {cert.certificateCode}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleDownload}
            disabled={downloading}
            style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: downloading ? 0.7 : 1 }]}
          >
            {downloading ? (
              <CircleNotch size={14} color="#fff" />
            ) : (
              <DownloadSimple size={14} color="#fff" />
            )}
            <Text style={styles.primaryBtnText}>{downloading ? 'Saving…' : 'Download'}</Text>
          </Pressable>

          <Pressable
            onPress={handleView}
            style={[styles.iconBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Eye size={15} color={theme.text} />
          </Pressable>

          <Pressable
            onPress={handleCopyLink}
            style={[styles.iconBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            {copied ? (
              <Check size={15} color="#10b981" />
            ) : (
              <LinkIcon size={15} color={theme.text} />
            )}
          </Pressable>
        </View>
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

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  statIconRow: { marginBottom: 2 },
  statValue: { fontSize: 18, fontFamily: Fonts.bold, letterSpacing: -0.4 },
  statLabel: { fontSize: 11, fontFamily: Fonts.regular },

  // Card
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  thumbContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
    position: 'relative',
  },
  watermark: { position: 'absolute', top: 10, right: 10 },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 24,
    // gradient from transparent to black/70
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayTitle: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#fff',
    lineHeight: 17,
  },
  thumbInitial: {
    fontSize: 36,
    fontFamily: Fonts.bold,
    color: 'rgba(255,255,255,0.4)',
  },
  cardBody: { padding: 12, gap: 8 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tutorName: { fontSize: 11, fontFamily: Fonts.regular, flex: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  issuedDate: { fontSize: 11, fontFamily: Fonts.regular },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  codeLabel: { fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 0.3 },
  codeValue: { flex: 1, fontSize: 11, fontFamily: Fonts.regular, letterSpacing: 0.5 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#fff' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
