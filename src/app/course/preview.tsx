import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  ArrowLeft,
  DeviceRotate,
  FastForward,
  Pause,
  Play,
  Rewind,
} from 'phosphor-react-native';
import { Fonts } from '@/constants/theme';
import { VideoSpinner } from '@/components/ui/video-spinner';

// ─── constants ────────────────────────────────────────────────────────────────

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const HIDE_DELAY = 3000;
const PRIMARY = '#7C8EF8';
const THUMB = 14;

function fmt(s: number) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}


// ─── screen ───────────────────────────────────────────────────────────────────

export default function CoursePreviewScreen() {
  const { uri, title } = useLocalSearchParams<{ uri: string; title?: string }>();
  const insets = useSafeAreaInsets();

  // ── player ───────────────────────────────────────────────────────────────
  const player = useVideoPlayer({ uri: uri ?? '' }, (p) => {
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

  const isLoading = status === 'loading' || status === 'idle';

  // ── controls auto-hide ────────────────────────────────────────────────────
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

  // Show controls whenever paused
  useEffect(() => { if (!isPlaying) show(); else resetTimer(); }, [isPlaying]);

  // ── handlers ─────────────────────────────────────────────────────────────
  function handleTap() {
    if (visible.current) { if (hideTimer.current) clearTimeout(hideTimer.current); hide(); }
    else { resetTimer(); }
  }

  function togglePlay() {
    if (player.playing) player.pause(); else player.play();
    resetTimer();
  }

  function skip(secs: number) { player.seekBy(secs); resetTimer(); }

  // ── seek bar ─────────────────────────────────────────────────────────────
  const [barWidth, setBarWidth] = useState(1);
  const progress = duration > 0 ? Math.min(1, (currentTime ?? 0) / duration) : 0;
  const fillW = barWidth * progress;
  const thumbL = Math.max(0, fillW - THUMB / 2);

  function seek(x: number) {
    if (duration <= 0) return;
    player.currentTime = Math.max(0, Math.min(1, x / barWidth)) * duration;
    resetTimer();
  }

  // ── speed ─────────────────────────────────────────────────────────────────
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);

  function changeSpeed(s: number) {
    player.playbackRate = s;
    setSpeed(s);
    setSpeedOpen(false);
    resetTimer();
  }

  // ── orientation ──────────────────────────────────────────────────────────
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    // Unlock all orientations while in the player
    ScreenOrientation.unlockAsync();

    // Track orientation changes to keep the icon in sync
    const sub = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
      const o = orientationInfo.orientation;
      setIsLandscape(
        o === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
      );
    });

    return () => {
      // Restore portrait when leaving the screen
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      sub.remove();
    };
  }, []);

  async function toggleLandscape() {
    if (isLandscape) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
    resetTimer();
  }

  // ─────────────────────────────────────────────────────────────────────────

  const safeBottom = Math.max(insets.bottom, 8);
  const safeTop = insets.top;

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />

      {/* ── 1. Video ──────────────────────────────────────────────────────── */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit="contain"
      />

      {/* ── 2. Buffering / pause icon (non-interactive, below tap zone) ──── */}
      {isLoading ? (
        <View style={styles.centered} pointerEvents="none">
          <VideoSpinner size={40} />
        </View>
      ) : !isPlaying ? (
        <View style={styles.centered} pointerEvents="none">
          <View style={styles.centerPlay}>
            <Play size={36} color="#fff" weight="fill" />
          </View>
        </View>
      ) : null}

      {/* ── 3. Full-screen tap zone ───────────────────────────────────────── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap} />

      {/* ── 4. Controls (top + bottom bars, absolutely positioned) ─────────
          Animated.View uses opacity only — no pointerEvents in style.
          pointerEvents prop "box-none" lets the tap zone (behind) catch
          touches on empty areas while children (buttons) stay interactive. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="box-none">

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: safeTop + 8 }]}>
          <Pressable
            onPress={() => { player.pause(); router.back(); }}
            style={({ pressed }) => [styles.iconCircle, pressed && { opacity: 0.7 }]}
            hitSlop={12}
          >
            <ArrowLeft size={20} color="#fff" weight="bold" />
          </Pressable>
          {!!title && (
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          )}
        </View>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: safeBottom + 6 }]}>

          {/* Seek bar */}
          <View
            style={styles.seekTrack}
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => seek(e.nativeEvent.locationX)}
            onResponderMove={(e) => seek(e.nativeEvent.locationX)}
          >
            <View style={styles.seekBg} />
            <View style={[styles.seekFill, { width: fillW }]} />
            <View style={[styles.seekThumb, { left: thumbL }]} />
          </View>

          {/* Controls row */}
          <View style={styles.row}>

            {/* Left: skip · play · skip · time */}
            <View style={styles.rowLeft}>
              <Pressable onPress={() => skip(-10)} style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} hitSlop={8}>
                <Rewind size={18} color="#fff" weight="fill" />
              </Pressable>

              <Pressable onPress={togglePlay} style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} hitSlop={8}>
                {isPlaying
                  ? <Pause size={22} color="#fff" weight="fill" />
                  : <Play size={22} color="#fff" weight="fill" />}
              </Pressable>

              <Pressable onPress={() => skip(10)} style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} hitSlop={8}>
                <FastForward size={18} color="#fff" weight="fill" />
              </Pressable>

              <Text style={styles.time}>{fmt(currentTime ?? 0)} / {fmt(duration)}</Text>
            </View>

            {/* Right: speed · landscape */}
            <View style={styles.rowRight}>
              <Pressable
                onPress={() => { setSpeedOpen((v) => !v); resetTimer(); }}
                style={({ pressed }) => [styles.speedPill, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                <Text style={styles.speedLabel}>{speed === 1 ? '1×' : `${speed}×`}</Text>
              </Pressable>

              <Pressable
                onPress={() => { toggleLandscape(); }}
                style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                hitSlop={8}
              >
                <DeviceRotate size={20} color="#fff" weight={isLandscape ? 'fill' : 'regular'} />
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* ── 5. Speed menu ────────────────────────────────────────────────── */}
      {speedOpen && (
        <View style={[styles.speedMenu, { bottom: safeBottom + 6 + 58 }]}>
          {SPEEDS.map((s) => (
            <Pressable
              key={s}
              onPress={() => changeSpeed(s)}
              style={({ pressed }) => [
                styles.speedItem,
                s === speed && styles.speedItemActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.speedItemText, s === speed && styles.speedItemTextActive]}>
                {s === 1 ? 'Normal' : `${s}×`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Absolute centre (loading + pause icon)
  centered: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlay: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },

  // Top bar — absolute at top
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    // gradient-like fade from black
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },

  // Bottom bar — absolute at bottom
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 10,
  },

  // Seek bar
  seekTrack: {
    height: 22,
    justifyContent: 'center',
  },
  seekBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  seekFill: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },
  seekThumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: PRIMARY,
    top: (22 - THUMB) / 2,
  },

  // Controls row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  btn: { padding: 8, borderRadius: 8 },
  btnPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },

  time: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginLeft: 6,
  },

  speedPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  speedLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  // Speed menu
  speedMenu: {
    position: 'absolute',
    right: 14,
    backgroundColor: 'rgba(12,12,12,0.96)',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    minWidth: 108,
  },
  speedItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  speedItemActive: {
    backgroundColor: PRIMARY + '28',
  },
  speedItemText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  speedItemTextActive: {
    color: PRIMARY,
    fontFamily: Fonts.semiBold,
  },
});
