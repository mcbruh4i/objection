/**
 * The habit check control — public interface unchanged (checked, onToggle,
 * disabled, accessibilityLabel), internals replaced with the owner's
 * BrutalCheckbox (SVG blob + pop/rotate + splash tick animation), which
 * fixed the "no animation, feels stuttery" bug from feedback round 1.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import BrutalCheckbox from "./BrutalCheckbox";
import { theme } from "../../theme/tokens";

interface Props {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}

export function BruteCheck({
  checked,
  onToggle,
  disabled = false,
  accessibilityLabel,
}: Props): React.JSX.Element {
  return (
    <View style={[styles.outer, disabled && styles.disabled]}>
      <BrutalCheckbox
        checked={checked}
        onChange={() => onToggle()}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    minWidth: theme.touch.minTarget,
    minHeight: theme.touch.minTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: theme.opacity.disabled,
  },
});
