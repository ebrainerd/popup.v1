/**
 * Convert a pasted YouTube or Twitch URL into an embeddable iframe src.
 * Instagram is intentionally not embeddable — callers should render a
 * "Watch on Instagram" external link instead.
 */
export type LiveEmbed =
  | { embeddable: true; kind: "youtube" | "twitch"; src: string }
  | { embeddable: false; kind: "instagram" | "external"; href: string }
  | null;

export function parseLiveEmbed(rawUrl: string | null | undefined, parentHost = "localhost"): LiveEmbed {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  // YouTube: watch?v=, youtu.be/, /live/, /embed/
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    let id: string | null = null;
    if (host === "youtu.be") {
      id = url.pathname.slice(1);
    } else if (url.pathname.startsWith("/watch")) {
      id = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/live/") || url.pathname.startsWith("/embed/")) {
      id = url.pathname.split("/")[2] ?? null;
    }
    if (id) {
      return { embeddable: true, kind: "youtube", src: `https://www.youtube.com/embed/${id}` };
    }
  }

  // Twitch: twitch.tv/<channel>
  if (host === "twitch.tv") {
    const channel = url.pathname.split("/").filter(Boolean)[0];
    if (channel) {
      return {
        embeddable: true,
        kind: "twitch",
        src: `https://player.twitch.tv/?channel=${channel}&parent=${parentHost}`,
      };
    }
  }

  if (host === "instagram.com") {
    return { embeddable: false, kind: "instagram", href: url.toString() };
  }

  return { embeddable: false, kind: "external", href: url.toString() };
}
