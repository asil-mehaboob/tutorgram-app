import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDialog } from '@/lib/dialog/context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Check, Image as ImageIcon, Play, VideoCamera } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { presignUpload, uploadFileToS3, uploadVideo } from '@/lib/api/tutor-upload';
import { FieldLabel, SectionDivider, shared } from './shared';
import type { CourseForm } from './types';

type Props = {
  form: CourseForm;
  update: (changes: Partial<CourseForm>) => void;
};

export function Step4({ form, update }: Props) {
  const theme = useTheme();
  const { showDialog } = useDialog();
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbPct, setThumbPct] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoPct, setVideoPct] = useState(0);

  async function pickThumbnail() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({ title: 'Permission needed', message: 'Allow photo library access to upload a thumbnail.', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    update({ thumbnailUri: asset.uri, thumbnailKey: null });
    setThumbUploading(true);
    setThumbPct(0);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const file = new File(asset.uri);
      const size = file.size > 0 ? file.size : (asset.fileSize ?? 0);
      const { uploadUrl, key } = await presignUpload('thumbnail', `thumbnail.${ext}`, mime, size);
      await uploadFileToS3(uploadUrl, asset.uri, mime, setThumbPct);
      update({ thumbnailKey: key });
    } catch (e: any) {
      showDialog({ title: 'Upload failed', message: e.message ?? 'Could not upload thumbnail', type: 'error' });
      update({ thumbnailUri: null, thumbnailKey: null });
    } finally {
      setThumbUploading(false);
    }
  }

  async function pickPromoVideo() {
    console.log('[PromoVideo] requesting permission');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('[PromoVideo] permission:', JSON.stringify(permission));
    if (!permission.granted) {
      showDialog({ title: 'Permission needed', message: 'Allow photo library access to upload a promo video.', type: 'error' });
      return;
    }
    console.log('[PromoVideo] launching picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      allowsEditing: false,
      videoMaxDuration: 300,
    });
    console.log('[PromoVideo] picker result: canceled=', result.canceled, 'assets=', result.assets?.length);
    if (result.canceled || !result.assets[0]) {
      console.log('[PromoVideo] picker canceled or no asset');
      return;
    }
    const asset = result.assets[0];
    console.log('[PromoVideo] asset uri=', asset.uri, 'mimeType=', asset.mimeType, 'fileSize=', asset.fileSize);
    update({ promoVideoUri: asset.uri, promoVideoUrl: '' });
    console.log('[PromoVideo] form updated with uri');
    setVideoUploading(true);
    setVideoPct(0);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'mp4';
      const mime = asset.mimeType ?? `video/${ext}`;
      const file = new File(asset.uri);
      const size = file.size > 0 ? file.size : (asset.fileSize ?? 0);
      console.log('[PromoVideo] uploading: ext=', ext, 'mime=', mime, 'size=', size);
      const key = await uploadVideo('promo-video', `promo-video.${ext}`, asset.uri, mime, size, undefined, setVideoPct);
      console.log('[PromoVideo] upload complete, key=', key);
      update({ promoVideoUrl: key });
    } catch (e: any) {
      console.log('[PromoVideo] ERROR:', e?.message, e);
      showDialog({ title: 'Upload failed', message: e.message ?? 'Could not upload promo video', type: 'error' });
      update({ promoVideoUri: null, promoVideoUrl: '' });
    } finally {
      setVideoUploading(false);
    }
  }

  return (
    <View style={shared.stepContent}>
      <FieldLabel text="Course Thumbnail" required theme={theme} />
      <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
        Recommended size: 1280×720 (16:9). JPG or PNG, max 2MB.
      </Text>

      <Pressable
        onPress={pickThumbnail}
        disabled={thumbUploading}
        style={[styles.mediaBox, { borderColor: form.thumbnailUri ? theme.primary : theme.border, backgroundColor: theme.surface }]}
      >
        {form.thumbnailUri ? (
          <>
            <Image source={{ uri: form.thumbnailUri }} style={styles.thumbPreview} contentFit="cover" />
            {thumbUploading && (
              <View style={styles.overlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.overlayText}>{thumbPct}%</Text>
              </View>
            )}
            {!thumbUploading && (
              <View style={styles.changeBadge}>
                <Text style={styles.changeBadgeText}>Tap to change</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyBox}>
            <ImageIcon size={36} color={theme.border} weight="regular" />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Tap to upload thumbnail</Text>
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>16:9 ratio recommended</Text>
          </View>
        )}
      </Pressable>

      {form.thumbnailKey && !thumbUploading && (
        <View style={styles.uploadedBadge}>
          <Check size={14} color="#2E7D32" weight="bold" />
          <Text style={[styles.uploadedText, { color: '#2E7D32' }]}>Thumbnail uploaded</Text>
        </View>
      )}

      <SectionDivider theme={theme} />

      <FieldLabel text="Promo Video" optional theme={theme} />
      <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>
        A short preview video helps attract students. Max 5 minutes.
      </Text>

      <Pressable
        onPress={pickPromoVideo}
        disabled={videoUploading}
        style={[
          styles.mediaBox,
          {
            borderColor: form.promoVideoUrl ? '#2E7D32' : form.promoVideoUri ? theme.primary : theme.border,
            borderStyle: form.promoVideoUri ? 'solid' : 'dashed',
            backgroundColor: theme.surface,
          },
        ]}
      >
        {form.promoVideoUri ? (
          <>
            {form.promoVideoUrl && !videoUploading ? (
              <View style={styles.emptyBox}>
                <Check size={40} color="#2E7D32" weight="bold" />
                <Text style={[styles.emptyText, { color: '#2E7D32' }]}>Video uploaded</Text>
                <Text style={[styles.emptyHint, { color: '#2E7D32' }]} numberOfLines={1}>
                  {form.promoVideoUri.split('/').pop()}
                </Text>
              </View>
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: theme.surfaceEl }]}>
                <Play size={36} color={theme.textSecondary} weight="fill" />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {form.promoVideoUri.split('/').pop()}
                </Text>
              </View>
            )}
            {videoUploading && (
              <View style={styles.overlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.overlayText}>{videoPct}%</Text>
              </View>
            )}
            {!videoUploading && (
              <View style={styles.changeBadge}>
                <Text style={styles.changeBadgeText}>Tap to change</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyBox}>
            <VideoCamera size={36} color={theme.border} weight="regular" />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Tap to upload promo video</Text>
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>MP4 or MOV, max 1GB</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldHint: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 16, marginTop: -10 },
  mediaBox: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', height: 200, borderStyle: 'dashed' },
  thumbPreview: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', gap: 8 },
  overlayText: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold },
  changeBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  changeBadgeText: { color: '#fff', fontSize: 11, fontFamily: Fonts.semiBold },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, fontFamily: Fonts.medium },
  emptyHint: { fontSize: 12, fontFamily: Fonts.regular },
  uploadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: -10, backgroundColor: '#E8F5E9' },
  uploadedText: { fontSize: 13, fontFamily: Fonts.semiBold },
});
