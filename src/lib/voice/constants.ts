// Shared by the voice token endpoint (server) and the call widget (browser):
// the client must open the session with the same model the token was minted for.

export const VOICE_MODEL = process.env.NEXT_PUBLIC_VOICE_MODEL || "gemini-3.8-live";

/** Sent once the call connects so the assistant greets the caller first. */
export const CALL_START_MARKER = "[call connected]";

/** Demo calls hang up automatically after this long. */
export const MAX_CALL_MS = 4 * 60_000;
