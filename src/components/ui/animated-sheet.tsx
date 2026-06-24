import { useEffect, useRef } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
};

const DISMISS_THRESHOLD = 80;
const SPRING = { damping: 28, stiffness: 300, mass: 0.8 };

export function AnimatedSheet({ visible, onClose, children, contentStyle }: Props) {
  const theme = useTheme();
  const translateY = useSharedValue(800);
  const backdropOpacity = useSharedValue(0);
  const dragY = useSharedValue(0);

  function dismiss() {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(800, { duration: 260 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }

  useEffect(() => {
    if (visible) {
      dragY.value = 0;
      translateY.value = 800;
      backdropOpacity.value = 0;
      backdropOpacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, SPRING);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        dragY.value = Math.max(0, g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD || g.vy > 0.8) {
          dismiss();
        } else {
          dragY.value = withSpring(0, SPRING);
        }
      },
      onPanResponderTerminate: () => {
        dragY.value = withSpring(0, SPRING);
      },
    }),
  ).current;

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + interpolate(dragY.value, [0, 800], [0, 800]) }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * interpolate(dragY.value, [0, 300], [1, 0], 'clamp'),
  }));

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: theme.background },
            sheetStyle,
            contentStyle,
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={[styles.pill, { backgroundColor: theme.border }]} />
          </View>

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  pill: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
