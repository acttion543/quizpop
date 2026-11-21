export const MUSIC_PREFERENCE_KEY = "quizpop:music";
export const DEFAULT_MUSIC_VOLUME = 50;
export type MusicPreferences = { enabled: boolean; volume: number };

export function readMusicPreferences(raw: string | null): MusicPreferences {
  const defaults = { enabled: true, volume: DEFAULT_MUSIC_VOLUME };
  try {
    const saved = JSON.parse(raw || "null");
    if (!saved || typeof saved !== "object") return defaults;
    return {
      enabled: typeof saved.enabled === "boolean" ? saved.enabled : true,
      volume: typeof saved.volume === "number" && Number.isFinite(saved.volume)
        ? Math.max(0, Math.min(100, saved.volume)) : DEFAULT_MUSIC_VOLUME,
    };
  } catch { return defaults; }
}
