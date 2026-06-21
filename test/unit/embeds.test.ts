import { describe, it, expect } from "vitest";
import { parseLiveEmbed } from "@/lib/embeds";

describe("parseLiveEmbed", () => {
  it("returns null for empty/invalid input", () => {
    expect(parseLiveEmbed(null)).toBeNull();
    expect(parseLiveEmbed(undefined)).toBeNull();
    expect(parseLiveEmbed("not a url")).toBeNull();
  });

  it("parses YouTube watch URLs", () => {
    const e = parseLiveEmbed("https://www.youtube.com/watch?v=abc123");
    expect(e).toEqual({ embeddable: true, kind: "youtube", src: "https://www.youtube.com/embed/abc123" });
  });

  it("parses youtu.be short URLs", () => {
    const e = parseLiveEmbed("https://youtu.be/xyz789");
    expect(e).toMatchObject({ embeddable: true, kind: "youtube", src: "https://www.youtube.com/embed/xyz789" });
  });

  it("parses YouTube /live/ URLs", () => {
    const e = parseLiveEmbed("https://www.youtube.com/live/live123");
    expect(e).toMatchObject({ kind: "youtube", src: "https://www.youtube.com/embed/live123" });
  });

  it("embeds a YouTube channel live URL", () => {
    const e = parseLiveEmbed("https://www.youtube.com/channel/UC123abc/live");
    expect(e).toMatchObject({
      embeddable: true,
      kind: "youtube",
      src: "https://www.youtube.com/embed/live_stream?channel=UC123abc",
    });
  });

  it("falls back to an external watch link for @handle/live URLs", () => {
    const e = parseLiveEmbed("https://www.youtube.com/@somecreator/live");
    expect(e).toMatchObject({ embeddable: false, kind: "external" });
  });

  it("parses Twitch channel URLs with parent", () => {
    const e = parseLiveEmbed("https://twitch.tv/somechannel", "popup.app");
    expect(e).toEqual({
      embeddable: true,
      kind: "twitch",
      src: "https://player.twitch.tv/?channel=somechannel&parent=popup.app",
    });
  });

  it("treats Instagram as non-embeddable external link", () => {
    const e = parseLiveEmbed("https://instagram.com/p/abc");
    expect(e).toMatchObject({ embeddable: false, kind: "instagram" });
  });

  it("treats unknown hosts as external", () => {
    const e = parseLiveEmbed("https://example.com/stream");
    expect(e).toMatchObject({ embeddable: false, kind: "external", href: "https://example.com/stream" });
  });
});
