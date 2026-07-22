/**
 * Testimony input for plea/rebuttal: tall, dark-world styled, with a
 * Persian-digit character counter against the 600-char contract limit.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../common/AppText";
import { BruteTextInput } from "../common/BruteTextInput";
import { TEXT_SUBMISSION_MAX } from "../../api/types";
import { formatCharCount } from "../../utils/format";
import { theme } from "../../theme/tokens";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  editable: boolean;
}

export function CourtTextArea({ value, onChangeText, placeholder, editable }: Props): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <BruteTextInput
        tall
        tone="court"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        maxLength={TEXT_SUBMISSION_MAX}
        editable={editable}
      />
      <AppText variant="caption" color="textMutedOnDark">
        {formatCharCount(value.length, TEXT_SUBMISSION_MAX)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.xs,
  },
});
