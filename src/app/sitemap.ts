import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

// Static, public marketing/auth routes. Individual shop pages are intentionally
// excluded — they are ephemeral (open/close on a schedule) and not durable SEO
// targets.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();
  const routes: { path: string; priority: number; changeFrequency: "daily" | "monthly" }[] = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/login", priority: 0.4, changeFrequency: "monthly" },
    { path: "/signup", priority: 0.6, changeFrequency: "monthly" },
    { path: "/legal/terms", priority: 0.3, changeFrequency: "monthly" },
    { path: "/legal/privacy", priority: 0.3, changeFrequency: "monthly" },
  ];
  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
