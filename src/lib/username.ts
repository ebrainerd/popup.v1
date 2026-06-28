import { containsProfanity } from "@/lib/profanity";

/** Instagram/Twitter-style handle: 3–20 chars, lowercase, starts with a letter. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

const USERNAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Lowercase handles that must not be registered (brand, routes, abuse). */
export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "auth",
  "dashboard",
  "explore",
  "help",
  "legal",
  "login",
  "logout",
  "moderator",
  "mod",
  "null",
  "onboarding",
  "orders",
  "popup",
  "privacy",
  "root",
  "search",
  "sell",
  "settings",
  "signup",
  "staff",
  "support",
  "system",
  "terms",
  "undefined",
  "www",
]);

export type UsernameValidationResult =
  | { ok: true; username: string }
  | { ok: false; error: string };

/** Normalize user input to canonical lowercase handle form. */
export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Validate a username for registration or profile setup. */
export function validateUsername(raw: string): UsernameValidationResult {
  const username = normalizeUsernameInput(raw);

  if (!username) {
    return { ok: false, error: "Choose a username." };
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return { ok: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters.` };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, error: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.` };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error:
        "Usernames must start with a letter and use only lowercase letters, numbers, and underscores.",
    };
  }
  if (username.endsWith("_")) {
    return { ok: false, error: "Username cannot end with an underscore." };
  }
  if (username.includes("__")) {
    return { ok: false, error: "Username cannot contain consecutive underscores." };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, error: "That username is not available." };
  }
  if (containsProfanity(username)) {
    return { ok: false, error: "Please choose a different username." };
  }

  return { ok: true, username };
}

export const USERNAME_CHANGE_SUPPORT_EMAIL = "support@popupdrop.co";

export const USERNAME_PERMANENCE_NOTICE =
  `Your username is permanent. To request a change later, email ${USERNAME_CHANGE_SUPPORT_EMAIL}.`;
