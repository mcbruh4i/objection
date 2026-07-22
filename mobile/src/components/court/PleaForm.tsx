/**
 * The plea stage: the judge's formal summons + the defendant's statement.
 * Judge copy is FORMAL Persian (tone split, roadmap hard rule 6).
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../common/AppText";
import { BruteButton } from "../common/BruteButton";
import { CourtTextArea } from "./CourtTextArea";
import { theme } from "../../theme/tokens";

interface Props {
  onSubmit: (text: string) => void;
  busy: boolean;
}

export function PleaForm({ onSubmit, busy }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const trimmed = text.trim();

  return (
    <View style={styles.wrap}>
      <AppText variant="h2" color="textOnDark">
        {t("court.plea_title")}
      </AppText>
      <AppText variant="body" color="textMutedOnDark">
        {t("court.plea_intro")}
      </AppText>
      <CourtTextArea
        value={text}
        onChangeText={setText}
        placeholder={t("court.plea_placeholder")}
        editable={!busy}
      />
      <BruteButton
        label={t("court.plea_submit")}
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
