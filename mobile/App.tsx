import { StatusBar } from "expo-status-bar";
import { ResizeMode, Video } from "expo-av";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated as RNAnimated,
  Easing as RNEasing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import Reanimated, {
  Easing as ReanimatedEasing,
  useAnimatedProps,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { api, isRequestCancelled } from "./src/api";
import { courtImages, prosecutorVideos, type CourtSound, useCourtAudio } from "./src/media/courtMedia";
import { useThemeTokens, type ThemeTokens } from "./src/theme/tokens";
import type {
  Fine,
  Habit,
  JudgeVerdict,
  LedgerEntry,
  LedgerResponse,
  PleaResponse,
  ProsecutorResponse,
  RebuttalResponse,
  TodayResponse,
} from "./src/types";

const AnimatedSvgPath = Reanimated.createAnimatedComponent(Path);
const RNAnimatedPath = RNAnimated.createAnimatedComponent(Path);

type Screen = "today" | "courtroom" | "ledger" | "settings";
type CourtMode = "plea" | "deliberating" | "objection" | "rebuttal" | "verdict";
type PendingAction = "add" | "complete" | "skip" | "plea" | "rebuttal" | "reset" | null;
type ClipName = keyof typeof prosecutorVideos;
type PlayerIndex = 0 | 1;

function formatMockCents(cents: number): string {
  return `$${(Math.abs(cents) / 100).toFixed(2)} mock`;
}

function formatDeadline(deadlineAt: string): string {
  const deadline = new Date(deadlineAt);
  if (Number.isNaN(deadline.getTime())) {
    return "Deadline unavailable";
  }
  return deadline.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function progressLine(completed: boolean): string {
  if (completed) {
    return "No case today. Dismissed.";
  }
  return "The prosecution is watching.";
}

function mergeFine(ledger: LedgerResponse | null, fine: Fine): LedgerResponse | null {
  if (!ledger || ledger.entries.some((entry) => entry.id === fine.id)) {
    return ledger;
  }
  return {
    ...ledger,
    balance_cents: ledger.balance_cents + fine.amount_cents,
    entries: [fine, ...ledger.entries],
  };
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ObjectionApp />
    </SafeAreaProvider>
  );
}

function ObjectionApp() {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets), [insets, theme]);
  const sound = useCourtAudio();
  const [screen, setScreen] = useState<Screen>("today");
  const [courtMode, setCourtMode] = useState<CourtMode>("plea");
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prosecutor, setProsecutor] = useState<ProsecutorResponse | null>(null);
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(null);
  const [fine, setFine] = useState<Fine | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [optimisticIds, setOptimisticIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ledgerSyncError, setLedgerSyncError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [courtroomActive, setCourtroomActive] = useState(false);
  const sceneOpacity = useRef(new RNAnimated.Value(theme.raw.opaque)).current;
  const irisOpacity = useRef(new RNAnimated.Value(theme.raw.transparent)).current;
  const mountedRef = useRef(true);
  const sessionIdRef = useRef<string | null>(null);
  const requestControllers = useRef(new Set<AbortController>());

  const startRequest = useCallback(() => {
    const controller = new AbortController();
    requestControllers.current.add(controller);
    return controller;
  }, []);

  const finishRequest = useCallback((controller: AbortController) => {
    requestControllers.current.delete(controller);
  }, []);

  const setActiveSessionId = useCallback((nextSessionId: string | null) => {
    sessionIdRef.current = nextSessionId;
    setSessionId(nextSessionId);
  }, []);

  const abortRequests = useCallback(() => {
    requestControllers.current.forEach((controller) => controller.abort());
    requestControllers.current.clear();
  }, []);

  const canUpdate = useCallback((controller: AbortController) => {
    return mountedRef.current && !controller.signal.aborted;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRequests();
    };
  }, [abortRequests]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReducedMotion(enabled);
      }
    }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const playSound = useCallback((cue: CourtSound) => {
    if (soundEnabled) {
      sound.play(cue);
    }
  }, [sound, soundEnabled]);

  const lightImpact = useCallback(() => {
    if (hapticsEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  }, [hapticsEnabled]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (signal?.aborted) {
      return;
    }
    setError(null);
    const [nextToday, nextLedger] = await Promise.all([
      api.getToday({ signal }),
      api.getLedger({ signal }),
    ]);
    if (signal?.aborted || !mountedRef.current) {
      return;
    }
    setToday(nextToday);
    setLedger(nextLedger);
    setLedgerSyncError(null);
    setActiveSessionId(nextToday.session?.id ?? null);
    setProsecutor(nextToday.session?.prosecutor ?? null);
    if (nextToday.session?.state === "awaiting_rebuttal") {
      setCourtMode("rebuttal");
    } else if (nextToday.session?.state === "awaiting_plea") {
      setCourtMode("plea");
    }
  }, [setActiveSessionId]);

  const loadCourtRecord = useCallback(async () => {
    const controller = startRequest();
    try {
      await refresh(controller.signal);
    } catch (requestError) {
      if (canUpdate(controller) && !isRequestCancelled(requestError)) {
        setError(requestError instanceof Error ? requestError.message : "Could not open the court record.");
      }
    } finally {
      finishRequest(controller);
      if (mountedRef.current) {
        setLoaded(true);
      }
    }
  }, [canUpdate, finishRequest, refresh, startRequest]);

  useEffect(() => {
    void loadCourtRecord();
  }, [loadCourtRecord]);

  const switchScreen = useCallback((nextScreen: Screen, cancelCourtRequests = true) => {
    if (nextScreen !== "courtroom" && courtroomActive) {
      setCourtroomActive(false);
      if (cancelCourtRequests) {
        abortRequests();
      }
    }
    RNAnimated.timing(sceneOpacity, {
      duration: theme.motion.sceneTransitionMs,
      easing: RNEasing.out(RNEasing.cubic),
      toValue: theme.raw.transparent,
      useNativeDriver: true,
    }).start(() => {
      setScreen(nextScreen);
      if (nextScreen === "courtroom") {
        setCourtroomActive(true);
      }
      RNAnimated.timing(sceneOpacity, {
        duration: theme.motion.sceneTransitionMs,
        easing: RNEasing.out(RNEasing.cubic),
        toValue: theme.raw.opaque,
        useNativeDriver: true,
      }).start();
    });
  }, [abortRequests, courtroomActive, sceneOpacity, theme]);

  useEffect(() => {
    if (courtMode !== "verdict" || !courtroomActive) {
      return undefined;
    }
    const timeout = setTimeout(() => switchScreen("ledger", false), theme.motion.courtAutoAdvanceMs);
    return () => clearTimeout(timeout);
  }, [courtMode, courtroomActive, switchScreen, theme.motion.courtAutoAdvanceMs]);

  const completeHabit = async (habitId: string) => {
    if (!today || pendingAction) {
      return;
    }
    setOptimisticIds((current) => [...current, habitId]);
    setPendingAction("complete");
    setError(null);
    lightImpact();
    const controller = startRequest();
    try {
      const nextToday = await api.completeHabit(habitId, { signal: controller.signal });
      if (!canUpdate(controller)) {
        return;
      }
      setToday(nextToday);
      setActiveSessionId(nextToday.session?.id ?? null);
      setProsecutor(nextToday.session?.prosecutor ?? null);
      setOptimisticIds((current) => current.filter((id) => id !== habitId));
    } catch (requestError) {
      if (canUpdate(controller)) {
        setOptimisticIds((current) => current.filter((id) => id !== habitId));
        if (!isRequestCancelled(requestError)) {
          setError(requestError instanceof Error ? requestError.message : "Could not dismiss the case.");
        }
      }
    } finally {
      finishRequest(controller);
      if (mountedRef.current) {
        setPendingAction(null);
      }
    }
  };

  const openCourt = async (habitId: string) => {
    if (!today || pendingAction) {
      return;
    }
    setPendingAction("skip");
    setError(null);
    playSound("gavel");
    RNAnimated.timing(irisOpacity, {
      duration: theme.motion.sceneTransitionMs,
      easing: RNEasing.out(RNEasing.cubic),
      toValue: theme.raw.opaque,
      useNativeDriver: true,
    }).start();
    const controller = startRequest();
    try {
      const result = await api.skipHabit(habitId, { signal: controller.signal });
      if (!canUpdate(controller)) {
        return;
      }
      const markSkipped = (habit: Habit): Habit => habit.id === habitId ? { ...habit, status: "skipped" } : habit;
      const nextSession = result.state === "resolved"
        ? null
        : { id: result.session_id, state: result.state, prosecutor: null };
      setToday((current) => current ? {
        ...current,
        habit: markSkipped(current.habit),
        habits: current.habits?.map(markSkipped),
        session: nextSession,
      } : current);
      setActiveSessionId(nextSession?.id ?? null);
      setProsecutor(null);
      setVerdict(null);
      setFine(null);
      if (result.state === "resolved") {
        switchScreen("ledger");
        return;
      }
      setCourtMode(result.state === "awaiting_rebuttal" ? "rebuttal" : "plea");
      setCourtroomActive(true);
      setScreen("courtroom");
    } catch (requestError) {
      if (canUpdate(controller) && !isRequestCancelled(requestError)) {
        setError(requestError instanceof Error ? requestError.message : "The court could not open the case.");
      }
    } finally {
      RNAnimated.timing(irisOpacity, {
        duration: theme.motion.sceneTransitionMs,
        easing: RNEasing.out(RNEasing.cubic),
        toValue: theme.raw.transparent,
        useNativeDriver: true,
      }).start();
      finishRequest(controller);
      if (mountedRef.current) {
        setPendingAction(null);
      }
    }
  };

  const submitPlea = async (text: string): Promise<PleaResponse | null> => {
    if (!sessionId || pendingAction) {
      return null;
    }
    setPendingAction("plea");
    setCourtMode("deliberating");
    setError(null);
    const pleaSessionId = sessionId;
    const controller = startRequest();
    try {
      const result = await api.submitPlea(sessionId, text.trim(), { signal: controller.signal });
      if (!canUpdate(controller)) {
        return null;
      }
      setProsecutor(result.prosecutor);
      setToday((current) => current ? {
        ...current,
        session: { id: result.session_id, state: result.state, prosecutor: result.prosecutor },
      } : current);
      setCourtMode("objection");
      return result;
    } catch (requestError) {
      if (isRequestCancelled(requestError)) {
        if (mountedRef.current && sessionIdRef.current === pleaSessionId) {
          setCourtMode("plea");
        }
        return null;
      }
      if (canUpdate(controller)) {
        setCourtMode("plea");
        setError(requestError instanceof Error ? requestError.message : "The court could not hear that plea.");
      }
      return null;
    } finally {
      finishRequest(controller);
      if (mountedRef.current) {
        setPendingAction(null);
      }
    }
  };

  const submitRebuttal = async (text: string): Promise<RebuttalResponse | null> => {
    if (!sessionId || pendingAction) {
      return null;
    }
    setPendingAction("rebuttal");
    setError(null);
    const controller = startRequest();
    try {
      const result = await api.submitRebuttal(sessionId, text.trim(), { signal: controller.signal });
      if (!canUpdate(controller)) {
        return null;
      }
      setVerdict(result.verdict);
      setFine(result.fine);
      setLedger((current) => mergeFine(current, result.fine));
      setActiveSessionId(null);
      setToday((current) => current ? { ...current, session: null } : current);
      setCourtMode("verdict");
      playSound("gavel");
      const [nextToday, nextLedger] = await Promise.allSettled([
        api.getToday({ signal: controller.signal }),
        api.getLedger({ signal: controller.signal }),
      ]);
      if (!canUpdate(controller)) {
        return result;
      }
      if (nextToday.status === "fulfilled") {
        setToday(nextToday.value);
        setActiveSessionId(nextToday.value.session?.id ?? null);
        setProsecutor(nextToday.value.session?.prosecutor ?? prosecutor);
      }
      if (nextLedger.status === "fulfilled") {
        setLedger(nextLedger.value);
        setLedgerSyncError(null);
      } else if (!isRequestCancelled(nextLedger.reason)) {
        setLedger((current) => mergeFine(current, result.fine));
        setLedgerSyncError("The ruling is recorded, but the Ledger could not refresh yet.");
      }
      return result;
    } catch (requestError) {
      if (canUpdate(controller) && !isRequestCancelled(requestError)) {
        setError(requestError instanceof Error ? requestError.message : "The judge could not issue a ruling.");
      }
      return null;
    } finally {
      finishRequest(controller);
      if (mountedRef.current) {
        setPendingAction(null);
      }
    }
  };

  const addHabit = async (title: string): Promise<boolean> => {
    if (pendingAction || !title.trim()) {
      return false;
    }
    setPendingAction("add");
    setError(null);
    const controller = startRequest();
    try {
      const nextToday = await api.createHabit({ title: title.trim() }, { signal: controller.signal });
      if (!canUpdate(controller)) {
        return false;
      }
      setToday(nextToday);
      setActiveSessionId(nextToday.session?.id ?? null);
      setProsecutor(nextToday.session?.prosecutor ?? null);
      return true;
    } catch (requestError) {
      if (canUpdate(controller) && !isRequestCancelled(requestError)) {
        setError(requestError instanceof Error ? requestError.message : "Could not file the new promise.");
      }
      return false;
    } finally {
      finishRequest(controller);
      if (mountedRef.current) {
        setPendingAction(null);
      }
    }
  };

  const resetDemo = async () => {
    if (!__DEV__ || pendingAction) {
      return;
    }
    setCourtroomActive(false);
    abortRequests();
    setPendingAction("reset");
    setError(null);
    const controller = startRequest();
    try {
      const reset = await api.resetDemo({ signal: controller.signal });
      if (!canUpdate(controller)) {
        return;
      }
      setToday(reset.today);
      setLedger(reset.ledger);
      setLedgerSyncError(null);
      setActiveSessionId(null);
      setProsecutor(null);
      setVerdict(null);
      setFine(null);
      setOptimisticIds([]);
      setCourtMode("plea");
      switchScreen("today");
    } catch (requestError) {
      if (canUpdate(controller) && !isRequestCancelled(requestError)) {
        setError(requestError instanceof Error ? requestError.message : "Could not reset the demo.");
      }
    } finally {
      finishRequest(controller);
      if (mountedRef.current) {
        setPendingAction(null);
      }
    }
  };

  const renderedScreen = () => {
    if (!loaded) {
      return <OpeningState styles={styles} />;
    }
    if (!today || !ledger) {
      return <ConnectionState styles={styles} error={error} onRetry={() => void loadCourtRecord()} />;
    }
    if (screen === "courtroom") {
      return (
        <Courtroom
          active={courtroomActive}
          fine={fine}
          mode={courtMode}
          pendingAction={pendingAction}
           prosecutor={prosecutor}
           reducedMotion={reducedMotion}
           styles={styles}
          theme={theme}
          verdict={verdict}
          onModeChange={setCourtMode}
           playSound={playSound}
          onSubmitPlea={submitPlea}
          onSubmitRebuttal={submitRebuttal}
        />
      );
    }
    if (screen === "ledger") {
      return <LedgerScreen entryQuote={prosecutor?.objection ?? null} ledger={ledger} styles={styles} syncError={ledgerSyncError} theme={theme} />;
    }
    if (screen === "settings") {
      return (
        <SettingsScreen
          hapticsEnabled={hapticsEnabled}
          onReset={() => void resetDemo()}
          onToggleHaptics={() => setHapticsEnabled((current) => !current)}
          onToggleMotion={() => setReducedMotion((current) => !current)}
          onToggleSound={() => setSoundEnabled((current) => !current)}
          reducedMotion={reducedMotion}
          soundEnabled={soundEnabled}
          styles={styles}
          theme={theme}
        />
      );
    }
    return (
      <TodayScreen
        error={error}
        onAddHabit={addHabit}
        onComplete={(habitId) => void completeHabit(habitId)}
        onOpenCourt={(habitId) => void openCourt(habitId)}
        onResumeCourt={() => switchScreen("courtroom")}
        optimisticIds={optimisticIds}
        pendingAction={pendingAction}
        reducedMotion={reducedMotion}
        sessionOpen={Boolean(today.session)}
        styles={styles}
        theme={theme}
        today={today}
      />
    );
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar style="dark" />
      <Pressable
        accessibilityHint={__DEV__ ? "Long press to reset the development demo" : undefined}
        accessibilityRole="header"
        delayLongPress={theme.raw.titleLongPressMs}
        onLongPress={__DEV__ ? () => void resetDemo() : undefined}
        style={styles.brand}
      >
        <Text style={styles.brandEyebrow}>THE HABIT COURT</Text>
        <Text style={styles.brandName}>OBJECTION!</Text>
      </Pressable>
      <RNAnimated.View style={[styles.scene, { opacity: sceneOpacity }]}>{renderedScreen()}</RNAnimated.View>
      <View style={styles.bottomBar}>
        <NavItem active={screen === "today"} icon="today" label="Today" onPress={() => switchScreen("today")} styles={styles} theme={theme} />
        <NavItem active={screen === "ledger"} icon="ledger" label="Ledger" onPress={() => switchScreen("ledger")} styles={styles} theme={theme} />
        <NavItem active={screen === "settings"} icon="settings" label="Settings" onPress={() => switchScreen("settings")} styles={styles} theme={theme} />
      </View>
      <RNAnimated.View pointerEvents="none" style={[styles.iris, { opacity: irisOpacity }]} />
    </View>
  );
}

