/** Curated IANA zones for the shop schedule picker (common seller locales). */
export const SCHEDULE_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Mexico_City", label: "Mexico City (CST)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (UK)" },
  { value: "Europe/Paris", label: "Central Europe (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AET)" },
  { value: "Pacific/Auckland", label: "Auckland (NZT)" },
];

/** Safe in-list fallback when zone is unset (never rely on list order alone). */
export const DEFAULT_SCHEDULE_TIMEZONE = "UTC";

export function isKnownScheduleTimeZone(value: string): boolean {
  return SCHEDULE_TIMEZONES.some((z) => z.value === value);
}

/**
 * Options for the schedule timezone select. Puts `preferred` first when set so
 * the control never appears to "default" to an unrelated first list entry.
 */
export function scheduleTimeZoneOptions(preferred?: string | null): { value: string; label: string }[] {
  const list = [...SCHEDULE_TIMEZONES];
  const pref = preferred?.trim();
  if (!pref) return list;

  const idx = list.findIndex((z) => z.value === pref);
  if (idx > 0) {
    const [item] = list.splice(idx, 1);
    list.unshift(item);
  } else if (idx < 0) {
    list.unshift({ value: pref, label: pref.replace(/_/g, " ") });
  }
  return list;
}

/** Resolve a usable IANA zone from saved value or browser detection. */
export function resolveScheduleTimeZone(saved?: string | null): string {
  const trimmed = saved?.trim();
  if (trimmed) return trimmed;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_SCHEDULE_TIMEZONE;
  } catch {
    return DEFAULT_SCHEDULE_TIMEZONE;
  }
}
