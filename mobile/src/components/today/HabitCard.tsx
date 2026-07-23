/**
 * One habit row. Interaction states (round-3 spec):
 *
 * pending    → live check + cadence-worded SkipBox underneath
 * completed  → checked; tap again to uncheck (/uncomplete round-trip)
 * skipped + open session   → check disabled (stays UNCHECKED — skip never
 *                            checks the box), red "در دادگاه" chip resumes court
 * skipped + resolved case  → SEALED: content non-interactive; a transparent
 *                            ink-only VerdictStamp (GUILTY red / DISMISSED
 *                            dark) covers the ENTIRE card, centered, tilted;
 *                            title/fine/checkbox stay visible through it.
 *                            Unknown verdict → chip only, never a guess.
 *
 * Optimistic choreography (round 3): the parent flips habit.status
 * optimistically on tap, so in ONE commit the checkbox starts its tick AND
 * SkipCollapse starts the height collapse — same duration, same easing,
 * same start/end frames (contract exported by BrutalCheckbox). The skip box
 * stays MOUNTED for pending/completed so server reconciliation mid-animation
 * never causes a layout jump.
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Habit, VerdictKind } from "../../api/types";
import type { HabitCadence } from "../../state/cadenceStore";
import { AppText } from "../common/AppText";
import { BruteCard } from "../common/BruteCard";
import { BruteCheck } from "../common/BruteCheck";
import { VerdictStamp } from "../court/VerdictStamp";
import { SkipBox } from "./SkipBox";
import { SkipCollapse } from "./SkipCollapse";
import { formatMoney, formatTimeOfIso } from "../../utils/format";
import { theme } from "../../theme/tokens";

interface Props {
  habit: Habit;
  cadence: HabitCadence;
  /** True when this habit owns the currently open court session. */
  hasOpenSession: boolean;
  /** How this habit's court case resolved (client-side record), if known. */
  verdict: VerdictKind | null;
  onToggleComplete: (habit: Habit) => void;
  onSkip: (habit: Habit) => void;
  onResumeCourt: () => void;
}

export function HabitCard({
  habit,
  cadence,
  hasOpenSession,
  verdict,
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
            disabled={skipped}
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

        {/* Mounted for pending AND completed: the collapse/expand is a
            synchronized height animation, never a mount/unmount jump. */}
        {!skipped ? (
          <SkipCollapse visible={habit.status === "pending"}>
            <View style={styles.skipUnder}>
              <SkipBox habitId={habit.id} cadence={cadence} onPress={() => onSkip(habit)} />
            </View>
          </SkipCollapse>
        ) : null}

        {skipped ? (
          <View style={styles.chipUnder}>
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
        // The seal: pure ink, no plate — slammed diagonally across the WHOLE
        // card at near card width. Content stays visible through it.
        <View
          style={styles.stampOverlay}
          accessible
          accessibilityLabel={t("today.habit_judged_locked_a11y")}
        >
          <View style={styles.stampZone}>
            <VerdictStamp verdict={verdict} mode="seal" />
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
  // Inside SkipCollapse: paddingTop (not margin) so the measured height
  // includes the gap and the collapse eats it smoothly too.
  skipUnder: {
    paddingTop: theme.spacing.md,
    marginStart: theme.spacing.x4l,
  },
  chipUnder: {
    marginTop: theme.spacing.md,
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
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  stampZone: {
    width: "94%",
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