function OpeningState({ styles }: { styles: StyleSet }) {
  return (
    <View style={styles.centeredState}>
      <Text style={styles.stateTitle}>Opening the docket.</Text>
      <Text style={styles.stateCopy}>Connecting to the configured court server.</Text>
    </View>
  );
}

function ConnectionState({ styles, error, onRetry }: { styles: StyleSet; error: string | null; onRetry: () => void }) {
  return (
    <View style={styles.centeredState}>
      <Text style={styles.stateTitle}>The court is unavailable.</Text>
      <Text style={styles.stateCopy}>{error ?? "The court cannot reach the server. Check your connection and retry."}</Text>
      <ActionButton label="Retry connection" onPress={onRetry} styles={styles} variant="primary" />
    </View>
  );
}

function NavItem({ active, icon, label, onPress, styles, theme }: {
  active: boolean;
  icon: "today" | "ledger" | "settings";
  label: string;
  onPress: () => void;
  styles: StyleSet;
  theme: ThemeTokens;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.navItem, active && styles.navItemActive]}
    >
      <NavGlyph active={active} kind={icon} styles={styles} theme={theme} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function NavGlyph({ active, kind, styles, theme }: { active: boolean; kind: "today" | "ledger" | "settings"; styles: StyleSet; theme: ThemeTokens }) {
  const color = active ? theme.colors.primary : theme.colors.trim;
  return (
    <Svg style={styles.navIcon} viewBox="0 0 24 24">
      {kind === "today" ? <Circle cx="12" cy="12" fill="none" r="8" stroke={color} strokeWidth={theme.layout.borderStrong} /> : null}
      {kind === "today" ? <Path d="M 8 12 L 11 15 L 17 9" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={theme.layout.borderStrong} /> : null}
      {kind === "ledger" ? <Path d="M 5 4 L 19 4 L 19 20 L 5 20 Z M 8 8 L 16 8 M 8 12 L 16 12 M 8 16 L 13 16" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={theme.layout.borderStrong} /> : null}
      {kind === "settings" ? <Circle cx="12" cy="12" fill="none" r="4" stroke={color} strokeWidth={theme.layout.borderStrong} /> : null}
      {kind === "settings" ? <Path d="M 12 3 L 12 6 M 12 18 L 12 21 M 3 12 L 6 12 M 18 12 L 21 12 M 5.6 5.6 L 7.7 7.7 M 16.3 16.3 L 18.4 18.4 M 18.4 5.6 L 16.3 7.7 M 7.7 16.3 L 5.6 18.4" fill="none" stroke={color} strokeLinecap="round" strokeWidth={theme.layout.borderStrong} /> : null}
    </Svg>
  );
}

