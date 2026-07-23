/**
 * TODAY — the paper world home.
 * Jalali header · resume-court banner · cadence FILTER TABS (daily/weekly/
 * monthly — each shows only its own habits, and the add-input creates into
 * the active tab) · habit list · history tabs.
 *
 * Optimistic check/uncheck (round-3 spec): the tap flips the habit's status
 * locally in the SAME commit — the checkbox tick and the skip-box height
 * collapse start together, before the API responds (zero input lag). The
 * server response reconciles afterward; a failure rolls the status back
 * (reverse animation) with a visible error notice.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type {
  Habit,
  HabitStatus,
  HistoryDay,
  SessionSummary,
  TodayResponse,
} from "../api/types";
import { MAX_HABITS_PER_DAY } from "../api/types";
import type { RootStackParamList } from "../navigation/types";
import { useApi } from "../state/ApiContext";
import {
  CadenceMap,
  DEFAULT_PENALTY_CENTS,
  HabitCadence,
  cadenceOf,
  loadCadences,
  saveCadence,
} from "../state/cadenceStore";
import { VerdictMap, loadVerdicts } from "../state/verdictStore";
import { ScreenContainer } from "../components/common/ScreenContainer";
import { SectionHeader } from "../components/common/SectionHeader";
import { InlineNotice } from "../components/common/InlineNotice";
import { LoadingBlock } from "../components/common/LoadingBlock";
import { AppText } from "../components/common/AppText";
import { JalaliHeader } from "../components/today/JalaliHeader";
import { AddHabitInput } from "../components/today/AddHabitInput";
import { CadencePicker } from "../components/today/CadencePicker";
import { HabitCard } from "../components/today/HabitCard";
import { ResumeCourtBanner } from "../components/today/ResumeCourtBanner";
import { HistoryPanel } from "../components/today/HistoryPanel";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { toPersianDigits } from "../utils/format";
import { theme } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SECTION_TITLE_KEY: Record<HabitCadence, string> = {
  daily: "today.habits_title",
  weekly: "today.weekly_title",
  monthly: "today.monthly_title",
};

const EMPTY_KEY: Record<HabitCadence, string> = {
  daily: "today.empty_habits",
  weekly: "today.empty_weekly",
  monthly: "today.empty_monthly",
};

function isOpen(session: SessionSummary | null): session is SessionSummary {
  return session !== null && session.state !== "resolved";
}

export function TodayScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const api = useApi();
  const navigation = useNavigation<Nav>();

  const [today, setToday] = useState<TodayResponse | null>(null);
  const [historyDays, setHistoryDays] = useState<readonly HistoryDay[]>([]);
  const [cadences, setCadences] = useState<CadenceMap>({});
  const [verdicts, setVerdicts] = useState<VerdictMap>({});
  const [activeCadence, setActiveCadence] = useState<HabitCadence>("daily");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  /**
   * Optimistic status flips (habit id → status shown NOW). The flip lands in
   * the same commit as the tap, so the tick + collapse start immediately;
   * the entry is cleared on reconciliation (success) or rollback (failure).
   */
  const [optimistic, setOptimistic] = useState<Record<string, HabitStatus>>({});
  /** Logical double-fire guard — deliberately NOT visual (no dimming). */
  const inFlight = useRef<Set<string>>(new Set());

  const load = useCallback(async (): Promise<void> => {
    setLoadError(null);
    try {
      const [todayResponse, historyResponse, cadenceMap, verdictMap] = await Promise.all([
        api.getToday(),
        api.getHistory(),
        loadCadences(),
        loadVerdicts(),
      ]);
      setToday(todayResponse);
      setHistoryDays(historyResponse.days);
      setCadences(cadenceMap);
      setVerdicts(verdictMap);
    } catch (error) {
      setLoadError(apiErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openSession = today ? (isOpen(today.session) ? today.session : null) : null;

  const habitTitleFor = useCallback(
    (session: SessionSummary): string => {
      const habit = today?.habits.find((h) => h.id === session.habit_id);
      return habit?.title ?? today?.habit.title ?? "";
    },
    [today],
  );

  const goToCourt = useCallback(
    (session: SessionSummary): void => {
      if (session.state === "resolved") return;
      navigation.navigate("Courtroom", {
        sessionId: session.id,
        habitId: session.habit_id,
        habitTitle: habitTitleFor(session),
        initialState: session.state,
        initialProsecutor: session.prosecutor,
      });
    },
    [navigation, habitTitleFor],
  );

  const toggleComplete = useCallback(
    async (habit: Habit): Promise<void> => {
      if (inFlight.current.has(habit.id)) return;
      inFlight.current.add(habit.id);
      const targetStatus: HabitStatus = habit.status === "completed" ? "pending" : "completed";
      setNotice(null);
      // Optimistic flip — tick + skip-box collapse start THIS commit.
      setOptimistic((current) => ({ ...current, [habit.id]: targetStatus }));
      try {
        const response =
          targetStatus === "completed"
            ? await api.completeHabit(habit.id)
            : await api.uncompleteHabit(habit.id);
        // Reconcile: authoritative server state replaces the optimistic flip
        // in one commit (checked prop stays equal → no visual snap).
        setToday(response);
      } catch (error) {
        // Rollback: clearing the flip reverses both animations, with notice.
        setNotice(
          apiErrorMessage(error, t, {
            409: t("today.conflict_open_case"),
            404: t("common.error_generic"),
          }),
        );
      } finally {
        setOptimistic((current) => {
          const next = { ...current };
          delete next[habit.id];
          return next;
        });
        inFlight.current.delete(habit.id);
      }
    },
    [api, t],
  );

  const addHabit = useCallback(
    async (title: string): Promise<void> => {
      setAdding(true);
      setNotice(null);
      const cadence = activeCadence;
      const previousIds = new Set(today?.habits.map((h) => h.id) ?? []);
      try {
        const response = await api.createHabit({
          title,
          penalty_cents: DEFAULT_PENALTY_CENTS[cadence],
        });
        setToday(response);
        // The backend has no cadence field — persist the category on-device
        // for the habit the server just created (see cadenceStore.ts).
        const created = response.habits.find((h) => !previousIds.has(h.id));
        if (created) {
          setCadences((current) => ({ ...current, [created.id]: cadence }));
          void saveCadence(created.id, cadence);
        }
      } catch (error) {
        setNotice(
          apiErrorMessage(error, t, {
            409: t("today.docket_full", { max: toPersianDigits(MAX_HABITS_PER_DAY) }),
          }),
        );
      } finally {
        setAdding(false);
      }
    },
    [api, t, today, activeCadence],
  );

  const skip = useCallback(
    async (habit: Habit): Promise<void> => {
      if (inFlight.current.has(habit.id)) return;
      inFlight.current.add(habit.id);
      setNotice(null);
      try {
        const response = await api.skipHabit(habit.id);
        if (response.state === "resolved") {
          // Rare: the latest session for this habit is already closed.
          await load();
          return;
        }
        const known = openSession && openSession.id === response.session_id ? openSession : null;
        navigation.navigate("Courtroom", {
          sessionId: response.session_id,
          habitId: habit.id,
          habitTitle: habit.title,
          initialState: response.state,
          initialProsecutor: known?.prosecutor ?? null,
        });
      } catch (error) {
        setNotice(
          apiErrorMessage(error, t, {
            409: t("today.conflict_completed"),
          }),
        );
      } finally {
        inFlight.current.delete(habit.id);
      }
    },
    [api, t, navigation, openSession, load],
  );

  /** Server habits with optimistic status flips applied. */
  const effectiveHabits = useMemo(() => {
    const habits = today?.habits ?? [];
    return habits.map((habit) => {
      const flipped = optimistic[habit.id];
      return flipped && flipped !== habit.status ? { ...habit, status: flipped } : habit;
    });
  }, [today, optimistic]);

  /** The active tab shows ONLY its own cadence (round-3 spec). */
  const visibleHabits = useMemo(
    () => effectiveHabits.filter((habit) => cadenceOf(cadences, habit.id) === activeCadence),
    [effectiveHabits, cadences, activeCadence],
  );

  return (
    <ScreenContainer world="paper">
      <JalaliHeader />

      {openSession ? (
        <ResumeCourtBanner
          habitTitle={habitTitleFor(openSession)}
          onResume={() => goToCourt(openSession)}
        />
      ) : null}

      {notice ? <InlineNotice message={notice} /> : null}

      {loading ? (
        <LoadingBlock label={t("common.loading")} />
      ) : loadError ? (
        <InlineNotice message={loadError} onRetry={() => void load()} />
      ) : today ? (
        <>
          <View style={styles.section}>
            <SectionHeader title={t(SECTION_TITLE_KEY[activeCadence])} />
            <CadencePicker value={activeCadence} onChange={setActiveCadence} />
            <AddHabitInput
              cadence={activeCadence}
              onSubmit={(title) => void addHabit(title)}
              busy={adding}
            />
            {visibleHabits.length === 0 ? (
              <AppText variant="body" color="textMuted">
                {t(EMPTY_KEY[activeCadence])}
              </AppText>
            ) : (
              <View style={styles.list}>
                {visibleHabits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    cadence={cadenceOf(cadences, habit.id)}
                    hasOpenSession={openSession?.habit_id === habit.id}
                    verdict={verdicts[habit.id] ?? null}
                    onToggleComplete={(h) => void toggleComplete(h)}
                    onSkip={(h) => void skip(h)}
                    onResumeCourt={() => (openSession ? goToCourt(openSession) : undefined)}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader title={t("today.history_title")} />
            <HistoryPanel days={historyDays} />
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.lg,
    marginTop: theme.spacing.xs,
  },
});
