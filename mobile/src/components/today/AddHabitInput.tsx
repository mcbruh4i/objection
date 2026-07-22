/**
 * Add-habit input: title + fine cadence (daily / weekly / monthly — no
 * yearly). The cadence sets the default penalty sent to the server
 * (see state/cadenceStore.ts) and which Today section the habit lives in.
 */
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BruteTextInput } from "../common/BruteTextInput";
import { BruteButton } from "../common/BruteButton";
import { CadencePicker } from "./CadencePicker";
import type { HabitCadence } from "../../state/cadenceStore";
import { HABIT_TITLE_MAX } from "../../api/types";
import { theme } from "../../theme/tokens";

interface Props {
  onSubmit: (title: string, cadence: HabitCadence) => void;
  busy: boolean;
}

export function AddHabitInput({ onSubmit, busy }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [cadence, setCadence] = useState<HabitCadence>("daily");
  const trimmed = title.trim();

  const submit = (): void => {
    if (trimmed.length === 0 || busy) return;
    onSubmit(trimmed, cadence);
    setTitle("");
    setCadence("daily");
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.field}>
          <BruteTextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("today.add_habit_placeholder")}
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
      <CadencePicker value={cadence} onChange={setCadence} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.sm,
  },
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