function TodayScreen({
  error,
  onAddHabit,
  onComplete,
  onOpenCourt,
  onResumeCourt,
  optimisticIds,
  pendingAction,
  reducedMotion,
  sessionOpen,
  styles,
  theme,
  today,
}: {
  error: string | null;
  onAddHabit: (title: string) => Promise<boolean>;
  onComplete: (habitId: string) => void;
  onOpenCourt: (habitId: string) => void;
  onResumeCourt: () => void;
  optimisticIds: string[];
  pendingAction: PendingAction;
  reducedMotion: boolean;
  sessionOpen: boolean;
  styles: StyleSet;
  theme: ThemeTokens;
  today: TodayResponse;
}) {
  const [draftTitle, setDraftTitle] = useState("");
  const [addingOpen, setAddingOpen] = useState(false);
  const habits = today.habits ?? [today.habit];
  const isDone = (habit: Habit) => habit.status === "completed" || optimisticIds.includes(habit.id);
  const doneCount = habits.filter(isDone).length;
  const progress = habits.length > theme.raw.zero ? doneCount / habits.length : theme.raw.zero;
  const allDone = habits.length > theme.raw.zero && doneCount === habits.length;
  const stakeCents = habits.filter((habit) => !isDone(habit)).reduce((total: number, habit) => total + habit.penalty_cents, theme.raw.zero);
  const submitDraft = async () => {
    if (!draftTitle.trim()) {
      return;
    }
    const saved = await onAddHabit(draftTitle);
    if (saved) {
      setDraftTitle("");
      setAddingOpen(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.contentWrap}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayDate}>{todayLabel()}</Text>
          <Text style={styles.todayStatus}>{progressLine(allDone)}</Text>
        </View>
        <ProgressGauge progress={progress} reducedMotion={reducedMotion} stakeCents={stakeCents} styles={styles} theme={theme} />
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionLabel}>TODAY&apos;S CONTRACT</Text>
          <Text style={styles.sectionTitle}>{habits.length > theme.raw.flexOne ? "Every promise counts." : "One promise at a time."}</Text>
        </View>
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            completed={isDone(habit)}
            deadline={formatDeadline(habit.deadline_at)}
            disabled={Boolean(pendingAction) || sessionOpen || habit.status === "skipped"}
            onComplete={() => onComplete(habit.id)}
            onSkip={!isDone(habit) && !sessionOpen && habit.status !== "skipped" ? () => onOpenCourt(habit.id) : null}
            penalty={formatMockCents(habit.penalty_cents)}
            skipped={habit.status === "skipped"}
            styles={styles}
            theme={theme}
            title={habit.title}
          />
        ))}
        {habits.length < theme.raw.maxHabits ? (
          addingOpen ? (
            <View style={styles.addHabitRow}>
              <TextInput
                autoFocus
                maxLength={theme.raw.maxHabitTitleLength}
                onChangeText={setDraftTitle}
                onSubmitEditing={submitDraft}
                placeholder="Name the promise"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.addHabitInput}
                value={draftTitle}
              />
              <ActionButton disabled={!draftTitle.trim() || Boolean(pendingAction)} label={pendingAction === "add" ? "Filing…" : "File it"} onPress={submitDraft} styles={styles} variant="primary" />
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setAddingOpen(true)} style={styles.quietAction}>
              <Text style={styles.quietActionText}>+ Add a promise</Text>
            </Pressable>
          )
        ) : null}
        {sessionOpen ? (
          <StatusPanel label="Court is in session." onPress={onResumeCourt} styles={styles} text="Resume courtroom" />
        ) : null}
        {allDone ? <Text style={styles.completeReaction}>The prosecution has nothing further.</Text> : null}
        {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Fictional stakes only</Text>
          <Text style={styles.noticeCopy}>Nothing is charged or collected. This is a rehearsal for keeping promises to yourself.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ProgressGauge({ progress, reducedMotion, stakeCents, styles, theme }: {
  progress: number;
  reducedMotion: boolean;
  stakeCents: number;
  styles: StyleSet;
  theme: ThemeTokens;
}) {
  const target = Math.min(Math.max(progress, theme.raw.transparent), theme.raw.opaque);
  const diameter = theme.unit * theme.media.gaugeUnits;
  const stroke = diameter * theme.media.gaugeStrokeRatio;
  const radius = diameter / theme.layout.borderStrong - stroke / theme.layout.borderStrong;
  const circumference = Math.PI * radius;
  const progressValue = useSharedValue<number>(target);
  const [shownProgress, setShownProgress] = useState<number>(target);
  const pulse = useRef(new RNAnimated.Value(theme.raw.opaque)).current;
  const priorCompletion = useRef<number>(target);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (theme.raw.opaque - progressValue.value),
  }));

  useEffect(() => {
    const duration = reducedMotion ? theme.raw.transparent : theme.motion.gaugeDurationMs;
    const overshoot = Math.min(target + theme.space.xxs / theme.space.xxl, theme.raw.opaque);
    progressValue.value = withSequence(
      withTiming(overshoot, { duration: duration * theme.raw.subdued, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) }),
      withTiming(target, { duration: duration * (theme.raw.opaque - theme.raw.subdued), easing: ReanimatedEasing.out(ReanimatedEasing.cubic) }),
    );
    const startValue = priorCompletion.current;
    const startedAt = Date.now();
    let frame = 0;
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const normalized = duration === theme.raw.transparent ? theme.raw.opaque : Math.min(elapsed / duration, theme.raw.opaque);
      const eased = theme.raw.opaque - Math.pow(theme.raw.opaque - normalized, theme.layout.borderStrong + theme.layout.borderThin);
      setShownProgress(startValue + (target - startValue) * eased);
      if (normalized < theme.raw.opaque) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    if (target === theme.raw.opaque && priorCompletion.current !== theme.raw.opaque) {
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { duration: duration * theme.raw.subdued, easing: RNEasing.out(RNEasing.cubic), toValue: theme.media.splashEndScale + theme.space.xxs / theme.space.xxl, useNativeDriver: true }),
        RNAnimated.timing(pulse, { duration: duration * (theme.raw.opaque - theme.raw.subdued), easing: RNEasing.out(RNEasing.cubic), toValue: theme.raw.opaque, useNativeDriver: true }),
      ]).start();
    }
    priorCompletion.current = target;
    return () => cancelAnimationFrame(frame);
  }, [circumference, progressValue, pulse, reducedMotion, target, theme]);

  return (
    <RNAnimated.View style={[styles.gaugeWrap, { transform: [{ scale: pulse }] }]}>
      <Svg height={diameter / theme.layout.borderStrong} width={diameter} viewBox={`0 0 ${diameter} ${diameter / theme.layout.borderStrong}`}>
        <Defs>
          <LinearGradient id="progress-gauge" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor={theme.colors.gaugeFill} />
            <Stop offset="1" stopColor={theme.colors.gaugeFillEnd} />
          </LinearGradient>
        </Defs>
        <Path
          d={`M ${stroke / theme.layout.borderStrong} ${diameter / theme.layout.borderStrong} A ${radius} ${radius} 0 0 1 ${diameter - stroke / theme.layout.borderStrong} ${diameter / theme.layout.borderStrong}`}
          fill="none"
          stroke={theme.colors.gaugeTrack}
          strokeLinecap="round"
          strokeWidth={stroke}
        />
        <AnimatedSvgPath
          animatedProps={animatedProps}
          d={`M ${stroke / theme.layout.borderStrong} ${diameter / theme.layout.borderStrong} A ${radius} ${radius} 0 0 1 ${diameter - stroke / theme.layout.borderStrong} ${diameter / theme.layout.borderStrong}`}
          fill="none"
          stroke="url(#progress-gauge)"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={stroke}
        />
      </Svg>
      <View style={styles.gaugeCenter}>
        <Text style={styles.gaugePercent}>{Math.round(shownProgress * theme.raw.percentBase)}%</Text>
        <Text style={styles.gaugeCaption}>{formatMockCents(stakeCents)} at stake</Text>
      </View>
    </RNAnimated.View>
  );
}

