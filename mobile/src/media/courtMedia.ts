import { useEffect, useMemo, useRef, useState } from "react";
import { Audio, type AVPlaybackSource } from "expo-av";

/** All media playback uses bundled sources; no court audio or video is fetched at runtime. */
export const prosecutorVideos = {
  talk: require("../../assets/video/talk-loop.mp4") as AVPlaybackSource,
  bench: require("../../assets/video/bench-slam.mp4") as AVPlaybackSource,
  point: require("../../assets/video/objection-point.mp4") as AVPlaybackSource,
} as const;

export type CourtSpeaker = "prosecutor" | "judge" | "defense";
export type CourtVideoKey = keyof typeof prosecutorVideos;

export interface CourtVideoSelection {
  /** The final bundled filename to use when that character clip is available. */
  filename: string;
  /** A source that is bundled today, so a missing final clip never breaks court. */
  fallback: CourtVideoKey;
}

/**
 * Metro requires local assets to be statically resolvable. The final character
 * filenames are recorded here now; while a file is absent, the scene uses the
 * already bundled talk loop as that character's idle fallback. Adding a final
 * clip later only requires registering its static source here.
 */
export const courtVideoManifest = {
  prosecutor: {
    idle: { filename: "prosecutor_idle.mp4", fallback: "talk" },
    objection: { filename: "prosecutor_objection.mp4", fallback: "talk" },
    condemning: { filename: "prosecutor_condemn.mp4", fallback: "talk" },
  },
  judge: {
    idle: { filename: "judge_idle.mp4", fallback: "talk" },
    verdict: { filename: "judge_verdict.mp4", fallback: "talk" },
  },
  defense: {
    idle: { filename: "defense_idle.mp4", fallback: "talk" },
  },
} as const satisfies Record<CourtSpeaker, Record<string, CourtVideoSelection>>;

/** Resolve model emotion text to a character clip, with a bundled idle fallback. */
export function courtVideoFor(speaker: CourtSpeaker, emotion?: string | null): CourtVideoSelection {
  const normalizedEmotion = emotion?.trim().toLowerCase() ?? "";
  if (speaker === "prosecutor") {
    if (normalizedEmotion === "objection" || normalizedEmotion === "angry") {
      return courtVideoManifest.prosecutor.objection;
    }
    if (normalizedEmotion === "smug" || normalizedEmotion === "condemning") {
      return courtVideoManifest.prosecutor.condemning;
    }
    return courtVideoManifest.prosecutor.idle;
  }
  if (speaker === "judge") {
    if (normalizedEmotion === "verdict" || normalizedEmotion === "stern" || normalizedEmotion === "angry") {
      return courtVideoManifest.judge.verdict;
    }
    return courtVideoManifest.judge.idle;
  }
  return courtVideoManifest.defense.idle;
}

export const courtImages = {
  objectionSplash: require("../../assets/images/objection-splash.webp"),
} as const;

const soundSources = {
  objectionVoice: require("../../assets/audio/objection-voice.mp3") as AVPlaybackSource,
  defenseBlip: require("../../assets/audio/defense-blip.mp3") as AVPlaybackSource,
  prosecutorBlip: require("../../assets/audio/prosecutor-blip.mp3") as AVPlaybackSource,
  benchThud: require("../../assets/audio/bench-thud.mp3") as AVPlaybackSource,
  gavel: require("../../assets/audio/gavel.mp3") as AVPlaybackSource,
} as const;

export type CourtSound = keyof typeof soundSources;

const initialVolumes: Record<CourtSound, number> = {
  objectionVoice: 1,
  defenseBlip: 0.32,
  prosecutorBlip: 0.38,
  benchThud: 0.72,
  gavel: 0.74,
};

/** Preloads local clips once and keeps every video source muted. */
export function useCourtAudio() {
  const sounds = useRef<Partial<Record<CourtSound, Audio.Sound>>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const loaded = await Promise.all(
          (Object.keys(soundSources) as CourtSound[]).map(async (name) => {
            const { sound } = await Audio.Sound.createAsync(soundSources[name], {
              shouldPlay: false,
              volume: initialVolumes[name],
            });
            return [name, sound] as const;
          }),
        );
        if (!live) {
          await Promise.all(loaded.map(([, sound]) => sound.unloadAsync()));
          return;
        }
        sounds.current = Object.fromEntries(loaded) as Partial<Record<CourtSound, Audio.Sound>>;
        setReady(true);
      } catch {
        // Sound is enhancement-only: the playable court flow never depends on it.
        setReady(false);
      }
    };
    void load();
    return () => {
      live = false;
      const activeSounds = Object.values(sounds.current);
      sounds.current = {};
      void Promise.all(activeSounds.map((sound) => sound?.unloadAsync()));
    };
  }, []);

  return useMemo(() => ({
    ready,
    play: (name: CourtSound) => {
      const sound = sounds.current[name];
      if (!sound) {
        return;
      }
      void sound.replayAsync().catch(() => undefined);
    },
  }), [ready]);
}
