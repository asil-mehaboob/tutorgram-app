import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { CircleNotch } from 'phosphor-react-native';

export function VideoSpinner({ size = 40, color = 'rgba(255,255,255,0.9)' }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={[styles.container, { width: size + 24, height: size + 24, borderRadius: (size + 24) / 2 }]}>
      <Animated.View style={[animStyle, styles.animWrapper, { width: size, height: size }]}>
        <CircleNotch size={size} color={color} weight="bold" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
