/**
 * Bordered text input, RTL-first. Long Persian strings wrap, never clip.
 */
import React from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { theme } from "../../theme/tokens";

interface Props extends TextInputProps {
  /** Multiline court testimony vs single-line fields. */
  tall?: boolean;
  tone?: "paper" | "court";
}

export function BruteTextInput({ tall = false, tone = "paper", style, ...rest }: Props): React.JSX.Element {
  const isCourt = tone === "court";
  return (
    <View
      style={[
        styles.frame,
        {
          backgroundColor: isCourt ? theme.colors.surfaceCourt : theme.colors.surface,
          borderColor: isCourt ? theme.colors.lineOnDark : theme.colors.line,
        },
      ]}
    >
      <TextInput
        {...rest}
        multiline={tall}
        placeholderTextColor={isCourt ? theme.colors.textMutedOnDark : theme.colors.textMuted}
        style={[
          styles.input,
          theme.type.body,
          {
            color: isCourt ? theme.colors.textOnDark : theme.colors.textPrimary,
          },
          tall && styles.tall,
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: theme.borders.bold,
    borderRadius: theme.radii.none,
  },
  input: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: theme.touch.minTarget,
    // RTL-first typing: caret and alignment on the right.
    textAlign: "right",
    writingDirection: "rtl",
  },
  tall: {
    minHeight: 120,
    textAlignVertical: "top",
  },
});
