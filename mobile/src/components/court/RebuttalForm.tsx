/**
 * The defendant's rebuttal input. The court may loop this stage multiple
 * rounds (should_rule=false) before the judge finally rules.
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../common/AppText";
import { BruteButton } from "../common/BruteButton";
import { CourtTextArea } from "./CourtTextArea";
import { theme } from "../../theme/tokens";

interface Props {
  /** Increment to clear the field for a new round. */
  round: number;
  onSubmit: (text: string) => void;
  busy: boolean;
}

export function RebuttalForm({ round, onSubmit, busy }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [clearedForRound, setClearedForRound] = useState(round);

  if (clearedForRound !== round) {
    setClearedForRound(round);
    setText("");
  }

  const trimmed = text.trim();

  return (
    <View style={styles.wrap}>
      <AppText variant="h2" color="textOnDark">
        {t("court.rebuttal_title")}
      </AppText>
      <CourtTextArea
        value={text}
        onChangeText={setText}
        placeholder={t("court.rebuttal_placeholder")}
        editable={!busy}
      />
      <BruteButton
        label={t("court.rebuttal_submit")}
        onPress={() => onSubmit(trimmed)}
        disabled={trimmed.length === 0 || busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.md,
  },
});