function FlameGlyph({ styles, theme }: { styles: StyleSet; theme: ThemeTokens }) {
  return (
    <Svg accessibilityLabel="streak tally" height={theme.space.md} viewBox="0 0 20 20" width={theme.space.md}>
      <Path d="M10 1 C6 6 5 8 5 11 C5 15 7 18 10 18 C14 18 16 15 16 11 C16 8 14 5 11 3 C12 7 10 8 10 10 C8 8 9 5 10 1 Z" fill="none" stroke={theme.colors.trim} strokeWidth={theme.layout.borderStrong} />
    </Svg>
  );
}

function HabitCard({ completed, deadline, disabled, onComplete, onSkip, penalty, skipped, styles, theme, title }: {
  completed: boolean;
  deadline: string;
  disabled: boolean;
  onComplete: () => void;
  onSkip: (() => void) | null;
  penalty: string;
  skipped: boolean;
  styles: StyleSet;
  theme: ThemeTokens;
  title: string;
}) {
  const check = useRef(new RNAnimated.Value(completed ? theme.raw.opaque : theme.raw.transparent)).current;
  const scale = useRef(new RNAnimated.Value(theme.raw.opaque)).current;
  const checkLength = theme.space.xxl;

  useEffect(() => {
    if (!completed) {
      return;
    }
    RNAnimated.parallel([
      RNAnimated.timing(check, { duration: theme.motion.sceneTransitionMs, easing: RNEasing.out(RNEasing.cubic), toValue: theme.raw.opaque, useNativeDriver: false }),
      RNAnimated.sequence([
        RNAnimated.timing(scale, { duration: theme.motion.sceneTransitionMs, easing: RNEasing.out(RNEasing.cubic), toValue: theme.raw.pressed, useNativeDriver: true }),
        RNAnimated.timing(scale, { duration: theme.motion.sceneTransitionMs, easing: RNEasing.out(RNEasing.cubic), toValue: theme.raw.opaque, useNativeDriver: true }),
      ]),
    ]).start();
  }, [check, completed, scale, theme]);

  const dashOffset = check.interpolate({ inputRange: [theme.raw.transparent, theme.raw.opaque], outputRange: [checkLength, theme.raw.transparent] });
  return (
    <View style={styles.habitActionGroup}>
      <Pressable
        accessibilityLabel={completed ? "Habit completed" : "Mark habit complete"}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        disabled={disabled || completed}
        onPress={onComplete}
        style={styles.habitPressable}
      >
        <RNAnimated.View style={[styles.habitCard, completed && styles.habitCardComplete, { transform: [{ scale }] }]}>
          <View style={styles.habitCopy}>
            <Text style={styles.habitTitle}>{title}</Text>
            <View style={styles.habitMeta}>
              <FlameGlyph styles={styles} theme={theme} />
              <Text style={styles.habitMetaText}>1-day record</Text>
            </View>
            <Text style={styles.habitDeadline}>{deadline}</Text>
            <Text style={styles.habitStake}>{penalty} at stake</Text>
            {skipped ? <Text style={styles.habitSkippedNote}>Ruling recorded. See the Ledger.</Text> : null}
          </View>
          <View style={[styles.checkTarget, completed && styles.checkTargetComplete]}>
            <Svg height={theme.space.xxl} viewBox="0 0 48 48" width={theme.space.xxl}>
              <RNAnimatedPath
                d="M 11 25 L 20 34 L 37 14"
                fill="none"
                stroke={theme.colors.text}
                strokeDasharray={checkLength}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={theme.layout.borderStrong}
              />
            </Svg>
          </View>
        </RNAnimated.View>
      </Pressable>
      {onSkip ? (
        <Pressable accessibilityRole="button" onPress={onSkip} style={styles.habitSkip}>
          <Text style={styles.quietActionText}>I can&apos;t do this one</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatusPanel({ label, onPress, styles, text }: { label: string; onPress: () => void; styles: StyleSet; text: string }) {
  return (
    <View style={styles.statusPanel}>
      <Text style={styles.statusPanelTitle}>{label}</Text>
      <ActionButton label={text} onPress={onPress} styles={styles} variant="secondary" />
    </View>
  );
}

function Courtroom({
  active,
  fine,
  mode,
  pendingAction,
  prosecutor,
  reducedMotion,
  styles,
  theme,
  verdict,
  onModeChange,
  playSound,
  onSubmitPlea,
  onSubmitRebuttal,
}: {
  active: boolean;
  fine: Fine | null;
  mode: CourtMode;
  pendingAction: PendingAction;
  prosecutor: ProsecutorResponse | null;
  reducedMotion: boolean;
  styles: StyleSet;
  theme: ThemeTokens;
  verdict: JudgeVerdict | null;
  onModeChange: (mode: CourtMode) => void;
  playSound: (sound: CourtSound) => void;
  onSubmitPlea: (text: string) => Promise<PleaResponse | null>;
  onSubmitRebuttal: (text: string) => Promise<RebuttalResponse | null>;
}) {
  const playerRefs = [useRef<Video>(null), useRef<Video>(null)];
  const [sources, setSources] = useState<[ClipName, ClipName]>(["talk", "bench"]);
  const [activePlayer, setActivePlayer] = useState<PlayerIndex>(0);
  const [queued, setQueued] = useState<{ index: PlayerIndex; clip: ClipName; afterActivate?: () => void } | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [splashVisible, setSplashVisible] = useState(false);
  const [plea, setPlea] = useState("");
  const [rebuttal, setRebuttal] = useState("");
  const [dialogueComplete, setDialogueComplete] = useState(false);
  const benchImpact = useRef(false);
  const benchFinished = useRef(false);
  const pointImpact = useRef(false);
  const objectionRun = useRef(false);
  const splashScale = useRef(new RNAnimated.Value(theme.media.splashStartScale)).current;
  const splashJitter = useRef(new RNAnimated.Value(theme.raw.transparent)).current;
  const stageShake = useRef(new RNAnimated.Value(theme.raw.transparent)).current;
  const stampScale = useRef(new RNAnimated.Value(theme.media.splashStartScale)).current;
  const stampRotation = useRef(new RNAnimated.Value(theme.raw.transparent)).current;
  const activeRef = useRef(active);
  const courtTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>());
  activeRef.current = active;

  const clearCourtTimers = () => {
    courtTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    courtTimeouts.current.clear();
  };

  const pauseCourtroom = () => {
    clearCourtTimers();
    splashScale.stopAnimation();
    splashJitter.stopAnimation();
    stageShake.stopAnimation();
    stampScale.stopAnimation();
    stampRotation.stopAnimation();
    playerRefs.forEach((playerRef) => {
      void playerRef.current?.pauseAsync().catch(() => undefined);
    });
  };

  const scheduleCourtTimer = (callback: () => void, delay: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    timeout = setTimeout(() => {
      courtTimeouts.current.delete(timeout);
      if (activeRef.current) {
        callback();
      }
    }, delay);
    courtTimeouts.current.add(timeout);
  };

  useEffect(() => () => {
    activeRef.current = false;
    pauseCourtroom();
  }, []);

  useEffect(() => {
    if (!active) {
      pauseCourtroom();
    }
  }, [active]);

  const activatePlayer = useCallback((index: PlayerIndex, afterActivate?: () => void) => {
    if (!activeRef.current) {
      return;
    }
    const player = playerRefs[index].current;
    if (!player) {
      return;
    }
    void player.setPositionAsync(theme.raw.transparent).catch(() => undefined);
    void player.playAsync().catch(() => undefined);
    setActivePlayer(index);
    afterActivate?.();
  }, [theme.raw.transparent]);

  const switchClip = useCallback((clip: ClipName, afterActivate?: () => void) => {
    if (!activeRef.current) {
      return;
    }
    const hidden: PlayerIndex = activePlayer === 0 ? 1 : 0;
    // The visible player is never assigned a new source. The hidden player
    // loads/seeks first, then opacity switches on the next stable frame.
    if (sources[hidden] === clip) {
      activatePlayer(hidden, afterActivate);
      return;
    }
    setQueued({ index: hidden, clip, afterActivate });
    setSources((current) => hidden === 0 ? [clip, current[1]] : [current[0], clip]);
  }, [activatePlayer, activePlayer, sources]);

  const triggerObjectionImpact = useCallback(() => {
    if (!activeRef.current || pointImpact.current) {
      return;
    }
    pointImpact.current = true;
    setFrozen(false);
    setFlash(true);
    setSplashVisible(true);
    playSound("objectionVoice");
    const splashDuration = reducedMotion ? theme.motion.sceneTransitionMs : theme.motion.splashDurationMs;
    const impactDuration = reducedMotion ? theme.raw.transparent : theme.motion.sceneTransitionMs;
    splashScale.setValue(theme.media.splashStartScale);
    splashJitter.setValue(theme.raw.transparent);
    stageShake.setValue(theme.raw.transparent);
    RNAnimated.parallel([
      RNAnimated.timing(splashScale, { duration: splashDuration, easing: RNEasing.out(RNEasing.cubic), toValue: theme.media.splashEndScale, useNativeDriver: true }),
      RNAnimated.sequence([
        RNAnimated.timing(splashJitter, { duration: impactDuration, easing: RNEasing.out(RNEasing.cubic), toValue: reducedMotion ? theme.raw.transparent : theme.media.splashJitter, useNativeDriver: true }),
        RNAnimated.timing(splashJitter, { duration: impactDuration, easing: RNEasing.out(RNEasing.cubic), toValue: reducedMotion ? theme.raw.transparent : -theme.media.splashJitter, useNativeDriver: true }),
        RNAnimated.timing(splashJitter, { duration: impactDuration, easing: RNEasing.out(RNEasing.cubic), toValue: theme.raw.transparent, useNativeDriver: true }),
      ]),
      RNAnimated.sequence([
        RNAnimated.timing(stageShake, { duration: impactDuration, easing: RNEasing.out(RNEasing.cubic), toValue: reducedMotion ? theme.raw.transparent : theme.media.shakeDistance, useNativeDriver: true }),
        RNAnimated.timing(stageShake, { duration: impactDuration, easing: RNEasing.out(RNEasing.cubic), toValue: reducedMotion ? theme.raw.transparent : -theme.media.shakeDistance, useNativeDriver: true }),
        RNAnimated.timing(stageShake, { duration: impactDuration, easing: RNEasing.out(RNEasing.cubic), toValue: theme.raw.transparent, useNativeDriver: true }),
      ]),
    ]).start();
    scheduleCourtTimer(() => setFlash(false), theme.motion.flashFramesMs);
    scheduleCourtTimer(() => {
      setSplashVisible(false);
      onModeChange("rebuttal");
    }, splashDuration);
  }, [onModeChange, playSound, reducedMotion, splashJitter, splashScale, stageShake, theme]);

  const onVideoLoad = useCallback((index: PlayerIndex) => {
    if (!activeRef.current) {
      return;
    }
    if (queued?.index === index) {
      const activate = queued.afterActivate;
      setQueued(null);
      activatePlayer(index, activate);
      return;
    }
    if (index === activePlayer) {
      void playerRefs[index].current?.playAsync().catch(() => undefined);
    }
  }, [activatePlayer, activePlayer, queued]);

  const onVideoStatus = useCallback((index: PlayerIndex, status: { isLoaded: boolean; positionMillis?: number; didJustFinish?: boolean }) => {
    if (!activeRef.current || !status.isLoaded || index !== activePlayer) {
      return;
    }
    const source = sources[index];
    if (source === "bench" && !benchImpact.current && (status.positionMillis ?? theme.raw.transparent) >= theme.motion.benchImpactMs) {
      benchImpact.current = true;
      playSound("benchThud");
    }
    if (source === "bench" && status.didJustFinish && !benchFinished.current) {
      benchFinished.current = true;
      setFrozen(true);
      scheduleCourtTimer(() => switchClip("point"), theme.motion.preShoutSilenceMs);
    }
    if (source === "point" && !pointImpact.current && (status.positionMillis ?? theme.raw.transparent) >= theme.motion.pointImpactMs) {
      triggerObjectionImpact();
    }
  }, [activePlayer, playSound, sources, switchClip, theme, triggerObjectionImpact]);

  useEffect(() => {
    if (!active || mode !== "objection" || objectionRun.current) {
      return;
    }
    objectionRun.current = true;
    benchImpact.current = false;
    benchFinished.current = false;
    pointImpact.current = false;
    switchClip("bench");
  }, [active, mode, switchClip]);

  useEffect(() => {
    if (active && (mode === "plea" || mode === "deliberating")) {
      switchClip("talk");
    }
  }, [active, mode, switchClip]);

  useEffect(() => {
    if (!active || mode !== "verdict") {
      return;
    }
    stampScale.setValue(theme.media.splashStartScale);
    stampRotation.setValue(theme.raw.transparent);
    const stampDuration = reducedMotion ? theme.motion.sceneTransitionMs : theme.motion.stampDurationMs;
    RNAnimated.parallel([
      RNAnimated.timing(stampScale, { duration: stampDuration, easing: RNEasing.out(RNEasing.cubic), toValue: theme.media.splashEndScale, useNativeDriver: true }),
      RNAnimated.timing(stampRotation, { duration: stampDuration, easing: RNEasing.out(RNEasing.cubic), toValue: reducedMotion ? theme.raw.transparent : theme.raw.opaque, useNativeDriver: true }),
    ]).start();
  }, [active, mode, reducedMotion, stampRotation, stampScale, theme]);

  const speaker = mode === "plea" ? "DEFENSE" : mode === "deliberating" ? "THE PROSECUTION IS DELIBERATING…" : mode === "verdict" ? "THE JUDGE" : "THE PROSECUTOR";
  const dialogue = mode === "plea"
    ? "State the facts. Why can you not complete this promise today?"
    : mode === "deliberating"
      ? "The prosecution is deliberating…"
      : mode === "rebuttal"
        ? `${prosecutor?.challenge ?? "The court needs a clearer record."} ${prosecutor?.question ?? "What can you add?"}`
        : mode === "verdict"
          ? verdict?.reasoning ?? "The court has reached a ruling."
          : "";
  const dialogueSpeaker = mode === "plea" ? "defense" : mode === "verdict" ? "judge" : "prosecutor";
  const typewriter = useTypewriter(dialogue, active && !frozen && mode !== "objection" && mode !== "deliberating", reducedMotion, theme, dialogueSpeaker, playSound);

  useEffect(() => setDialogueComplete(typewriter.complete), [typewriter.complete]);
  useEffect(() => setDialogueComplete(false), [mode]);

  const submitPlea = async () => {
    if (!active || !plea.trim()) {
      return;
    }
    objectionRun.current = false;
    await onSubmitPlea(plea);
  };
  const submitRebuttal = async () => {
    if (!active || !rebuttal.trim()) {
      return;
    }
    await onSubmitRebuttal(rebuttal);
  };
  const showInput = active && (mode === "plea" || mode === "rebuttal") && dialogueComplete && !frozen;
  const rejected = verdict?.verdict === "rejected";
  const stampRotate = stampRotation.interpolate({ inputRange: [theme.raw.transparent, theme.raw.opaque], outputRange: [theme.raw.objectionRotation, theme.raw.noRotation] });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.courtKeyboard}>
      <View pointerEvents={active ? "auto" : "none"} style={styles.courtRoot}>
        <RNAnimated.View style={[styles.videoStage, { transform: [{ translateX: stageShake }] }]}>
          {([0, 1] as PlayerIndex[]).map((index) => (
            <Video
              key={index}
              ref={playerRefs[index]}
              isLooping={sources[index] === "talk"}
              isMuted
              onLoad={() => onVideoLoad(index)}
              onPlaybackStatusUpdate={(status) => onVideoStatus(index, status)}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              source={prosecutorVideos[sources[index]]}
              style={[styles.videoPlayer, index === activePlayer ? styles.videoVisible : styles.videoHidden]}
            />
          ))}
          <View pointerEvents="none" style={styles.vignette} />
          {mode === "objection" || mode === "rebuttal" ? <SpeedLines styles={styles} theme={theme} /> : null}
          {flash ? <View pointerEvents="none" style={styles.flash} /> : null}
          {splashVisible ? (
            <RNAnimated.View pointerEvents="none" style={[styles.splashWrap, { transform: [{ scale: splashScale }, { translateX: splashJitter }] }]}>
              <Image resizeMode="contain" source={courtImages.objectionSplash} style={styles.splashImage} />
            </RNAnimated.View>
          ) : null}
          {mode === "verdict" && verdict ? (
            <JudgeVerdict fine={fine} rejected={rejected} stampRotate={stampRotate} stampScale={stampScale} styles={styles} theme={theme} verdict={verdict} />
          ) : null}
          {frozen ? <View pointerEvents="none" style={styles.frozenVeil} /> : null}
        </RNAnimated.View>
        <View style={styles.nameplate}><Text style={styles.nameplateText}>{speaker}</Text></View>
        <Pressable accessibilityRole="button" onPress={typewriter.finish} style={styles.dialogueBox}>
          <Text style={styles.dialogueText}>{typewriter.text}</Text>
          {mode !== "deliberating" && mode !== "objection" ? <Text style={styles.advanceHint}>▼</Text> : null}
        </Pressable>
        {showInput ? (
          <View style={styles.courtInputRow}>
            <TextInput
              accessibilityLabel={mode === "plea" ? "Your plea" : "Your rebuttal"}
              maxLength={theme.raw.maxSubmissionLength}
              onChangeText={mode === "plea" ? setPlea : setRebuttal}
              onSubmitEditing={mode === "plea" ? () => void submitPlea() : () => void submitRebuttal()}
              placeholder={mode === "plea" ? "State your plea" : "Add relevant detail"}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="send"
              style={styles.courtInput}
              value={mode === "plea" ? plea : rebuttal}
            />
            <ActionButton
              disabled={pendingAction !== null || !(mode === "plea" ? plea : rebuttal).trim()}
              label={pendingAction ? "…" : "Send"}
              onPress={mode === "plea" ? () => void submitPlea() : () => void submitRebuttal()}
              styles={styles}
              variant="primary"
            />
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function SpeedLines({ styles, theme }: { styles: StyleSet; theme: ThemeTokens }) {
  return (
    <Svg pointerEvents="none" style={styles.speedLines} viewBox="0 0 100 100">
      {[10, 22, 34, 48, 62, 76].map((position) => <Line key={position} stroke={theme.colors.trim} strokeOpacity={theme.raw.subdued} strokeWidth={theme.layout.borderThin} x1="0" x2="100" y1={position} y2={position - theme.space.xs} />)}
    </Svg>
  );
}

function JudgeVerdict({ fine, rejected, stampRotate, stampScale, styles, theme, verdict }: {
  fine: Fine | null;
  rejected: boolean;
  stampRotate: RNAnimated.AnimatedInterpolation<string | number>;
  stampScale: RNAnimated.Value;
  styles: StyleSet;
  theme: ThemeTokens;
  verdict: JudgeVerdict;
}) {
  const verdictColor = rejected ? theme.colors.rejected : theme.colors.success;
  return (
    <View style={styles.judgeOverlay}>
      <View style={styles.judgePortrait}>
        <Svg height={theme.space.xxl} viewBox="0 0 64 64" width={theme.space.xxl}>
          <Circle cx="32" cy="20" fill="none" r="12" stroke={theme.colors.trim} strokeWidth={theme.layout.borderStrong} />
          <Path d="M 12 56 C 16 38 48 38 52 56" fill="none" stroke={theme.colors.trim} strokeWidth={theme.layout.borderStrong} />
          <Line stroke={theme.colors.trim} strokeWidth={theme.layout.borderStrong} x1="22" x2="42" y1="12" y2="12" />
        </Svg>
        <Text style={styles.judgePortraitText}>THE JUDGE</Text>
      </View>
      <RNAnimated.View style={[styles.verdictStamp, { borderColor: verdictColor, transform: [{ scale: stampScale }, { rotate: stampRotate }] }]}>
        <Text style={[styles.verdictStampText, { color: verdictColor }]}>{rejected ? "REJECTED" : "ACCEPTED"}</Text>
      </RNAnimated.View>
      <Text style={styles.verdictReason}>{verdict.reasoning}</Text>
      <Text style={[styles.verdictFine, { color: rejected ? theme.colors.fine : theme.colors.success }]}>{formatMockCents(fine?.amount_cents ?? theme.raw.transparent)}</Text>
      {verdict.evidence_required ? <Text style={styles.verdictNote}>A similar future plea needs specific, consistent detail.</Text> : null}
    </View>
  );
}

function useTypewriter(
  source: string,
  active: boolean,
  reducedMotion: boolean,
  theme: ThemeTokens,
  speaker: "defense" | "prosecutor" | "judge",
  play: (sound: CourtSound) => void,
) {
  const [text, setText] = useState("");
  const [complete, setComplete] = useState(false);
  const sourceRef = useRef(source);
  const playRef = useRef(play);
  sourceRef.current = source;
  playRef.current = play;

  useEffect(() => {
    setText(reducedMotion && active ? source : "");
    setComplete(!active || !source);
    if (reducedMotion && active) {
      setComplete(true);
      return undefined;
    }
    if (!active || !source) {
      return undefined;
    }
    let index = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        index += 1;
        setText(source.slice(0, index));
        if (speaker !== "judge" && index % theme.raw.dialogueBlipStride === theme.raw.transparent) {
          playRef.current(speaker === "prosecutor" ? "prosecutorBlip" : "defenseBlip");
        }
        if (index >= source.length) {
          if (interval) {
            clearInterval(interval);
          }
          setComplete(true);
        }
      }, theme.motion.typewriterMsPerCharacter);
    }, theme.motion.typewriterStartDelayMs);
    return () => {
      clearTimeout(timeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [active, reducedMotion, source, speaker, theme]);

  return {
    complete,
    finish: () => {
      if (!complete) {
        setText(sourceRef.current);
        setComplete(true);
      }
    },
    text,
  };
}

function SettingsScreen({
  hapticsEnabled,
  onReset,
  onToggleHaptics,
  onToggleMotion,
  onToggleSound,
  reducedMotion,
  soundEnabled,
  styles,
  theme,
}: {
  hapticsEnabled: boolean;
  onReset: () => void;
  onToggleHaptics: () => void;
  onToggleMotion: () => void;
  onToggleSound: () => void;
  reducedMotion: boolean;
  soundEnabled: boolean;
  styles: StyleSet;
  theme: ThemeTokens;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.contentWrap}>
        <View style={styles.settingsHeading}>
          <Text style={styles.sectionLabel}>SETTINGS</Text>
          <Text style={styles.sectionTitle}>Keep the record on your terms.</Text>
        </View>
        <View style={styles.settingsList}>
          <SettingToggle enabled={soundEnabled} label="Court sound" onPress={onToggleSound} styles={styles} />
          <SettingToggle enabled={hapticsEnabled} label="Haptic response" onPress={onToggleHaptics} styles={styles} />
          <SettingToggle enabled={reducedMotion} label="Reduced motion" onPress={onToggleMotion} styles={styles} />
          {__DEV__ ? (
            <Pressable
              accessibilityHint="Long press to restore the seeded demo"
              accessibilityRole="button"
              delayLongPress={theme.raw.titleLongPressMs}
              onLongPress={onReset}
              style={styles.settingRow}
            >
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Demo reset</Text>
                <Text style={styles.settingValue}>Long-press to restore the seeded case.</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function SettingToggle({ enabled, label, onPress, styles }: { enabled: boolean; label: string; onPress: () => void; styles: StyleSet }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: enabled }} onPress={onPress} style={styles.settingRow}>
      <Text style={styles.settingTitle}>{label}</Text>
      <View style={[styles.toggleTrack, enabled && styles.toggleTrackActive]}>
        <View style={[styles.toggleKnob, enabled && styles.toggleKnobActive]} />
      </View>
    </Pressable>
  );
}

function LedgerScreen({ entryQuote, ledger, styles, syncError, theme }: { entryQuote: string | null; ledger: LedgerResponse; styles: StyleSet; syncError: string | null; theme: ThemeTokens }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const cells = useMemo(() => makeHeatmapCells(ledger, theme), [ledger, theme]);
  const selected = selectedDay === null ? null : cells[selectedDay];
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.contentWrap}>
        <Text style={styles.sectionLabel}>THE RECORD</Text>
        <View style={styles.ledgerHero}>
          <Text style={styles.ledgerHeroLabel}>CURRENT FICTIONAL BALANCE</Text>
          <Text style={styles.ledgerHeroAmount}>{formatMockCents(ledger.balance_cents)}</Text>
          <Text style={styles.ledgerHeroCaption}>paid to your own future self</Text>
        </View>
        {syncError ? <Text style={styles.inlineError}>{syncError}</Text> : null}
        <View style={styles.heatmapCard}>
          <Text style={styles.ledgerHeading}>Completion calendar</Text>
          <Text style={styles.heatmapCaption}>A presentational demo month — tap a day for its record.</Text>
          <View style={styles.heatmapGrid}>
            {cells.map((cell, index) => (
              <Pressable
                accessibilityLabel={`Demo day ${index + theme.layout.borderThin}, completion level ${cell.intensity}`}
                key={cell.key}
                onPress={() => setSelectedDay(index)}
                style={[
                  styles.heatmapCell,
                  cell.intensity === theme.raw.transparent && styles.heatmapLevelZero,
                  cell.intensity === theme.raw.heatmapIntensityOne && styles.heatmapLevelOne,
                  cell.intensity === theme.raw.heatmapIntensityTwo && styles.heatmapLevelTwo,
                  cell.intensity === theme.raw.heatmapIntensityThree && styles.heatmapLevelThree,
                  cell.today && styles.heatmapToday,
                ]}
              />
            ))}
          </View>
          {selected ? <Text style={styles.heatmapTooltip}>{selected.label}</Text> : null}
        </View>
        <View style={styles.streakCard}>
          <Text style={styles.ledgerHeading}>Streak record</Text>
          <Text style={styles.streakValue}>Current 0 · Best 1</Text>
          <Text style={styles.streakCopy}>Case closed. New trial starts tomorrow.</Text>
        </View>
        <View style={styles.finesCard}>
          <Text style={styles.ledgerHeading}>Fine entries</Text>
          {ledger.entries.length === theme.raw.transparent ? <Text style={styles.emptyLedger}>No ruling yet. The record is clear.</Text> : ledger.entries.map((entry) => (
            <FineRow entry={entry} key={entry.id} quote={entryQuote} styles={styles} theme={theme} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function makeHeatmapCells(ledger: LedgerResponse, theme: ThemeTokens) {
  const todayIndex = theme.layout.heatmapCells - theme.layout.borderThin;
  return Array.from({ length: theme.layout.heatmapCells }, (_, index) => {
    const today = index === todayIndex;
    const intensity = today
      ? (ledger.entries.length ? theme.raw.heatmapIntensityThree : theme.raw.transparent)
      : theme.raw.heatmapDemoPattern[index % theme.raw.heatmapDemoPattern.length];
    return {
      intensity,
      key: `day-${index}`,
      label: today ? `${ledger.entries.length ? "Ruling recorded" : "No completed habit recorded"} today.` : "Demo calendar day — no stored history.",
      today,
    };
  });
}

function FineRow({ entry, quote, styles, theme }: { entry: LedgerEntry; quote: string | null; styles: StyleSet; theme: ThemeTokens }) {
  const rejected = entry.amount_cents > theme.raw.transparent;
  return (
    <View style={styles.fineRow}>
      <View style={styles.fineCopy}>
        <View style={styles.fineHeadingRow}>
          <Text style={styles.fineHabit}>30 minutes of exercise</Text>
          <Text style={[styles.verdictBadge, rejected ? styles.verdictBadgeRejected : styles.verdictBadgeAccepted]}>{rejected ? "REJECTED" : "ACCEPTED"}</Text>
        </View>
        <Text style={styles.fineDate}>{formatDate(entry.created_at)}</Text>
        {rejected && quote ? <Text style={styles.fineQuote}>“{quote}”</Text> : null}
      </View>
      <Text style={[styles.fineAmount, rejected ? styles.fineAmountRejected : styles.fineAmountAccepted]}>{formatMockCents(entry.amount_cents)}</Text>
    </View>
  );
}

function ActionButton({ disabled = false, label, onPress, styles, variant }: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  styles: StyleSet;
  variant: "primary" | "secondary";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [variant === "primary" ? styles.primaryButton : styles.secondaryButton, (pressed || disabled) && styles.buttonInactive]}
    >
      <Text style={variant === "primary" ? styles.primaryButtonText : styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

type StyleSet = ReturnType<typeof createStyles>;

function createStyles(theme: ThemeTokens, insets: { top: number; bottom: number }) {
  const { colors, layout, raw, space, type } = theme;
  return StyleSheet.create({
    safeArea: { backgroundColor: colors.background, flex: raw.flexOne, paddingTop: insets.top },
    brand: { alignItems: "center", paddingHorizontal: space.lg, paddingVertical: space.md },
    brandEyebrow: { ...type.label, color: colors.textMuted },
    brandName: { ...type.display, color: colors.text, letterSpacing: space.xxs },
    scene: { flex: raw.flexOne },
    bottomBar: { alignItems: "center", alignSelf: "center", backgroundColor: colors.navBar, borderColor: colors.borderSubtle, borderRadius: layout.capsuleRadius, borderWidth: layout.borderThin, flexDirection: "row", gap: space.sm, marginBottom: insets.bottom + space.md, marginTop: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs },
    navItem: { alignItems: "center", borderRadius: layout.capsuleRadius, gap: space.xxs, justifyContent: "center", minHeight: space.xxl + space.sm, minWidth: space.xxxl + space.md, paddingHorizontal: space.sm },
    navItemActive: { backgroundColor: colors.elevated },
    navIcon: { height: space.md, width: space.md },
    navLabel: { ...type.label, color: colors.trim },
    navLabelActive: { color: colors.primary },
    iris: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background },
    scrollContent: { flexGrow: raw.flexOne, padding: space.lg },
    contentWrap: { alignSelf: "center", gap: space.lg, maxWidth: layout.contentMaxWidth, width: layout.contentWidth },
    centeredState: { alignItems: "center", flex: raw.flexOne, gap: space.md, justifyContent: "center", paddingHorizontal: space.xl },
    stateTitle: { ...type.section, color: colors.text, textAlign: "center" },
    stateCopy: { ...type.body, color: colors.textMuted, textAlign: "center" },
    todayHeader: { gap: space.xxs },
    todayDate: { ...type.label, color: colors.trim },
    todayStatus: { ...type.section, color: colors.text },
    gaugeWrap: { alignItems: "center", justifyContent: "center", minHeight: space.xxxl * raw.flexOne },
    gaugeCenter: { alignItems: "center", bottom: raw.zero, justifyContent: "center", left: raw.zero, position: "absolute", right: raw.zero, top: space.md },
    gaugePercent: { ...type.display, color: colors.text },
    gaugeCaption: { ...type.body, color: colors.textMuted },
    sectionHeading: { gap: space.xxs },
    sectionLabel: { ...type.label, color: colors.trim },
    sectionTitle: { ...type.section, color: colors.text },
    habitActionGroup: { gap: space.xxs },
    habitPressable: { alignSelf: "stretch" },
    habitCard: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.borderSubtle, borderRadius: layout.cardRadius, borderWidth: layout.borderThin, flexDirection: "row", minHeight: space.xxxl + space.xs, opacity: raw.opaque, padding: space.md },
    habitCardComplete: { opacity: raw.subdued },
    habitCopy: { flex: raw.flexOne, gap: space.xxs },
    habitTitle: { ...type.bodyStrong, color: colors.text },
    habitMeta: { alignItems: "center", flexDirection: "row", gap: space.xxs },
    habitMetaText: { ...type.label, color: colors.trim },
    habitDeadline: { ...type.body, color: colors.textMuted },
    habitStake: { ...type.label, color: colors.textMuted },
    checkTarget: { alignItems: "center", borderColor: colors.trim, borderRadius: layout.pillRadius, borderWidth: layout.borderStrong, height: space.xxl, justifyContent: "center", marginLeft: space.sm, width: space.xxl },
    checkTargetComplete: { backgroundColor: colors.success, borderColor: colors.success },
    quietAction: { alignSelf: "center", padding: space.sm },
    quietActionText: { ...type.body, color: colors.textMuted, textDecorationLine: "underline" },
    addHabitRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
    addHabitInput: { ...type.body, backgroundColor: colors.input, borderColor: colors.borderSubtle, borderRadius: layout.controlRadius, borderWidth: layout.borderThin, color: colors.text, flex: raw.flexOne, minHeight: layout.buttonMinHeight, paddingHorizontal: space.sm },
    habitSkip: { alignSelf: "flex-start", paddingHorizontal: space.sm, paddingVertical: space.sm },
    habitSkippedNote: { ...type.label, color: colors.textMuted },
    statusPanel: { gap: space.sm, paddingVertical: space.sm },
    statusPanelTitle: { ...type.bodyStrong, color: colors.text },
    completeReaction: { ...type.bodyStrong, color: colors.success, textAlign: "center" },
    inlineError: { ...type.body, color: colors.textMuted, textAlign: "center" },
    noticeCard: { gap: space.xxs, paddingVertical: space.md },
    noticeTitle: { ...type.bodyStrong, color: colors.text },
    noticeCopy: { ...type.body, color: colors.textMuted },
    primaryButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: layout.controlRadius, justifyContent: "center", maxWidth: layout.buttonMaxWidth, minHeight: layout.buttonMinHeight, paddingHorizontal: space.md, paddingVertical: space.sm },
    primaryButtonText: { ...type.bodyStrong, color: colors.background },
    secondaryButton: { alignItems: "center", alignSelf: "flex-start", borderColor: colors.textMuted, borderRadius: layout.controlRadius, borderWidth: layout.borderThin, justifyContent: "center", maxWidth: layout.buttonMaxWidth, minHeight: layout.buttonMinHeight, paddingHorizontal: space.md, paddingVertical: space.sm },
    secondaryButtonText: { ...type.bodyStrong, color: colors.textMuted },
    buttonInactive: { opacity: raw.inactive },
    courtKeyboard: { flex: raw.flexOne },
    courtRoot: { flex: raw.flexOne, gap: space.sm, padding: space.md },
    videoStage: { alignSelf: "center", aspectRatio: theme.media.videoAspectRatio, backgroundColor: colors.background, maxWidth: layout.contentMaxWidth, overflow: "hidden", width: raw.full },
    videoPlayer: { ...StyleSheet.absoluteFillObject },
    videoVisible: { opacity: raw.opaque },
    videoHidden: { opacity: raw.transparent },
    vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, opacity: space.xxs / space.xxxl },
    speedLines: { ...StyleSheet.absoluteFillObject, opacity: raw.subdued },
    flash: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.flash, opacity: raw.opaque },
    frozenVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, opacity: space.xxs / space.xxxl },
    splashWrap: { alignSelf: "center", bottom: raw.zero, justifyContent: "center", position: "absolute", top: raw.zero, width: raw.full },
    splashImage: { aspectRatio: theme.media.videoAspectRatio, height: raw.full, width: raw.full },
    nameplate: { alignSelf: "flex-start", backgroundColor: colors.elevated, borderColor: colors.trim, borderRadius: layout.controlRadius, borderWidth: layout.borderThin, marginLeft: space.sm, marginTop: -space.xl, paddingHorizontal: space.sm, paddingVertical: space.xxs },
    nameplateText: { ...type.label, color: colors.text },
    dialogueBox: { backgroundColor: colors.elevated, borderColor: colors.trim, borderRadius: layout.cardRadius, borderWidth: layout.borderThin, minHeight: space.xxxl, padding: space.md },
    dialogueText: { ...type.body, color: colors.text },
    advanceHint: { ...type.label, color: colors.trim, marginTop: space.xs, textAlign: "right" },
    courtInputRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
    courtInput: { ...type.body, backgroundColor: colors.input, borderColor: colors.trim, borderRadius: layout.controlRadius, borderWidth: layout.borderThin, color: colors.text, flex: raw.flexOne, minHeight: layout.inputMinHeight, paddingHorizontal: space.sm },
    judgeOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", backgroundColor: colors.elevated, gap: space.sm, justifyContent: "center", padding: space.lg },
    judgePortrait: { alignItems: "center", gap: space.xxs },
    judgePortraitText: { ...type.label, color: colors.trim },
    verdictStamp: { borderRadius: layout.controlRadius, borderWidth: layout.borderStrong, paddingHorizontal: space.lg, paddingVertical: space.sm },
    verdictStampText: { ...type.verdict },
    verdictReason: { ...type.bodyStrong, color: colors.text, textAlign: "center" },
    verdictFine: { ...type.display },
    verdictNote: { ...type.body, color: colors.textMuted, textAlign: "center" },
    ledgerHero: { backgroundColor: colors.card, borderRadius: layout.cardRadius, gap: space.xxs, padding: space.lg },
    ledgerHeroLabel: { ...type.label, color: colors.textMuted },
    ledgerHeroAmount: { ...type.display, color: colors.text },
    ledgerHeroCaption: { ...type.body, color: colors.textMuted },
    heatmapCard: { gap: space.sm, paddingVertical: space.md },
    ledgerHeading: { ...type.section, color: colors.text },
    heatmapCaption: { ...type.body, color: colors.textMuted },
    heatmapGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.xxs },
    heatmapCell: { aspectRatio: raw.flexOne, borderRadius: layout.controlRadius, width: layout.heatmapCellWidth },
    heatmapLevelZero: { backgroundColor: colors.card },
    heatmapLevelOne: { backgroundColor: colors.primary, opacity: space.xs / space.xxxl },
    heatmapLevelTwo: { backgroundColor: colors.primary, opacity: space.sm / space.xxxl },
    heatmapLevelThree: { backgroundColor: colors.primary, opacity: raw.opaque },
    heatmapToday: { borderColor: colors.trim, borderWidth: layout.borderStrong },
    heatmapTooltip: { ...type.body, color: colors.text },
    streakCard: { gap: space.xxs, paddingVertical: space.md },
    streakValue: { ...type.bodyStrong, color: colors.text },
    streakCopy: { ...type.body, color: colors.textMuted },
    finesCard: { gap: space.sm, paddingVertical: space.md },
    emptyLedger: { ...type.body, color: colors.textMuted },
    fineRow: { borderTopColor: colors.trim, borderTopWidth: layout.borderThin, flexDirection: "row", gap: space.sm, justifyContent: "space-between", paddingTop: space.sm },
    fineCopy: { flex: raw.flexOne, gap: space.xxs },
    fineHeadingRow: { alignItems: "center", flexDirection: "row", gap: space.xs },
    fineHabit: { ...type.bodyStrong, color: colors.text, flex: raw.flexOne },
    fineDate: { ...type.body, color: colors.textMuted },
    fineQuote: { ...type.body, color: colors.textMuted, fontStyle: "italic" },
    verdictBadge: { ...type.label, borderRadius: layout.controlRadius, paddingHorizontal: space.xs, paddingVertical: space.xxs },
    verdictBadgeRejected: { backgroundColor: colors.rejected, color: colors.flash },
    verdictBadgeAccepted: { backgroundColor: colors.success, color: colors.background },
    fineAmount: { ...type.bodyStrong, textAlign: "right" },
    fineAmountRejected: { color: colors.fine },
    fineAmountAccepted: { color: colors.success },
    settingsHeading: { gap: space.xxs },
    settingsList: { borderTopColor: colors.borderSubtle, borderTopWidth: layout.borderThin },
    settingRow: { alignItems: "center", borderBottomColor: colors.borderSubtle, borderBottomWidth: layout.borderThin, flexDirection: "row", gap: space.sm, justifyContent: "space-between", minHeight: space.xxxl, paddingVertical: space.sm },
    settingCopy: { flex: raw.flexOne, gap: space.xxs },
    settingTitle: { ...type.bodyStrong, color: colors.text },
    settingValue: { ...type.body, color: colors.textMuted },
    toggleTrack: { backgroundColor: colors.elevated, borderColor: colors.trim, borderRadius: layout.pillRadius, borderWidth: layout.borderThin, padding: space.xxs / layout.borderStrong, width: space.xxl },
    toggleTrackActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    toggleKnob: { backgroundColor: colors.trim, borderRadius: layout.pillRadius, height: space.sm, width: space.sm },
    toggleKnobActive: { backgroundColor: colors.background, transform: [{ translateX: space.sm }] },
  });
}
