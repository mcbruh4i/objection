/**
 * Add-habit input — cadence-aware (owner spec, round 3): the ACTIVE cadence
 * tab decides what this creates, and the placeholder matches it (daily
 * promise vs weekly/monthly target). The cadence tabs themselves live on
 * the screen, above this input.
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BruteTextInput } from "../common/BruteTextInput";
import { BruteButton } from "../common/BruteButton";
import type { HabitCadence } from "../../state/cadenceStore";
import { HABIT_TITLE_MAX } from "../../api/types";
import { theme } from "../../theme/tokens";

interface Props {
  /** The active cadence tab — new habits are created with this cadence. */
  cadence: HabitCadence;
  onSubmit: (title: string) => void;
  busy: boolean;
}

export function AddHabitInput({ cadence, onSubmit, busy }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const trimmed = title.trim();

  const submit = (): void => {
    if (trimmed.length === 0 || busy) return;
    onSubmit(trimmed);
    setTitle("");
  };

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <BruteTextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t(`today.add_habit_placeholder_${cadence}`)}
          maxLength={HABIT_TITLE_MAX}
          onSubmitEditing={submit}
          returnKeyType="done"
        />
      </View>
      <BruteButton
        label={t("today.add_habit_submit")}
        onPress={submit}
        disabled={trimmed.length === 0 || busy}
        compact
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: theme.spacing.md,
    alignItems: "stretch",
  },
  field: {
    flex: 1,
  },
  button: {
    alignSelf: "stretch",
    justifyContent: "center",
  },
});
