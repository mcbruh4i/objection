/**
 * COURTROOM — full-screen takeover in the dark world.
 * Flow: plea → prosecutor objection → rebuttal (may loop) → verdict.
 * The tab bar does not exist here (root-level route); the only way out is
 * the explicit LeaveCourtButton or the post-verdict exit.
 * All stage visuals come from the media slot abstraction (placeholders in V1).
 */
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import type { Fine, JudgeVerdict, ProsecutorResponse } from "../api/types";
import type { RootStackParamList } from "../navigation/types";
import { useApi } from "../state/ApiContext";
import { saveVerdict } from "../state/verdictStore";
import { getCourtMediaSlots, CourtScene } from "../media/courtMedia";
import { MediaSlotView } from "../media/MediaSlotView";
import { ScreenContainer } from "../components/common/ScreenContainer";
import { AppText } from "../components/common/AppText";
import { InlineNotice } from "../components/common/InlineNotice";
import { LoadingBlock } from "../components/common/LoadingBlock";
import { LeaveCourtButton } from "../components/court/LeaveCourtButton";
import { PleaForm } from "../components/court/PleaForm";
import { ProsecutorPanel } from "../components/court/ProsecutorPanel";
import { RebuttalForm } from "../components/court/RebuttalForm";
import { VerdictPanel } from "../components/court/VerdictPanel";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { ApiError } from "../api/client";
import { theme } from "../theme/tokens";

type Phase =
  | { kind: "plea" }
  | { kind: "waiting_prosecutor" }
  | { kind: "prosecutor"; prosecutor: ProsecutorResponse; repeated: boolean; round: number }
  | { kind: "waiting_judge"; lastProsecutor: ProsecutorResponse | null }
  | { kind: "resolved"; verdict: JudgeVerdict; fine: Fine };

type Nav = NativeStackNavigationProp<RootStackParamList, "Courtroom">;
type CourtRoute = RouteProp<RootStackParamList, "Courtroom">;

export function CourtroomScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const api = useApi();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<CourtRoute>();

  const [phase, setPhase] = useState<Phase>(() => {
    if (params.initialState === "awaiting_rebuttal" && params.initialProsecutor) {
      return { kind: "prosecutor", prosecutor: params.initialProsecutor, repeated: false, round: 1 };
    }
    // awaiting_plea — or a restored awaiting_rebuttal whose prosecutor text
    // didn't reach us: the backend replays the stored prosecutor on the next
    // plea submit (idempotent), so the plea form is a safe entry point.
    return { kind: "plea" };
  });
  const [notice, setNotice] = useState<string | null>(null);

  const busy = phase.kind === "waiting_prosecutor" || phase.kind === "waiting_judge";

  const scene: CourtScene = useMemo(() => {
    switch (phase.kind) {
      case "plea":
        return "idle";
      case "waiting_prosecutor":
      case "waiting_judge":
        return "deliberating";
      case "prosecutor":
        return "objection";
      case "resolved":
        return "verdict";
    }
  }, [phase.kind]);

  const slots = useMemo(
    () =>
      getCourtMediaSlots({
        scene,
        ...(phase.kind === "prosecutor" ? { prosecutorEmotion: phase.prosecutor.emotion } : {}),
        ...(phase.kind === "resolved" ? { judgeEmotion: phase.verdict.judge_emotion } : {}),
      }),
    [scene, phase],
  );

  const exitCourt = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  const submitPlea = useCallback(
    async (text: string): Promise<void> => {
      setNotice(null);
      setPhase({ kind: "waiting_prosecutor" });
      try {
        const response = await api.submitPlea(params.sessionId, text);
        setPhase({
          kind: "prosecutor",
          prosecutor: response.prosecutor,
          repeated: response.repeated,
          round: 1,
        });
      } catch (error) {
        setPhase({ kind: "plea" });
        setNotice(
          apiErrorMessage(error, t, {
            409: t("court.session_conflict"),
            404: t("court.session_not_found"),
          }),
        );
      }
    },
    [api, params.sessionId, t],
  );

  const submitRebuttal = useCallback(
    async (text: string): Promise<void> => {
      if (phase.kind !== "prosecutor") return;
      const current = phase;
      setNotice(null);
      setPhase({ kind: "waiting_judge", lastProsecutor: current.prosecutor });
      try {
        const response = await api.submitRebuttal(params.sessionId, text);
        if (response.should_rule) {
          setPhase({ kind: "resolved", verdict: response.verdict, fine: response.fine });
          // Record the verdict per habit so Today can stamp the sealed card
          // (client-side — resolved verdicts never come back from /today).
          if (params.habitId) {
            void saveVerdict(params.habitId, response.verdict.verdict);
          }
        } else {
          // The court is not satisfied — a fresh prosecutor round begins.
          setPhase({
            kind: "prosecutor",
            prosecutor: response.prosecutor,
            repeated: false,
            round: current.round + 1,
          });
        }
      } catch (error) {
        // A 409 "verdict not available yet" means a parallel ruling is being
        // written; everything else returns the defendant to the round.
        setPhase(current);
        if (error instanceof ApiError && error.status === 409) {
          setNotice(t("court.session_conflict"));
        } else {
          setNotice(apiErrorMessage(error, t, { 404: t("court.session_not_found") }));
        }
      }
    },
    [api, params.sessionId, phase, t],
  );

  return (
    <ScreenContainer world="court">
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <LeaveCourtButton onPress={exitCourt} />
      </View>

      <View style={styles.caseHeader}>
        <AppText variant="h1" color="textOnDark">
          {t("court.courtroom_title")}
        </AppText>
        <AppText variant="label" color="textMutedOnDark">
          {t("court.case_label", { habit: params.habitTitle })}
        </AppText>
        <View style={styles.rule} />
      </View>

      {slots.banner ? <MediaSlotView slot={slots.banner} layout="banner" /> : null}
      <MediaSlotView slot={slots.stage} layout="stage" />

      {notice ? <InlineNotice message={notice} /> : null}

      {phase.kind === "plea" ? (
        <PleaForm onSubmit={(text) => void submitPlea(text)} busy={busy} />
      ) : null}

      {phase.kind === "waiting_prosecutor" ? (
        <LoadingBlock label={t("court.loading_prosecutor")} tone="court" />
      ) : null}

      {phase.kind === "prosecutor" ? (
        <View style={styles.roundStack}>
          <ProsecutorPanel prosecutor={phase.prosecutor} repeated={phase.repeated} />
          <RebuttalForm
            round={phase.round}
            onSubmit={(text) => void submitRebuttal(text)}
            busy={busy}
          />
        </View>
      ) : null}

      {phase.kind === "waiting_judge" ? (
        <LoadingBlock label={t("court.loading_judge")} tone="court" />
      ) : null}

      {phase.kind === "resolved" ? (
        <VerdictPanel verdict={phase.verdict} fine={phase.fine} onExit={exitCourt} />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  caseHeader: {
    gap: theme.spacing.xs,
  },
  rule: {
    height: theme.borders.heavy,
    backgroundColor: theme.colors.accent,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.none,
  },
  roundStack: {
    gap: theme.spacing.lg,
  },
});
