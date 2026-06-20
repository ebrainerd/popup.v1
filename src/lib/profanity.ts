/**
 * Minimal keyword profanity/spam filter for MVP chat moderation.
 * This is intentionally simple (per the design doc); richer/AI moderation is
 * Phase 2. Matches whole words case-insensitively and masks them.
 */
const BLOCKLIST = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "cunt",
  "slut",
  "whore",
  "nigger",
  "faggot",
  "retard",
];

const pattern = new RegExp(`\\b(${BLOCKLIST.join("|")})\\b`, "gi");

/** Returns the message with blocked words masked as asterisks. */
export function filterProfanity(message: string): string {
  return message.replace(pattern, (match) => "*".repeat(match.length));
}

/** True if the message contained any blocked word. */
export function containsProfanity(message: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(message);
}
