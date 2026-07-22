/**
 * COURTROOM MEDIA ABSTRACTION — the single swap point for final media.
 *
 * Roadmap media policy (V1):
 * - No bundled video/animation/ripped assets. Final media arrives later.
 * - Screens and components consume SLOTS, never files.
 * - Swapping in final media must change ONLY this module (this file decides
 *   what each slot contains; MediaSlotView renders whatever it is told).
 *
 * Until real media lands, every slot resolves to a token-styled placeholder:
 * a solid silhouette card or a typographic card. When final media arrives,
 * extend `MediaSlotContent` with e.g. { kind: "image", source: ... } here and
 * teach MediaSlotView to render it — zero changes anywhere else.
 */
import { BRAND_SHOUTS } from "../i18n/brand";

/** Scene states of the courtroom flow (roadmap-defined). */
export type CourtScene = "idle" | "objection" | "rebuttal" | "deliberating" | "verdict";

export type CourtCharacter = "prosecutor" | "judge" | "stage";

/** Placeholder content kinds available in V1. */
export type MediaSlotContent =
  | {
      kind: "silhouette";
      character: CourtCharacter;
      /** i18n key for the placeholder caption (media.* namespace). */
      captionKey: string;
    }
  | {
      kind: "typographic";
      /** English brand shout rendered big (e.g. OBJECTION!). */
      shout: string;
      captionKey?: string;
    };

export interface MediaSlot {
  /** Stable identity for testing/QA. */
  id: string;
  content: MediaSlotContent;
}

export interface CourtMediaState {
  scene: CourtScene;
  prosecutorEmotion?: string;
  judgeEmotion?: string;
}

export interface CourtMediaSlots {
  /** The main stage area (always present). */
  stage: MediaSlot;
  /** Optional banner above the stage (e.g. the OBJECTION! card). */
  banner: MediaSlot | null;
}

const PROSECUTOR_EMOTIONS = new Set(["idle", "objection", "angry", "smug", "condemning"]);
const JUDGE_EMOTIONS = new Set(["neutral", "stern", "angry", "verdict"]);

/** Backend emotion vocab is open (fallback lines emit e.g. "unmoved") — map unknowns down. */
function normalizeProsecutorEmotion(emotion: string | undefined): string {
  if (emotion && PROSECUTOR_EMOTIONS.has(emotion)) return emotion;
  return "idle";
}

function normalizeJudgeEmotion(emotion: string | undefined): string {
  if (emotion && JUDGE_EMOTIONS.has(emotion)) return emotion;
  return "neutral";
}

/**
 * Resolve the media slots for a courtroom state.
 * This mapping — and ONLY this mapping — changes when final media arrives.
 */
export function getCourtMediaSlots(state: CourtMediaState): CourtMediaSlots {
  switch (state.scene) {
    case "idle":
      return {
        stage: {
          id: "stage-idle",
          content: {
            kind: "silhouette",
            character: "judge",
            captionKey: "media.placeholder_judge_neutral",
          },
        },
        banner: null,
      };
    case "objection": {
      const emotion = normalizeProsecutorEmotion(state.prosecutorEmotion);
      return {
        stage: {
          id: `prosecutor-${emotion}`,
          content: {
            kind: "silhouette",
            character: "prosecutor",
            captionKey: `media.placeholder_prosecutor_${emotion}`,
          },
        },
        banner: {
          id: "banner-objection",
          content: { kind: "typographic", shout: BRAND_SHOUTS.objection },
        },
      };
    }
    case "rebuttal": {
      const emotion = normalizeProsecutorEmotion(state.prosecutorEmotion);
      return {
        stage: {
          id: `prosecutor-awaiting-${emotion}`,
          content: {
            kind: "silhouette",
            character: "prosecutor",
            captionKey: `media.placeholder_prosecutor_${emotion}`,
          },
        },
        banner: null,
      };
    }
    case "deliberating":
      return {
        stage: {
          id: "stage-deliberating",
          content: {
            kind: "silhouette",
            character: "stage",
            captionKey: "media.placeholder_deliberating",
          },
        },
        banner: null,
      };
    case "verdict": {
      const emotion = normalizeJudgeEmotion(state.judgeEmotion);
      return {
        stage: {
          id: `judge-${emotion}`,
          content: {
            kind: "silhouette",
            character: "judge",
            captionKey: `media.placeholder_judge_${emotion}`,
          },
        },
        banner: null,
      };
    }
  }
}
