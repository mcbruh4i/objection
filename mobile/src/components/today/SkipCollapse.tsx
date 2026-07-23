/**
 * Synchronized height collapse for the skip-box area (owner spec, round 3).
 *
 * Choreography contract:
 * - Starts in the SAME React commit as the checkbox tick (both react to the
 *   same optimistic status flip), so the two animations begin on one frame.
 * - Duration and easing are DERIVED from the checkbox's exported contract:
 *   collapse (check) = CHECK_TOTAL_MS (300ms, pop+splash total),
 *   expand (uncheck) = UNCHECK_TOTAL_MS (200ms, pop only) — both end on the
 *   checkbox's final frame. Easing = the same back-out curve; the height
 *   interpolation is CLAMPED so the overshoot never yields negative heights.
 * - Height is a layout prop → JS-driven (useNativeDriver false) so the card
 *   and the whole list reflow smoothly with it. No opacity fade, no unmount
 *   jump: children stay mounted and are clipped by overflow hidden.
 */
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import {
  CHECK_EASING,
  CHECK_TOTAL_MS,
  UNCHECK_TOTAL_MS,
} from "../common/BrutalCheckbox";

interface Props {
  /** true = fully expanded (habit pending), false = collapsed (checked). */
  visible: boolean;
  children: React.ReactNode;
}

export function SkipCollapse({ visible, children }: Props): React.JSX.Element {
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const firstRender = useRef(true);
  const lastVisible = useRef(visible);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      lastVisible.current = visible;
      return;
    }
    if (lastVisible.current === visible) return;
    lastVisible.current = visible;
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      // Collapse rides the full check motion; expand rides the un-tick pop.
      duration: visible ? UNCHECK_TOTAL_MS : CHECK_TOTAL_MS,
      easing: CHECK_EASING,
      useNativeDriver: false, // height is a layout prop
    });
    animation.start();
    return () => animation.stop();
  }, [visible, progress]);

  const animatedHeight =
    contentHeight === null
      ? null
      : progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, contentHeight],
          // Back-out overshoot must never produce negative/over heights.
          extrapolate: "clamp",
        });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        animatedHeight !== null
          ? { height: animatedHeight }
          : visible
            ? null
            : styles.collapsedBeforeMeasure,
      ]}
    >
      <View
        onLayout={(event) => {
          const measured = event.nativeEvent.layout.height;
          if (measured > 0 && (contentHeight === null || Math.abs(measured - contentHeight) > 1)) {
            setContentHeight(measured);
          }
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
  },
  collapsedBeforeMeasure: {
    height: 0,
  },
});
