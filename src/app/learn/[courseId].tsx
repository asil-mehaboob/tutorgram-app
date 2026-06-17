import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Article,
  CaretDown,
  CaretUp,
  CheckCircle,
  FastForward,
  Pause,
  Play,
  PlayCircle,
  Question,
  Rewind,
  Trophy,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getCourseDetail } from '@/lib/api/catalog';
import {
  getLessonDetail,
  getLessonStream,
  getCourseProgressData,
  updateCourseProgressData,
} from '@/lib/api/enrollment';
import type { LessonStream } from '@/lib/api/enrollment';
import type { CourseLesson } from '@/lib/api/catalog';
import { getSession } from '@/lib/auth/storage';
import { BASE_URL } from '@/lib/api/client';

// ─── constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_HEIGHT = Math.round(SCREEN_WIDTH * (9 / 16));
const PRIMARY = '#7C8EF8';
const HIDE_DELAY = 3000;
const THUMB = 14;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
  return `${m}m`;
}

function LessonTypeIcon({ type, color, size = 14 }: { type: string; color: string; size?: number }) {
  if (type === 'ARTICLE') return <Article size={size} color={color} weight="regular" />;
  if (type === 'QUIZ') return <Question size={size} color={color} weight="regular" />;
  return <PlayCircle size={size} color={color} weight="regular" />;
}

// ─── Embedded video player (self-contained, keyed by lessonId) ────────────────

type VideoSource = {
  uri: string;
  contentType?: string;
};

