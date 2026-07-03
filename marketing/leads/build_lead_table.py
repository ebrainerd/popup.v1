#!/usr/bin/env python3
"""Build the final outreach table from crawled profiles.jsonl.

Ranks qualified leads (US-confirmed first, then by fit score and engagement)
and writes:
  - popup_creator_leads_top100.csv  (the outreach table)
  - popup_creator_leads_all.csv     (every qualified lead, for reference)
  - lead_table_preview.md           (markdown preview of the top rows)
"""

import csv
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
TOP_N = int(os.environ.get("TOP_N", "100"))

COLUMNS = [
    "rank", "username", "profile_url", "full_name", "followers", "niche",
    "shop_platform", "shop_link", "bio_link", "us_evidence",
    "engagement_rate_pct", "avg_likes_recent", "days_since_last_post",
    "posts", "fit_score", "bio",
]


def load_rows():
    rows, seen = [], set()
    with open(os.path.join(BASE, "profiles.jsonl")) as f:
        for line in f:
            r = json.loads(line)
            if r["username"] in seen:
                continue
            seen.add(r["username"])
            rows.append(r)
    return rows


def sort_key(r):
    return (
        0 if r["us_status"] == "US" else 1,
        -r["fit_score"],
        -(r["engagement_rate_pct"] or 0),
    )


def main():
    rows = sorted(load_rows(), key=sort_key)
    us_rows = [r for r in rows if r["us_status"] == "US"]
    top = us_rows[:TOP_N]
    if len(top) < TOP_N:
        print(f"WARNING: only {len(top)} US-confirmed rows; "
              f"topping up with best 'unknown' rows", file=sys.stderr)
        top += [r for r in rows if r["us_status"] == "unknown"][: TOP_N - len(top)]

    for i, r in enumerate(top, 1):
        r["rank"] = i

    def write_csv(path, data, with_rank):
        cols = COLUMNS if with_rank else [c for c in COLUMNS if c != "rank"]
        with open(path, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
            w.writeheader()
            for r in data:
                w.writerow(r)

    write_csv(os.path.join(BASE, "popup_creator_leads_top100.csv"), top, True)
    write_csv(os.path.join(BASE, "popup_creator_leads_all.csv"), rows, False)

    md = os.path.join(BASE, "lead_table_preview.md")
    with open(md, "w") as f:
        f.write("| # | Handle | Followers | Niche | Current shop | US evidence | Eng. % |\n")
        f.write("|---|--------|-----------|-------|--------------|-------------|--------|\n")
        for r in top:
            f.write(
                f"| {r['rank']} | [@{r['username']}]({r['profile_url']}) "
                f"| {r['followers']:,} | {r['niche']} "
                f"| [{r['shop_platform']}]({r['shop_link']}) "
                f"| {r['us_evidence']} | {r['engagement_rate_pct']} |\n"
            )

    print(f"total qualified: {len(rows)} (US-confirmed: {len(us_rows)})")
    print(f"wrote top {len(top)} to popup_creator_leads_top100.csv")


if __name__ == "__main__":
    main()
