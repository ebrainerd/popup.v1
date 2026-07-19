/** Curated IANA zones for the shop schedule picker (common seller locales). */
export const SCHEDULE_TIMEZONES: { value: string; label: string }[] = [
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Mexico_City", label: "Mexico City (CST)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
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

export function isKnownScheduleTimeZone(value: string): boolean {
  return SCHEDULE_TIMEZONES.some((z) => z.value === value);
}

/** Ensure a zone is selectable — inject browser zone if missing from the curated list. */
export function scheduleTimeZoneOptions(preferred?: string | null): { value: string; label: string }[] {
  const list = [...SCHEDULE_TIMEZONES];
  if (preferred && !isKnownScheduleTimeZone(preferred)) {
    list.unshift({ value: preferred, label: preferred.replace(/_/g, " ") });
  }
  return list;
}
