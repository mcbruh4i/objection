// BrutalCheckbox.tsx
// Hand-drawn brutalist checkbox — SVG rebuild of the uiverse blob checkbox.
// RN borderRadius cannot express elliptical per-corner radii, so the blob
// outline is drawn as an SVG path (exact quarter-ellipse corners, like CSS).
//
// OWNER-SUPPLIED COMPONENT (feedback round 2), adapted to the token rule:
// the original hardcoded INK #1a1a1a / PAPER #fdfcf0 / ORANGE #ff5722 —
// here mapped to theme.colors.line / surface / accent (zero hex outside
// palette.ts). Geometry constants are the component's intrinsic drawing
// math and stay as authored. Animations preserved EXACTLY:
// 200ms back-out pop on check/uncheck + 300ms splash tick (210 up, 90 settle).
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { theme } from "../../theme/tokens";

export type BrutalCheckboxProps = {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

const EM = 25; // font-size: 25px
const BOX = 1.5 * EM; // 37.5 — 1.5em
const BORDER = 0.16 * EM; // 4px border
const SHADOW = 0.2 * EM; // 5px 5px 0 box-shadow
const PAD = BORDER / 2 + 1; // canvas padding for the centered stroke
const CANVAS = BOX + 2 * PAD + SHADOW;

// Token mapping of the original INK / PAPER / ORANGE constants.
const INK = theme.colors.line;
const PAPER = theme.colors.surface;
const ORANGE = theme.colors.accent;

type Corner = { rx: number; ry: number };

// Rounded rect with elliptical corners, order: tl tr br bl (fractions of BOX).
function blobPath([tl, tr, br, bl]: [Corner, Corner, Corner, Corner]) {
  const S = BOX;
  const r = (f: number) => f * S;
  return [
    `M ${r(tl.rx)} 0`,
    `L ${S - r(tr.rx)} 0`,
    `A ${r(tr.rx)} ${r(tr.ry)} 0 0 1 ${S} ${r(tr.ry)}`,
    `L ${S} ${S - r(br.ry)}`,
    `A ${r(br.rx)} ${r(br.ry)} 0 0 1 ${S - r(br.rx)} ${S}`,
    `L ${r(bl.rx)} ${S}`,
    `A ${r(bl.rx)} ${r(bl.ry)} 0 0 1 0 ${S - r(bl.ry)}`,
    `L 0 ${r(tl.ry)}`,
    `A ${r(tl.rx)} ${r(tl.ry)} 0 0 1 ${r(tl.rx)} 0`,
    "Z",
  ].join(" ");
}

// border-radius: 8% 92% 12% 88% / 87% 11% 89% 13%
const UNCHECKED_PATH = blobPath([
  { rx: 0.08, ry: 0.87 },
  { rx: 0.92, ry: 0.11 },
  { rx: 0.12, ry: 0.89 },
  { rx: 0.88, ry: 0.13 },
]);
// border-radius: 92% 8% 88% 12% / 11% 87% 13% 89%
const CHECKED_PATH = blobPath([
  { rx: 0.92, ry: 0.11 },
  { rx: 0.08, ry: 0.87 },
  { rx: 0.88, ry: 0.13 },
  { rx: 0.12, ry: 0.89 },
]);

// Exact geometry of the CSS ::after tick (13.75x23.75 border box, rotated
// 40deg about (9, 2.25)) — it deliberately overflows the top-left edge.
const TICK_PATH = "M 8.5 20 L 15.5 27 L 29 11.5";
const TICK_PAD = 0;

export default function BrutalCheckbox({
  accessibilityLabel,
  checked,
  disabled = false,
  onChange,
}: BrutalCheckboxProps) {
  const [pressed, setPressed] = useState(false);
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const tick = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const pop = Animated.timing(progress, {
      duration: 200,
      easing: Easing.bezier(0.175, 0.885, 0.32, 1.275),
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
    });
    pop.start();
    if (checked) {
      // splash: 0 -> 1.2 (70%) -> 1 (100%) over 300ms
      tick.setValue(0);
      const splash = Animated.sequence([
        Animated.timing(tick, {
          duration: 210,
          easing: Easing.out(Easing.quad),
          toValue: 1.2,
          useNativeDriver: true,
        }),
        Animated.timing(tick, {
          duration: 90,
          easing: Easing.in(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]);
      splash.start();
      return () => {
        pop.stop();
        splash.stop();
      };
    }
    tick.setValue(0);
    return () => pop.stop();
  }, [checked, progress, tick]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-2deg"] });
  const transform = pressed
    ? [{ translateY: SHADOW - 1 }, { scale: 0.9 }]
    : [{ scale }, { rotate }];
  const blob = checked ? CHECKED_PATH : UNCHECKED_PATH;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={theme.touch.hitSlop}
      onPress={() => onChange?.(!checked)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles.root}
    >
      <Animated.View style={[styles.box, { transform }]}>
        <Svg
          height={CANVAS}
          style={styles.canvas}
          viewBox={`${-PAD} ${-PAD} ${CANVAS} ${CANVAS}`}
          width={CANVAS}
        >
          {pressed ? null : (
            <Path
              d={blob}
              fill={INK}
              stroke={INK}
              strokeWidth={BORDER}
              transform={`translate(${SHADOW} ${SHADOW})`}
            />
          )}
          <Path d={blob} fill={checked ? ORANGE : PAPER} stroke={INK} strokeWidth={BORDER} />
        </Svg>
        {checked ? (
          <Animated.View style={[styles.tickLayer, { transform: [{ scale: tick }] }]}>
            <Svg
              height={BOX + 2 * TICK_PAD}
              viewBox={`${-TICK_PAD} ${-TICK_PAD} ${BOX + 2 * TICK_PAD} ${BOX + 2 * TICK_PAD}`}
              width={BOX + 2 * TICK_PAD}
            >
              <Path
                d={TICK_PATH}
                fill="none"
                stroke={INK}
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeWidth={0.25 * EM}
              />
            </Svg>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { height: BOX, width: BOX },
  canvas: { left: -PAD, position: "absolute", top: -PAD },
  root: { height: BOX + SHADOW + BORDER, width: BOX + SHADOW + BORDER },
  tickLayer: { bottom: -TICK_PAD, left: -TICK_PAD, position: "absolute", right: -TICK_PAD, top: -TICK_PAD },
});
