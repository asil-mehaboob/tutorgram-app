import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  ArrowCounterClockwise,
  ArrowLeft,
  Article,
  DeviceRotate,
  FastForward,
  ListChecks,
  Pause,
  Play,
  Rewind,
  Warning,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { VideoSpinner } from '@/components/ui/video-spinner';
import { RichText } from '@/components/ui/rich-text';
import * as FileSystem from 'expo-file-system/legacy';
import { getCourse, getTutorMobileStream } from '@/lib/api/tutor-courses';

// ─── constants ────────────────────────────────────────────────────────────────

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const HIDE_DELAY = 3000;
const PRIMARY = '#7C8EF8';
const THUMB = 14;

function fmt(s: number) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// ─── Video Player ─────────────────────────────────────────────────────────────

function LessonVideoPlayer({ uri, headers, title }: {
  uri: string;
  headers?: Record<string, string>;
  title: string;
}) {
  const insets = useSafeAreaInsets();

  const player = useVideoPlayer({ uri, headers }, (p) => {
    p.timeUpdateEventInterval = 0.5;
    p.loop = false;
    p.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
  });
  const [duration, setDuration] = useState(0);
  useEventListener(player, 'sourceLoad', ({ duration: d }) => { if (d > 0) setDuration(d); });
  const [isEnded, setIsEnded] = useState(false);
  useEventListener(player, 'playToEnd', () => setIsEnded(true));

  const isLoading = status === 'loading' || status === 'idle';

  const opacity = useRef(new Animated.Value(1)).current;
  const visible = useRef(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const hide = useCallback(() => {
    visible.current = false;
    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, [opacity]);

  const show = useCallback(() => {
    visible.current = true;
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity]);

  const resetTimer = useCallback(() => {
    show();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (player.playing) hide(); }, HIDE_DELAY);
  }, [show, hide, player]);

  useEffect(() => { resetTimer(); }, []);
  useEffect(() => { if (!isPlaying || isEnded) show(); else resetTimer(); }, [isPlaying, isEnded]);

  function handleTap() {
    if (visible.current) { if (hideTimer.current) clearTimeout(hideTimer.current); hide(); }
    else { resetTimer(); }
  }

  function replay() {
    setIsEnded(false);
    player.currentTime = 0;
    player.play();
    resetTimer();
  }

  function togglePlay() {
    if (player.playing) player.pause(); else player.play();
    resetTimer();
  }

  function skip(secs: number) {
    setIsEnded(false);
    player.seekBy(secs);
    resetTimer();
  }

  const [barWidth, setBarWidth] = useState(1);
  const progress = duration > 0 ? Math.min(1, (currentTime ?? 0) / duration) : 0;
  const fillW = barWidth * progress;
  const thumbL = Math.max(0, fillW - THUMB / 2);

  function seek(x: number) {
    if (duration <= 0) return;
    setIsEnded(false);
    player.currentTime = Math.max(0, Math.min(1, x / barWidth)) * duration;
    resetTimer();
  }

  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);

  function changeSpeed(s: number) {
    player.playbackRate = s;
    setSpeed(s);
    setSpeedOpen(false);
    resetTimer();
  }

  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    const sub = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
      const o = orientationInfo.orientation;
      setIsLandscape(
        o === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
      );
    });
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      sub.remove();
    };
  }, []);

  async function toggleLandscape() {
    if (isLandscape) await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    resetTimer();
  }

  const safeBottom = Math.max(insets.bottom, 8);
  const safeTop = insets.top;

  return (
    <View style={vs.root}>
      <StatusBar style="light" hidden />

      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit="contain"
      />

      {isEnded ? (
        <View style={vs.centered} pointerEvents="none">
          <View style={vs.centerPlay}>
            <ArrowCounterClockwise size={36} color="#fff" weight="bold" />
          </View>
        </View>
      ) : isLoading ? (
        <View style={vs.centered} pointerEvents="none">
          <VideoSpinner size={40} />
        </View>
      ) : !isPlaying ? (
        <View style={vs.centered} pointerEvents="none">
          <View style={vs.centerPlay}>
            <Play size={36} color="#fff" weight="fill" />
          </View>
        </View>
      ) : null}

      <Pressable style={StyleSheet.absoluteFill} onPress={isEnded ? replay : handleTap} />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="box-none">
        <View style={[vs.topBar, { paddingTop: safeTop + 8 }]}>
          <Pressable
            onPress={() => { player.pause(); router.back(); }}
            style={({ pressed }) => [vs.iconCircle, pressed && { opacity: 0.7 }]}
            hitSlop={12}
          >
            <ArrowLeft size={20} color="#fff" weight="bold" />
          </Pressable>
          <Text style={vs.titleText} numberOfLines={1}>{title}</Text>
        </View>

        <View style={[vs.bottomBar, { paddingBottom: safeBottom + 6 }]}>
          <View
            style={vs.seekTrack}
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => seek(e.nativeEvent.locationX)}
            onResponderMove={(e) => seek(e.nativeEvent.locationX)}
          >
            <View style={vs.seekBg} />
            <View style={[vs.seekFill, { width: fillW }]} />
            <View style={[vs.seekThumb, { left: thumbL }]} />
          </View>

          <View style={vs.row}>
            <View style={vs.rowLeft}>
              <Pressable onPress={() => skip(-10)} style={({ pressed }) => [vs.btn, pressed && vs.btnPressed]} hitSlop={8}>
                <Rewind size={18} color="#fff" weight="fill" />
              </Pressable>
              <Pressable onPress={togglePlay} style={({ pressed }) => [vs.btn, pressed && vs.btnPressed]} hitSlop={8}>
                {isPlaying ? <Pause size={22} color="#fff" weight="fill" /> : <Play size={22} color="#fff" weight="fill" />}
              </Pressable>
              <Pressable onPress={() => skip(10)} style={({ pressed }) => [vs.btn, pressed && vs.btnPressed]} hitSlop={8}>
                <FastForward size={18} color="#fff" weight="fill" />
              </Pressable>
              <Text style={vs.time}>{fmt(currentTime ?? 0)} / {fmt(duration)}</Text>
            </View>
            <View style={vs.rowRight}>
              <Pressable
                onPress={() => { setSpeedOpen((v) => !v); resetTimer(); }}
                style={({ pressed }) => [vs.speedPill, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                <Text style={vs.speedLabel}>{speed === 1 ? '1×' : `${speed}×`}</Text>
              </Pressable>
              <Pressable
                onPress={toggleLandscape}
                style={({ pressed }) => [vs.btn, pressed && vs.btnPressed]}
                hitSlop={8}
              >
                <DeviceRotate size={20} color="#fff" weight={isLandscape ? 'fill' : 'regular'} />
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>

      {speedOpen && (
        <View style={[vs.speedMenu, { bottom: safeBottom + 6 + 58 }]}>
          {SPEEDS.map((s) => (
            <Pressable
              key={s}
              onPress={() => changeSpeed(s)}
              style={({ pressed }) => [
                vs.speedItem,
                s === speed && vs.speedItemActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[vs.speedItemText, s === speed && vs.speedItemTextActive]}>
                {s === 1 ? 'Normal' : `${s}×`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const vs = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  centerPlay: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingLeft: 4 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 14, gap: 10, backgroundColor: 'rgba(0,0,0,0.45)' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  titleText: { flex: 1, color: 'rgba(255,255,255,0.88)', fontSize: 13, fontFamily: Fonts.semiBold },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingTop: 18, backgroundColor: 'rgba(0,0,0,0.55)', gap: 10 },
  seekTrack: { height: 22, justifyContent: 'center' },
  seekBg: { position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  seekFill: { position: 'absolute', left: 0, height: 3, borderRadius: 2, backgroundColor: PRIMARY },
  seekThumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: PRIMARY, top: (22 - THUMB) / 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btn: { padding: 8, borderRadius: 8 },
  btnPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  time: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: Fonts.medium, marginLeft: 6 },
  speedPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  speedLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontFamily: Fonts.semiBold },
  speedMenu: { position: 'absolute', right: 14, backgroundColor: 'rgba(12,12,12,0.96)', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', minWidth: 108 },
  speedItem: { paddingHorizontal: 18, paddingVertical: 12 },
  speedItemActive: { backgroundColor: PRIMARY + '28' },
  speedItemText: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontFamily: Fonts.medium },
  speedItemTextActive: { color: PRIMARY, fontFamily: Fonts.semiBold },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

type VideoReady = { status: 'ready'; uri: string; headers?: Record<string, string> };
type VideoState =
  | { status: 'idle' }
  | { status: 'loading' }
  | VideoReady
  | { status: 'error'; message: string };

export default function TutorLessonPreviewScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id: courseId, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();

  const [videoState, setVideoState] = useState<VideoState>({ status: 'idle' });

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ['tutor-course', courseId],
    queryFn: () => getCourse(courseId!),
    enabled: !!courseId,
    staleTime: 60_000,
  });

  const lesson = course?.sections
    ?.flatMap((s) => s.lessons)
    .find((l) => l.id === lessonId);

  useEffect(() => {
    if (!lesson || lesson.type !== 'VIDEO') return;
    if (videoState.status !== 'idle') return;

    if (lesson.videoStatus !== 'READY') {
      setVideoState({ status: 'error', message: 'Video is still processing. Check back later.' });
      return;
    }

    setVideoState({ status: 'loading' });

    (async () => {
      try {
        const stream = await getTutorMobileStream(lesson.id);

        if (stream.contentType === 'mp4') {
          setVideoState({ status: 'ready', uri: stream.streamUrl });
        } else {
          const localPath = `${FileSystem.cacheDirectory}lesson_${lesson.id}.m3u8`;
          await FileSystem.writeAsStringAsync(localPath, stream.manifest, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          setVideoState({ status: 'ready', uri: localPath });
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        setVideoState({ status: 'error', message: e?.message ?? 'Failed to load video.' });
      }
    })();
  }, [lesson, videoState.status]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading || !courseId || !lessonId) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  // ── Error (course/lesson not found) ──────────────────────────────────────
  if (isError || !lesson) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <Warning size={32} color={theme.textSecondary} weight="regular" />
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Lesson not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border }]}>
          <Text style={[styles.backBtnText, { color: theme.text }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const type = lesson.type.toUpperCase();

  // ── Video lesson ──────────────────────────────────────────────────────────
  if (type === 'VIDEO') {
    if (videoState.status === 'loading' || videoState.status === 'idle') {
      return (
        <View style={[styles.center, { backgroundColor: '#000' }]}>
          <VideoSpinner size={40} />
        </View>
      );
    }
    if (videoState.status === 'error') {
      return (
        <View style={[styles.center, { backgroundColor: '#000', paddingTop: insets.top }]}>
          <Warning size={32} color="rgba(255,255,255,0.5)" weight="regular" />
          <Text style={styles.videoErrorText}>{videoState.message}</Text>
          <Pressable onPress={() => router.back()} style={styles.videoBackBtn}>
            <Text style={styles.videoBackBtnText}>Go back</Text>
          </Pressable>
        </View>
      );
    }
    return <LessonVideoPlayer uri={videoState.uri} headers={videoState.headers} title={lesson.title} />;
  }

  // ── Article / Quiz / other ────────────────────────────────────────────────
  const Icon = type === 'ARTICLE' ? Article : ListChecks;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBack}>
          <ArrowLeft size={20} color={theme.text} weight="regular" />
        </Pressable>
        <View style={styles.headerInfo}>
          <Icon size={14} color={theme.textSecondary} weight="regular" />
          <Text style={[styles.headerType, { color: theme.textSecondary }]}>
            {lesson.type.charAt(0) + lesson.type.slice(1).toLowerCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.articleBody, { paddingBottom: insets.bottom + 32 }]}
      >
        <Text style={[styles.articleTitle, { color: theme.text }]}>{lesson.title}</Text>

        {lesson.content ? (
          <RichText html={lesson.content} />
        ) : (
          <View style={styles.emptyState}>
            <Icon size={40} color={theme.border} weight="regular" />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No content added for this lesson yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  errorText: { fontSize: 14, fontFamily: Fonts.medium, textAlign: 'center' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  backBtnText: { fontSize: 14, fontFamily: Fonts.semiBold },
videoErrorText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: Fonts.medium, textAlign: 'center' },
  videoBackBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginTop: 4 },
  videoBackBtnText: { color: '#fff', fontSize: 14, fontFamily: Fonts.semiBold },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBack: { padding: 4 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  headerType: { fontSize: 12, fontFamily: Fonts.medium, textTransform: 'capitalize' },
  articleBody: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  articleTitle: { fontSize: 20, fontFamily: Fonts.extraBold, lineHeight: 28, letterSpacing: -0.3 },
  emptyState: { alignItems: 'center', gap: 12, paddingTop: 40 },
  emptyText: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center' },
});