function EmbeddedPlayer({ source }: { source: VideoSource }) {
  useEffect(() => {
    console.log('[Player] mounted, uri:', source.uri, 'contentType:', source.contentType);
    return () => console.log('[Player] unmounted');
  }, []);

  const player = useVideoPlayer(source, (p) => {
    p.timeUpdateEventInterval = 0.5;
    p.loop = false;
    p.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEventListener(player, 'statusChange', ({ status: s, error }) => {
    if (error) {
      console.log('[Player] ERROR:', error.message, '| code:', (error as any).code);
    } else {
      console.log('[Player] status →', s);
    }
  });

  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
  });
  const [duration, setDuration] = useState(0);
  useEventListener(player, 'sourceLoad', ({ duration: d }) => {
    console.log('[Player] sourceLoad, duration:', d);
    if (d > 0) setDuration(d);
  });

  const isBuffering = status === 'loading' || status === 'idle';

  // Controls auto-hide
  const ctrlOpacity = useRef(new Animated.Value(1)).current;
  const ctrlVisible = useRef(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const hideControls = useCallback(() => {
    ctrlVisible.current = false;
    Animated.timing(ctrlOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, [ctrlOpacity]);

  const showControls = useCallback(() => {
    ctrlVisible.current = true;
    Animated.timing(ctrlOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [ctrlOpacity]);

  const resetTimer = useCallback(() => {
    showControls();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { 
      try {
        if (player.playing) hideControls(); 
      } catch (e) {
        // Ignore errors if player is released
      }
    }, HIDE_DELAY);
  }, [showControls, hideControls, player]);

  useEffect(() => { resetTimer(); }, []);
  useEffect(() => { if (!isPlaying) showControls(); else resetTimer(); }, [isPlaying]);

  function handleTap() {
    if (ctrlVisible.current) { if (hideTimer.current) clearTimeout(hideTimer.current); hideControls(); }
    else resetTimer();
  }

  function togglePlay() {
    if (player.playing) player.pause(); else player.play();
    resetTimer();
  }

  function skip(secs: number) { player.seekBy(secs); resetTimer(); }

  // Seek bar
  const [barWidth, setBarWidth] = useState(1);
  const seekProgress = duration > 0 ? Math.min(1, (currentTime ?? 0) / duration) : 0;
  const fillW = barWidth * seekProgress;
  const thumbL = Math.max(0, fillW - THUMB / 2);

  function seek(x: number) {
    if (duration <= 0) return;
    player.currentTime = Math.max(0, Math.min(1, x / barWidth)) * duration;
    resetTimer();
  }

  // Speed
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);

  function changeSpeed(s: number) {
    player.playbackRate = s;
    setSpeed(s);
    setSpeedOpen(false);
    resetTimer();
  }

  return (
    <View style={pStyles.root}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit="contain"
      />

      {/* Buffering */}
      {isBuffering && (
        <View style={pStyles.center} pointerEvents="none">
          <ActivityIndicator size="large" color="rgba(255,255,255,0.9)" />
        </View>
      )}

      {/* Center play when paused */}
      {!isBuffering && !isPlaying && (
        <View style={pStyles.center} pointerEvents="none">
          <View style={pStyles.centerBtn}>
            <Play size={32} color="#fff" weight="fill" />
          </View>
        </View>
      )}

      {/* Tap zone */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap} />

      {/* Controls overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: ctrlOpacity }]} pointerEvents="box-none">
        <View style={pStyles.controlsWrap}>
          {/* Seek bar */}
          <View
            style={pStyles.seekTrack}
            onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={e => seek(e.nativeEvent.locationX)}
            onResponderMove={e => seek(e.nativeEvent.locationX)}
          >
            <View style={pStyles.seekBg} />
            <View style={[pStyles.seekFill, { width: fillW }]} />
            <View style={[pStyles.seekThumb, { left: thumbL }]} />
          </View>

          {/* Controls row */}
          <View style={pStyles.row}>
            <View style={pStyles.rowLeft}>
              <Pressable onPress={() => skip(-10)} style={({ pressed }) => [pStyles.btn, pressed && pStyles.btnPress]} hitSlop={8}>
                <Rewind size={17} color="#fff" weight="fill" />
              </Pressable>
              <Pressable onPress={togglePlay} style={({ pressed }) => [pStyles.btn, pressed && pStyles.btnPress]} hitSlop={8}>
                {isPlaying
                  ? <Pause size={22} color="#fff" weight="fill" />
                  : <Play size={22} color="#fff" weight="fill" />}
              </Pressable>
              <Pressable onPress={() => skip(10)} style={({ pressed }) => [pStyles.btn, pressed && pStyles.btnPress]} hitSlop={8}>
                <FastForward size={17} color="#fff" weight="fill" />
              </Pressable>
              <Text style={pStyles.time}>{fmt(currentTime ?? 0)} / {fmt(duration)}</Text>
            </View>

            <Pressable
              onPress={() => { setSpeedOpen(v => !v); resetTimer(); }}
              style={({ pressed }) => [pStyles.speedPill, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Text style={pStyles.speedLabel}>{speed === 1 ? '1×' : `${speed}×`}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* Speed menu */}
      {speedOpen && (
        <View style={pStyles.speedMenu}>
          {SPEEDS.map(s => (
            <Pressable
              key={s}
              onPress={() => changeSpeed(s)}
              style={({ pressed }) => [pStyles.speedItem, s === speed && pStyles.speedItemActive, pressed && { opacity: 0.7 }]}
            >
              <Text style={[pStyles.speedText, s === speed && pStyles.speedTextActive]}>
                {s === 1 ? 'Normal' : `${s}×`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const pStyles = StyleSheet.create({
  root: { width: '100%', height: VIDEO_HEIGHT, backgroundColor: '#000' },
  center: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  centerBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingLeft: 4,
  },
  controlsWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 14, paddingTop: 20, paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', gap: 8,
  },
  seekTrack: { height: 22, justifyContent: 'center' },
  seekBg: { position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  seekFill: { position: 'absolute', left: 0, height: 3, borderRadius: 2, backgroundColor: PRIMARY },
  seekThumb: {
    position: 'absolute', width: THUMB, height: THUMB,
    borderRadius: THUMB / 2, backgroundColor: PRIMARY, top: (22 - THUMB) / 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: { padding: 8, borderRadius: 8 },
  btnPress: { backgroundColor: 'rgba(255,255,255,0.12)' },
  time: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: Fonts.medium, marginLeft: 4 },
  speedPill: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  speedLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontFamily: Fonts.semiBold },
  speedMenu: {
    position: 'absolute', right: 14, bottom: 58,
    backgroundColor: 'rgba(12,12,12,0.97)', borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden', minWidth: 110,
  },
  speedItem: { paddingHorizontal: 18, paddingVertical: 11 },
  speedItemActive: { backgroundColor: PRIMARY + '28' },
  speedText: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontFamily: Fonts.medium },
  speedTextActive: { color: PRIMARY, fontFamily: Fonts.semiBold },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CourseLearnScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const queryClient = useQueryClient();

  const [videoStream, setVideoStream] = useState<LessonStream | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    getSession().then(setSessionToken);
  }, []);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: () => getCourseDetail(courseId!),
    enabled: !!courseId,
  });
  const course = courseData?.course;

  const { data: progressData } = useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: () => getCourseProgressData(courseId!),
    enabled: !!courseId,
  });

  // ── Lesson state ────────────────────────────────────────────────────────────
  const allLessons: CourseLesson[] = useMemo(
    () => course?.sections.flatMap(s => s.lessons) ?? [],
    [course],
  );

  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [completionCert, setCompletionCert] = useState<{ code: string; url: string } | null>(null);

  // Sync server progress → local state
  useEffect(() => {
    if (!progressData) return;
    setCompletedIds(progressData.lessons.filter(l => l.isCompleted).map(l => l.lessonId));
    if (progressData.certificate) setCompletionCert(progressData.certificate);
  }, [progressData]);

  // Set initial lesson once lessons are available
  useEffect(() => {
    if (!allLessons.length || activeLesson) return;
    const first = allLessons.find(l => !completedIds.includes(l.id)) ?? allLessons[0];
    if (first) setActiveLesson(first);
  }, [allLessons.length]);

  // Auto-expand active section
  useEffect(() => {
    if (!activeLesson || !course) return;
    const section = course.sections.find(s => s.lessons.some(l => l.id === activeLesson.id));
    if (section) setExpandedSections(prev => ({ ...prev, [section.id]: true }));
  }, [activeLesson?.id]);

  // ── Lesson detail ────────────────────────────────────────────────────────────
  const { data: lessonDetail, isLoading: lessonLoading, error: lessonError } = useQuery({
    queryKey: ['lesson-detail', activeLesson?.id],
    queryFn: async () => {
      console.log('[Stream] fetching lessonDetail for', activeLesson!.id);
      const r = await getLessonDetail(activeLesson!.id);
      console.log('[Stream] lessonDetail:', JSON.stringify(r));
      return r;
    },
    enabled: !!activeLesson && activeLesson.type === 'VIDEO',
    staleTime: Infinity,
  });

  useEffect(() => {
    if (lessonError) console.log('[Stream] lessonDetail ERROR:', (lessonError as Error).message);
  }, [lessonError]);

  useEffect(() => {
    console.log('[Stream] activeLesson changed →', activeLesson?.id, activeLesson?.type);
  }, [activeLesson?.id]);

  useEffect(() => {
    console.log('[Stream] lessonDetail status →', lessonDetail?.videoStatus, '| content:', lessonDetail?.content);
    console.log('[Stream] lessonLoading:', lessonLoading, '| videoStream:', videoStream ? 'set' : 'null');
  }, [lessonDetail?.videoStatus, lessonLoading]);

  // Fetch a ready-to-use stream URL from the server.
  useEffect(() => {
    console.log('[Stream] stream effect → lessonId:', activeLesson?.id, '| type:', activeLesson?.type, '| videoStatus:', lessonDetail?.videoStatus);
    if (!activeLesson || activeLesson.type !== 'VIDEO' || lessonDetail?.videoStatus !== 'READY') {
      console.log('[Stream] clearing videoStream (conditions not met)');
      setVideoStream(null);
      return;
    }
    let cancelled = false;
    console.log('[Stream] calling getLessonStream for', activeLesson.id);
    getLessonStream(activeLesson.id)
      .then((stream) => {
        console.log('[Stream] getLessonStream OK:', JSON.stringify(stream));
        if (!cancelled) setVideoStream(stream);
      })
      .catch((err) => {
        console.log('[Stream] getLessonStream FAILED:', err?.message, '| code:', err?.code, '| status:', err?.status);
        if (!cancelled) setVideoStream(null);
      });
    return () => { cancelled = true; };
  }, [activeLesson?.id, lessonDetail?.videoStatus]);

  const videoSource = useMemo<VideoSource | null>(() => {
    if (!activeLesson || activeLesson.type !== 'VIDEO' || !videoStream) return null;

    let uri = videoStream.streamUrl;
    if (uri.startsWith('/')) {
      uri = `${BASE_URL}${uri}`;
    }

    const result = { 
      uri, 
      ...(videoStream.contentType === 'hls' ? { contentType: 'hls' } : {}),
      ...(videoStream.contentType === 'hls' && sessionToken 
        ? { headers: { Cookie: `authjs.session-token=${sessionToken}` } } 
        : {})
    };
    console.log('[Stream] videoSource:', result.uri);
    return result;
  }, [activeLesson?.id, activeLesson?.type, videoStream, sessionToken]);

  // ── Progress mutation ───────────────────────────────────────────────────────
  const { mutate: syncProgress } = useMutation({
    mutationFn: (data: { completedLessonIds: string[]; lastAccessedLessonId?: string }) =>
      updateCourseProgressData(courseId!, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['course-progress', courseId], data);
      if (data.certificate) setCompletionCert(data.certificate);
    },
  });

  // ── Navigation ──────────────────────────────────────────────────────────────
  const activeIdx = allLessons.findIndex(l => l.id === activeLesson?.id);
  const prevLesson = activeIdx > 0 ? allLessons[activeIdx - 1] : null;
  const nextLesson = activeIdx < allLessons.length - 1 ? allLessons[activeIdx + 1] : null;

  function selectLesson(lesson: CourseLesson) {
    setActiveLesson(lesson);
    syncProgress({ completedLessonIds: completedIds, lastAccessedLessonId: lesson.id });
  }

  function toggleComplete() {
    if (!activeLesson) return;
    const next = completedIds.includes(activeLesson.id)
      ? completedIds.filter(id => id !== activeLesson.id)
      : [...completedIds, activeLesson.id];
    setCompletedIds(next);
    syncProgress({ completedLessonIds: next, lastAccessedLessonId: activeLesson.id });
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activeSection = course?.sections.find(s => s.lessons.some(l => l.id === activeLesson?.id));
  const progressPercent = allLessons.length
    ? Math.round((completedIds.length / allLessons.length) * 100)
    : 0;
  const isCompleted = activeLesson ? completedIds.includes(activeLesson.id) : false;
  const showVideo = activeLesson?.type === 'VIDEO';

  const videoStatusMsg =
    lessonDetail?.videoStatus === 'PROCESSING'
      ? 'Video is being processed…'
      : lessonDetail?.videoStatus === 'FAILED'
      ? 'Video processing failed. Please contact the instructor.'
      : null;

  // ─────────────────────────────────────────────────────────────────────────────

  if (courseLoading) {
    return (
      <View style={[styles.fullCenter, { backgroundColor: '#0F1117' }]}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.fullCenter, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Course not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.errorBtn, { backgroundColor: theme.primary }]}>
          <Text style={styles.errorBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.headerBack, pressed && { opacity: 0.6 }]}
        >
          <ArrowLeft size={22} color="#fff" weight="bold" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{course.title}</Text>
          <View style={styles.headerProgressRow}>
            <View style={styles.headerProgressTrack}>
              <View style={[styles.headerProgressFill, { width: `${progressPercent}%` as `${number}%` }]} />
            </View>
            <Text style={styles.headerProgressPct}>{progressPercent}%</Text>
          </View>
        </View>
      </View>

      {/* ── Video area ────────────────────────────────────────────────────── */}
      <View style={{ height: VIDEO_HEIGHT, backgroundColor: '#000' }}>
        {showVideo && videoSource ? (
          // key forces full remount (new player) when lesson changes
          <EmbeddedPlayer key={activeLesson!.id} source={videoSource} />
        ) : showVideo && (lessonLoading || (!videoStream && lessonDetail?.videoStatus === 'READY')) ? (
          // Loading lesson detail
          <View style={[StyleSheet.absoluteFill, styles.videoCenter]}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.85)" />
          </View>
        ) : showVideo && videoStatusMsg ? (
          // PROCESSING or FAILED
          <View style={[StyleSheet.absoluteFill, styles.videoCenter]}>
            <Text style={styles.videoStatusMsg}>{videoStatusMsg}</Text>
          </View>
        ) : (
          // Non-video lesson placeholder
          <View style={[StyleSheet.absoluteFill, styles.videoCenter]}>
            <LessonTypeIcon type={activeLesson?.type ?? ''} color="rgba(255,255,255,0.4)" size={44} />
            <Text style={styles.videoPlaceholderText}>
              {activeLesson?.type === 'ARTICLE' ? 'Article lesson' : activeLesson?.type === 'QUIZ' ? 'Quiz' : 'Select a lesson'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 28 }]}
      >
        {/* Lesson info card */}
        <View style={[styles.lessonCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {activeSection && (
            <Text style={[styles.sectionBreadcrumb, { color: theme.textSecondary }]} numberOfLines={1}>
              {activeSection.title}
            </Text>
          )}
          <Text style={[styles.lessonCardTitle, { color: theme.text }]} numberOfLines={2}>
            {activeLesson?.title ?? 'Select a lesson'}
          </Text>

          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: theme.surfaceEl }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: progressPercent === 100 ? theme.success : theme.primary },
                  { width: `${progressPercent}%` as `${number}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: theme.primary }]}>
              {completedIds.length}/{allLessons.length}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => prevLesson && selectLesson(prevLesson)}
              disabled={!prevLesson}
              style={({ pressed }) => [
                styles.navBtn,
                { borderColor: theme.border, backgroundColor: theme.surface },
                !prevLesson && { opacity: 0.3 },
                pressed && { backgroundColor: theme.surfaceEl },
              ]}
            >
              <ArrowLeft size={18} color={theme.text} weight="bold" />
            </Pressable>

            <Pressable
              onPress={toggleComplete}
              disabled={!activeLesson}
              style={({ pressed }) => [
                styles.completeBtn,
                isCompleted
                  ? { backgroundColor: theme.success + '1A', borderWidth: 1, borderColor: theme.success }
                  : { backgroundColor: theme.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              {isCompleted ? (
                <>
                  <CheckCircle size={15} color={theme.success} weight="fill" />
                  <Text style={[styles.completeBtnText, { color: theme.success }]}>Completed</Text>
                </>
              ) : (
                <Text style={[styles.completeBtnText, { color: '#fff' }]}>Mark Complete</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => nextLesson && selectLesson(nextLesson)}
              disabled={!nextLesson}
              style={({ pressed }) => [
                styles.navBtn,
                { borderColor: theme.border, backgroundColor: theme.surface },
                !nextLesson && { opacity: 0.3 },
                pressed && { backgroundColor: theme.surfaceEl },
              ]}
            >
              <ArrowRight size={18} color={theme.text} weight="bold" />
            </Pressable>
          </View>
        </View>

        {/* Curriculum */}
        <View style={[styles.curriculumCard, { backgroundColor: theme.surface }]}>
          <View style={styles.curriculumHeader}>
            <Text style={[styles.curriculumTitle, { color: theme.text }]}>Course Content</Text>
            <Text style={[styles.curriculumMeta, { color: theme.textSecondary }]}>
              {completedIds.length}/{allLessons.length} complete
            </Text>
          </View>

          {course.sections.map((section, sIdx) => {
            const isOpen = !!expandedSections[section.id];
            const doneCount = section.lessons.filter(l => completedIds.includes(l.id)).length;
            const isLast = sIdx === course.sections.length - 1;

            return (
              <View
                key={section.id}
                style={[
                  styles.sectionBlock,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                ]}
              >
                <Pressable
                  onPress={() => setExpandedSections(prev => ({ ...prev, [section.id]: !isOpen }))}
                  style={({ pressed }) => [styles.sectionHeader, pressed && { backgroundColor: theme.surfaceEl }]}
                >
                  <View style={styles.sectionHeaderText}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={2}>
                      {section.title}
                    </Text>
                    <Text style={[styles.sectionMeta, { color: theme.textSecondary }]}>
                      {doneCount}/{section.lessons.length} lessons
                    </Text>
                  </View>
                  {isOpen
                    ? <CaretUp size={15} color={theme.textSecondary} weight="bold" />
                    : <CaretDown size={15} color={theme.textSecondary} weight="bold" />}
                </Pressable>

                {isOpen && section.lessons.map((lesson, lIdx) => {
                  const done = completedIds.includes(lesson.id);
                  const active = lesson.id === activeLesson?.id;
                  const isLastLesson = lIdx === section.lessons.length - 1;

                  return (
                    <Pressable
                      key={lesson.id}
                      onPress={() => selectLesson(lesson)}
                      style={({ pressed }) => [
                        styles.lessonRow,
                        active && { backgroundColor: theme.primaryLight },
                        !active && pressed && { backgroundColor: theme.surfaceEl },
                        !isLastLesson && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                      ]}
                    >
                      <View style={styles.lessonRowIcon}>
                        <LessonTypeIcon
                          type={lesson.type}
                          color={active ? theme.primary : theme.textSecondary}
                          size={14}
                        />
                      </View>
                      <View style={styles.lessonRowBody}>
                        <Text
                          style={[
                            styles.lessonRowTitle,
                            { color: active ? theme.primary : theme.text },
                            active && { fontFamily: Fonts.semiBold },
                          ]}
                          numberOfLines={2}
                        >
                          {lesson.title}
                        </Text>
                        {!!lesson.duration && lesson.duration > 0 && (
                          <Text style={[styles.lessonRowDur, { color: theme.textSecondary }]}>
                            {formatDuration(lesson.duration)}
                          </Text>
                        )}
                      </View>
                      {done ? (
                        <CheckCircle size={16} color={theme.success} weight="fill" />
                      ) : active ? (
                        <Play size={13} color={theme.primary} weight="fill" />
                      ) : (
                        <View style={[styles.emptyCircle, { borderColor: theme.border }]} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Completion modal ──────────────────────────────────────────────── */}
      {completionCert && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalIcon, { backgroundColor: theme.primaryLight }]}>
              <Trophy size={32} color={theme.primary} weight="fill" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Course Completed!</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              {'Congratulations on finishing\n'}
              <Text style={{ color: theme.text, fontFamily: Fonts.semiBold }}>{course.title}</Text>
            </Text>
            <View style={[styles.modalCertRow, { backgroundColor: theme.surfaceEl }]}>
              <Text style={[styles.modalCertLabel, { color: theme.textSecondary }]}>Certificate ID</Text>
              <Text style={[styles.modalCertCode, { color: theme.text }]}>{completionCert.code}</Text>
            </View>
            <Pressable
              onPress={() => setCompletionCert(null)}
              style={[styles.modalBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.modalBtnText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { fontSize: 16, fontFamily: Fonts.semiBold },
  errorBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  errorBtnText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0F1117',
    paddingHorizontal: 14, paddingBottom: 12, gap: 10,
  },
  headerBack: { padding: 4 },
  headerCenter: { flex: 1, gap: 5 },
  headerTitle: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold, letterSpacing: -0.2 },
  headerProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerProgressTrack: {
    flex: 1, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden',
  },
  headerProgressFill: { height: '100%', borderRadius: 2, backgroundColor: PRIMARY },
  headerProgressPct: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: Fonts.semiBold },

  videoCenter: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  videoStatusMsg: {
    color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: Fonts.regular,
    textAlign: 'center', paddingHorizontal: 24,
  },
  videoPlaceholderText: {
    color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: Fonts.regular,
  },

  scrollBody: { gap: 8, paddingTop: 8 },

  lessonCard: {
    marginHorizontal: 14, borderRadius: 14, borderWidth: 1, padding: 16, gap: 10,
  },
  sectionBreadcrumb: {
    fontSize: 11, fontFamily: Fonts.semiBold,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  lessonCardTitle: { fontSize: 16, fontFamily: Fonts.bold, lineHeight: 22, letterSpacing: -0.2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 4, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11, fontFamily: Fonts.bold, minWidth: 36, textAlign: 'right' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  navBtn: {
    width: 42, height: 42, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  completeBtn: {
    flex: 1, height: 42, borderRadius: 10,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  completeBtnText: { fontSize: 13, fontFamily: Fonts.bold, letterSpacing: 0.1 },

  curriculumCard: { marginHorizontal: 14, borderRadius: 14, overflow: 'hidden' },
  curriculumHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  curriculumTitle: { fontSize: 15, fontFamily: Fonts.extraBold, letterSpacing: -0.2 },
  curriculumMeta: { fontSize: 12, fontFamily: Fonts.regular },
  sectionBlock: {},
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 10,
  },
  sectionHeaderText: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 13, fontFamily: Fonts.bold, lineHeight: 18 },
  sectionMeta: { fontSize: 11, fontFamily: Fonts.regular },
  lessonRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  lessonRowIcon: { width: 22, alignItems: 'center', flexShrink: 0 },
  lessonRowBody: { flex: 1, gap: 3 },
  lessonRowTitle: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
  lessonRowDur: { fontSize: 11, fontFamily: Fonts.regular },
  emptyCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 360, borderRadius: 20, padding: 28, alignItems: 'center', gap: 14,
  },
  modalIcon: { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: Fonts.extraBold, letterSpacing: -0.4 },
  modalSub: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 20, textAlign: 'center' },
  modalCertRow: { width: '100%', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  modalCertLabel: { fontSize: 11, fontFamily: Fonts.medium, textTransform: 'uppercase', letterSpacing: 0.4 },
  modalCertCode: { fontSize: 13, fontFamily: Fonts.mono },
  modalBtn: { width: '100%', height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  modalBtnText: { color: '#fff', fontSize: 15, fontFamily: Fonts.bold },
});
