import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, DownloadSimple, IdentificationCard, CircleNotch } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getSession } from '@/lib/auth/storage';
import { TUTOR_BASE_URL } from '@/lib/api/tutor-client';

type Side = 'front' | 'back';

async function fetchPreviewHtml(side: Side): Promise<string> {
  const token = await getSession();
  const res = await fetch(`${TUTOR_BASE_URL}/api/id-card/preview/${side}`, {
    headers: token ? { Cookie: `authjs.session-token=${token}` } : {},
  });
  if (!res.ok) throw new Error(`status_${res.status}`);
  return res.text();
}

export default function IdCardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [side, setSide] = useState<Side>('front');
  const [downloading, setDownloading] = useState(false);

  const frontQ = useQuery({ queryKey: ['id-card-preview', 'front'], queryFn: () => fetchPreviewHtml('front') });
  const backQ = useQuery({ queryKey: ['id-card-preview', 'back'], queryFn: () => fetchPreviewHtml('back') });

  const activeQ = side === 'front' ? frontQ : backQ;

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const token = await getSession();
      const res = await fetch(`${TUTOR_BASE_URL}/api/id-card/download`, {
        headers: token ? { Cookie: `authjs.session-token=${token}` } : {},
      });
      if (!res.ok) throw new Error(`status_${res.status}`);

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 100) throw new Error('Invalid PDF response');

      const file = new File(Paths.cache, 'Tutorgram ID Card.pdf');
      const writer = file.writableStream().getWriter();
      await writer.write(new Uint8Array(buffer));
      await writer.close();

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Save ID Card',
        });
      }
    } catch {
      Alert.alert('Download failed', 'Could not download the ID card. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>ID Card</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabs, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {(['front', 'back'] as Side[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSide(s)}
            style={[
              styles.tab,
              side === s && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: side === s ? theme.primary : theme.textSecondary },
              ]}
            >
              {s === 'front' ? 'Front' : 'Back'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <View style={styles.webViewContainer}>
        {activeQ.isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        )}

        {activeQ.isError && (
          <View style={styles.center}>
            <IdentificationCard size={48} color={theme.border} weight="regular" />
            <Text style={[styles.stateTitle, { color: theme.text }]}>Failed to load</Text>
            <Pressable
              onPress={() => activeQ.refetch()}
              style={[styles.retryBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {activeQ.data && (
          <WebView
            key={side}
            source={{ html: activeQ.data, baseUrl: TUTOR_BASE_URL }}
            style={styles.webView}
            scrollEnabled={false}
            bounces={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        )}
      </View>

      {/* Download button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <Pressable
          onPress={handleDownload}
          disabled={downloading}
          style={[styles.downloadBtn, { backgroundColor: theme.primary, opacity: downloading ? 0.7 : 1 }]}
        >
          {downloading ? (
            <CircleNotch size={18} color="#fff" />
          ) : (
            <DownloadSimple size={18} color="#fff" />
          )}
          <Text style={styles.downloadBtnText}>{downloading ? 'Saving…' : 'Download PDF'}</Text>
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 14, fontFamily: Fonts.semiBold },
  webViewContainer: { flex: 1 },
  webView: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  stateTitle: { fontSize: 16, fontFamily: Fonts.bold },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  downloadBtnText: { fontSize: 15, fontFamily: Fonts.semiBold, color: '#fff' },
});
