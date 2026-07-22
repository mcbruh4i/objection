/**
 * The ONLY way text is rendered in this app.
 * Enforces the token rule: variants come from theme.type, colors from
 * theme.colors — no component can invent a font, size, or color.
 */
import React from "react";
import { StyleSheet, Text, TextProps, TextStyle } from "react-native";
import { theme, TypeVariantName } from "../../theme/tokens";

type ColorName = keyof typeof theme.colors;

interface Props extends TextProps {
  variant?: TypeVariantName;
  color?: ColorName;
  align?: TextStyle["textAlign"];
  children: React.ReactNode;
}

export function AppText({
  variant = "body",
  color = "textPrimary",
  align,
  style,
  children,
  ...rest
}: Props): React.JSX.Element {
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        theme.type[variant],
        { color: theme.colors[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    // RTL-first: Persian text renders right-to-left even inside LTR devices.
    writingDirection: "rtl",
  },
});
