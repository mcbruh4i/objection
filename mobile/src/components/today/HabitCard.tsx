/**
 * One habit row. Interaction states (owner-corrected design, round 2):
 *
 * pending    → live check + SkipBox («امروز نمی‌تونم») underneath
 * completed  → checked; tap again to uncheck (real /uncomplete round-trip)
 * skipped + open session   → check disabled (stays UNCHECKED — skip never
 *                            checks the box), red "در دادگاه" chip resumes court
 * skipped + resolved case  → SEALED: the unchecked checkbox stays visually
 *                            present underneath, everything is
 *                            non-interactive, and a VerdictStamp overlay
 *                            (compact) covers the checkbox + skip-box area:
 *                            rejected → GUILTY (red ink), accepted →
 *                            DISMISSED (dark ink). Unknown verdict (fresh
 *                            install) → no stamp, «مختومه» chip only.
 *
 * `busy` is per-habit (the shared-busy bug dimmed every card at once).
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Habit, VerdictKind } from "../../api/types";
import { AppText } from "../common/AppText";
import { BruteCard } from "../common/BruteCard";
import { BruteCheck } from "../common/BruteCheck";
import { VerdictStamp } from "../court/VerdictStamp";
import { SkipBox } from "./SkipBox";
import { formatMoney, formatTimeOfIso } from "../../utils/format";
import { theme } from "../../theme/tokens";

interface Props {
  habit: Habit;
  /** True when this habit owns the currently open court session. */
  hasOpenSession: boolean;
  /** How this habit's court case resolved (client-side record), if known. */
  verdict: VerdictKind | null;
  /** True only while THIS habit has a request in flight. */
  busy: boolean;
  onToggleComplete: (habit: Habit) => void;
  onSkip: (habit: Habit) => void;
  onResumeCourt: () => void;
}

export function HabitCard({
  habit,
  hasOpenSession,
  verdict,
  busy,
  onToggleComplete,
  onSkip,
  onResumeCourt,
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const completed = habit.status === "completed";
  const skipped = habit.status === "skipped";
  /** Skipped with no open session ⇒ its case has been resolved ⇒ judged. */
  const judged = skipped && !hasOpenSession;

  const checkLabel = judged
    ? t("today.habit_judged_locked_a11y")
    : completed
      ? t("today.habit_check_uncomplete_a11y")
      : t("today.habit_check_complete_a11y");

  return (
    <BruteCard surfaceColor={judged ? "surfaceAlt" : "surface"}>
      {/* Sealed cards are fully non-interactive underneath the stamp. */}
      <View style={judged ? styles.sealedUnder : null}>
        <View style={styles.row}>
          <BruteCheck
            // Skip never checks the box: a skipped habit's check stays in its
            // unattempted state through the whole court flow and after.
            checked={completed}
            disabled={busy || skipped}
            onToggle={() => onToggleComplete(habit)}
            accessibilityLabel={checkLabel}
          />
          <View style={styles.info}>
            <AppText
              variant="h2"
              color={judged ? "textMuted" : "textPrimary"}
              style={completed ? styles.struck : null}
            >
              {habit.title}
            </AppText>
            <View style={styles.metaRow}>
              <AppText variant="caption" color="textMuted">
                {t("today.habit_deadline", { time: formatTimeOfIso(habit.deadline_at) })}
              </AppText>
              <AppText variant="caption" color={judged ? "textMuted" : "danger"}>
                {t("today.habit_penalty", { amount: formatMoney(habit.penalty_cents) })}
              </AppText>
            </View>
          </View>
        </View>

        {habit.status === "pending" ? (
          <View style={styles.underRow}>
            <SkipBox onPress={() => onSkip(habit)} disabled={busy} />
          </View>
        ) : null}

        {skipped ? (
          <View style={styles.underRow}>
            {hasOpenSession ? (
              <Pressable
                accessibilityRole="button"
                onPress={onResumeCourt}
                hitSlop={theme.touch.hitSlop}
                style={styles.courtChip}
              >
                <AppText variant="label" color="onDanger">
                  {t("today.habit_status_in_court")}
                </AppText>
              </Pressable>
            ) : (
              <View style={styles.closedChip}>
                <AppText variant="label" color="textMuted">
                  {t("today.habit_status_case_closed")}
                </AppText>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {judged && verdict ? (
        // The seal: same stamp as the courtroom verdict, card-scale, slammed
        // over the checkbox + skip-box area. Checkbox stays visible beneath.
        <View
          style={styles.stampOverlay}
          accessible
          accessibilityLabel={t("today.habit_judged_locked_a11y")}
        >
          <View style={styles.stampZone}>
            <VerdictStamp verdict={verdict} compact />
          </View>
        </View>
      ) : null}
    </BruteCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  info: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  struck: {
    textDecorationLine: "line-through",
  },
  underRow: {
    marginTop: theme.spacing.md,
    // Indent under the text column, not under the check (RTL start side).
    marginStart: theme.spacing.x4l,
  },
  sealedUnder: {
    pointerEvents: "none",
  },
  stampOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    // flexDirection row follows RTL, so the zone hugs the inline-start side —
    // exactly where the checkbox and the (now gone) skip box live.
    flexDirection: "row",
    alignItems: "center",
    pointerEvents: "none",
  },
  stampZone: {
    width: "55%",
    alignItems: "center",
  },
  courtChip: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.danger,
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.none,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  closedChip: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.bold,
    borderColor: theme.colors.lineSoft,
    borderRadius: theme.radii.none,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
});
