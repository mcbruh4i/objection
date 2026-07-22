/**
 * TODAY — the paper world home.
 * Jalali header · resume-court banner · add-habit input (with fine cadence)
 * · daily promises · weekly/monthly target sections · history tabs.
 *
 * Busy state is scoped PER HABIT (pendingHabitId): toggling one habit never
 * dims or disables the other cards (fix for the shared-busy bug, round 1).
 */
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { Habit, HistoryDay, SessionSummary, TodayResponse } from "../api/types";
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
import { HabitCard } from "../components/today/HabitCard";
import { ResumeCourtBanner } from "../components/today/ResumeCourtBanner";
import { HistoryPanel } from "../components/today/HistoryPanel";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { toPersianDigits } from "../utils/format";
import { theme } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Habit id with a request in flight — ONLY that card's controls lock. */
  const [pendingHabitId, setPendingHabitId] = useState<string | null>(null);
  /** Separate flag for the add form. */
  const [adding, setAdding] = useState(false);

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
      setPendingHabitId(habit.id);
      setNotice(null);
      try {
        const response =
          habit.status === "completed"
            ? await api.uncompleteHabit(habit.id)
            : await api.completeHabit(habit.id);
        setToday(response);
      } catch (error) {
        setNotice(
          apiErrorMessage(error, t, {
            409: t("today.conflict_open_case"),
            404: t("common.error_generic"),
          }),
        );
      } finally {
        setPendingHabitId(null);
      }
    },
    [api, t],
  );

  const addHabit = useCallback(
    async (title: string, cadence: HabitCadence): Promise<void> => {
      setAdding(true);
      setNotice(null);
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
    [api, t, today],
  );

  const skip = useCallback(
    async (habit: Habit): Promise<void> => {
      setPendingHabitId(habit.id);
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
        setPendingHabitId(null);
      }
    },
    [api, t, navigation, openSession, load],
  );

  /** Section grouping by client-side cadence (default: daily). */
  const sections = useMemo(() => {
    const habits = today?.habits ?? [];
    const byCadence: Record<HabitCadence, Habit[]> = { daily: [], weekly: [], monthly: [] };
    for (const habit of habits) {
      byCadence[cadenceOf(cadences, habit.id)].push(habit);
    }
    return byCadence;
  }, [today, cadences]);

  const renderList = (habits: Habit[]): React.JSX.Element => (
    <View style={styles.list}>
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          hasOpenSession={openSession?.habit_id === habit.id}
          verdict={verdicts[habit.id] ?? null}
          busy={pendingHabitId === habit.id}
          onToggleComplete={(h) => void toggleComplete(h)}
          onSkip={(h) => void skip(h)}
          onResumeCourt={() => (openSession ? goToCourt(openSession) : undefined)}
        />
      ))}
    </View>
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
            <SectionHeader title={t("today.habits_title")} />
            <AddHabitInput onSubmit={(title, cadence) => void addHabit(title, cadence)} busy={adding} />
            {today.habits.length === 0 ? (
              <AppText variant="body" color="textMuted">
                {t("today.empty_habits")}
              </AppText>
            ) : (
              renderList(sections.daily)
            )}
          </View>

          {sections.weekly.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title={t("today.weekly_title")} />
              {renderList(sections.weekly)}
            </View>
          ) : null}

          {sections.monthly.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title={t("today.monthly_title")} />
              {renderList(sections.monthly)}
            </View>
          ) : null}

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
