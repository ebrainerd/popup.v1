import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

/**
 * Dev / exploration gallery for painterly rebrand samples.
 * Hidden in production builds so sample art does not become a public surface.
 */
const SAMPLES = [
  {
    src: "/rebrand-samples/popup-hero-dusk-park-market.webp",
    title: "Dusk Park Market",
    lane: "Recommended default",
    note: "Open sky for white type; temporary stalls in the lower third.",
  },
  {
    src: "/rebrand-samples/popup-hero-sunset-coast-market.webp",
    title: "Sunset Coast Market",
    lane: "Premium / calm",
    note: "Indigo-to-orange sky; white tents as soft product metaphor.",
  },
  {
    src: "/rebrand-samples/popup-hero-bright-hills-fair.webp",
    title: "Bright Hills Fair",
    lane: "High-key / light mode",
    note: "Cerulean sky for dark type; valley fair as community drop.",
  },
  {
    src: "/rebrand-samples/popup-hero-rooftop-blue-hour.webp",
    title: "Rooftop Blue Hour",
    lane: "Bridge from v3 night market",
    note: "Warm lanterns + coral/teal awnings over a city dusk.",
  },
] as const;

export const metadata = {
  title: "Rebrand samples (exploration)",
  robots: { index: false, follow: false },
};

export default function RebrandSamplesPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          Home
        </Link>
        {" / "}
        Exploration
      </p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Painterly rebrand samples
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Full-bleed landscape concepts for a PopUp marketing hero. Direction
        notes live in{" "}
        <code className="text-sm">docs/rebrand-exploration/PAINTERLY_DIRECTION.md</code>.
        This route is disabled in production.
      </p>

      <ul className="mt-12 space-y-14">
        {SAMPLES.map((sample) => (
          <li key={sample.src}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-xl font-bold tracking-tight">{sample.title}</h2>
              <span className="text-sm text-muted-foreground">{sample.lane}</span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{sample.note}</p>
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl ring-1 ring-border">
              <Image
                src={sample.src}
                alt={sample.title}
                fill
                sizes="(min-width: 1024px) 64rem, 100vw"
                className="object-cover"
              />
            </div>
            {/* Mock hero overlay to judge type placement */}
            <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl ring-1 ring-border">
              <Image
                src={sample.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 64rem, 100vw"
                className="object-cover"
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/45" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
                <p className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                  Pop up. Sell out.
                </p>
                <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">
                  Timed shops, live drops, checkout in one link.
                </p>
                <span className="mt-6 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900">
                  Create shop
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
