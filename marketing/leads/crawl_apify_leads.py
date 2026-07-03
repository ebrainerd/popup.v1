#!/usr/bin/env python3
"""Snowball-crawl Instagram creator leads using the Apify profile scraper.

Same qualification logic as crawl_instagram_leads.py (10k-50k followers,
physical-product seller, shop link in bio, US-based, active), but profile
data comes from Apify's `apify/instagram-profile-scraper` actor in batches,
which avoids the IP rate limits that stall anonymous scraping. Requires the
APIFY_KEY env var (Cursor Dashboard > Cloud Agents > Secrets).

Bonus over the anonymous endpoint: Apify returns Instagram's "About this
account" country, which is authoritative for the US-only filter.

Resumable: checkpoints to apify_state.json / apify_profiles.jsonl.
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from collections import deque

import crawl_instagram_leads as base

BASE = os.path.dirname(os.path.abspath(__file__))
STATE_PATH = os.path.join(BASE, "apify_state.json")
PROFILES_PATH = os.path.join(BASE, "apify_profiles.jsonl")

APIFY_KEY = os.environ.get("APIFY_KEY") or os.environ.get("APIFY_TOKEN")
ACTOR = "apify~instagram-profile-scraper"
API = "https://api.apify.com/v2"

TARGET_QUALIFIED = int(os.environ.get("TARGET_QUALIFIED", "130"))
MAX_PROFILES = int(os.environ.get("MAX_PROFILES", "4000"))
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "100"))

SEEDS = ["seedbeadbliss", "karolinaskrafts", "s2heartbunny", "nixinjewelry"]


def api(method, path, body=None, params=None):
    url = f"{API}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {APIFY_KEY}")
    data = None
    if body is not None:
        req.add_header("Content-Type", "application/json")
        data = json.dumps(body).encode()
    with urllib.request.urlopen(req, data, timeout=60) as resp:
        return json.loads(resp.read().decode())


def scrape_batch(usernames):
    """Run the profile scraper actor on a batch and return dataset items."""
    run = api("POST", f"/acts/{ACTOR}/runs",
              body={"usernames": usernames})["data"]
    run_id = run["id"]
    deadline = time.time() + 900
    while time.time() < deadline:
        time.sleep(10)
        status = api("GET", f"/actor-runs/{run_id}")["data"]["status"]
        if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            break
    if status != "SUCCEEDED":
        raise RuntimeError(f"actor run {run_id} ended with status {status}")
    dataset_id = run["defaultDatasetId"]
    items, offset = [], 0
    while True:
        page = api("GET", f"/datasets/{dataset_id}/items",
                   params={"offset": offset, "limit": 500, "clean": "true"})
        if not page:
            break
        items.extend(page)
        if len(page) < 500:
            break
        offset += len(page)
    return items


def to_graphql(item):
    """Adapt an Apify profile item to the dict shape base.evaluate expects."""
    posts = []
    for p in item.get("latestPosts") or []:
        ts = p.get("timestamp")
        epoch = 0
        if ts:
            try:
                epoch = int(time.mktime(time.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S")))
            except ValueError:
                pass
        posts.append({"node": {
            "edge_liked_by": {"count": p.get("likesCount", -1) or -1},
            "edge_media_to_comment": {"count": p.get("commentsCount", 0) or 0},
            "taken_at_timestamp": epoch,
        }})
    return {
        "username": item.get("username"),
        "full_name": item.get("fullName"),
        "biography": item.get("biography") or "",
        "external_url": item.get("externalUrl"),
        "bio_links": [{"url": u.get("url")} for u in (item.get("externalUrls") or [])],
        "category_name": item.get("businessCategoryName"),
        "is_private": item.get("private", False),
        "is_business_account": item.get("isBusinessAccount", False),
        "edge_followed_by": {"count": item.get("followersCount", 0) or 0},
        "edge_follow": {"count": item.get("followsCount", 0) or 0},
        "edge_owner_to_timeline_media": {
            "count": item.get("postsCount", 0) or 0,
            "edges": posts,
        },
        "edge_related_profiles": {"edges": [
            {"node": {"username": r.get("username")}}
            for r in (item.get("relatedProfiles") or []) if r.get("username")
        ]},
        "business_address_json": item.get("businessAddress"),
    }


def load_state():
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH) as f:
            s = json.load(f)
        return (deque(s["queue_hi"]), deque(s["queue_lo"]), set(s["seen"]),
                s["profiles"], s["qualified"])
    # bootstrap from the anonymous crawl's frontier if available
    queue_hi, queue_lo, seen = deque(SEEDS), deque(), set(SEEDS)
    old = os.path.join(BASE, "state.json")
    if os.path.exists(old):
        with open(old) as f:
            s = json.load(f)
        for u in s["queue_hi"]:
            if u not in seen:
                seen.add(u)
                queue_hi.append(u)
        for u in s["queue_lo"]:
            if u not in seen:
                seen.add(u)
                queue_lo.append(u)
        print(f"bootstrapped frontier from anonymous crawl: "
              f"hi={len(queue_hi)} lo={len(queue_lo)}", flush=True)
    return queue_hi, queue_lo, set(seen), 0, 0


def save_state(queue_hi, queue_lo, seen, profiles, qualified):
    tmp = STATE_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"queue_hi": list(queue_hi), "queue_lo": list(queue_lo),
                   "seen": list(seen), "profiles": profiles,
                   "qualified": qualified}, f)
    os.replace(tmp, STATE_PATH)


def main():
    if not APIFY_KEY:
        sys.exit("APIFY_KEY env var is not set")
    queue_hi, queue_lo, seen, profiles, qualified = load_state()
    out = open(PROFILES_PATH, "a")
    print(f"start: profiles={profiles} qualified(US)={qualified} "
          f"hi={len(queue_hi)} lo={len(queue_lo)}", flush=True)

    while (queue_hi or queue_lo) and qualified < TARGET_QUALIFIED and profiles < MAX_PROFILES:
        batch = []
        while (queue_hi or queue_lo) and len(batch) < BATCH_SIZE:
            batch.append(queue_hi.popleft() if queue_hi else queue_lo.popleft())
        try:
            items = scrape_batch(batch)
        except Exception as e:  # noqa: BLE001
            print(f"[err] batch failed: {e}; retrying once in 60s", flush=True)
            time.sleep(60)
            items = scrape_batch(batch)

        profiles += len(items)
        for item in items:
            if item.get("error") or not item.get("username"):
                continue
            user = to_graphql(item)
            ok, row, prio = base.evaluate(user)

            # authoritative country from "About this account" when present
            country = (item.get("about") or {}).get("country")
            if row is not None and country:
                if country == "United States":
                    if row["us_status"] != "US":
                        row["us_status"] = "US"
                        row["us_evidence"] = "IG about-page country: United States"
                        row["fit_score"] += 2
                    else:
                        row["us_evidence"] += "; IG about: United States"
                else:
                    ok, row = False, None  # confirmed non-US

            if ok and row:
                if row["us_status"] == "US":
                    qualified += 1
                out.write(json.dumps(row, ensure_ascii=False) + "\n")
                out.flush()

            for e in user["edge_related_profiles"]["edges"]:
                r = e["node"]["username"]
                if r not in seen:
                    seen.add(r)
                    (queue_hi if prio >= 2 else queue_lo).append(r)

        save_state(queue_hi, queue_lo, seen, profiles, qualified)
        print(f"profiles={profiles} qualified(US)={qualified} "
              f"hi={len(queue_hi)} lo={len(queue_lo)}", flush=True)

    out.close()
    print(f"DONE profiles={profiles} qualified(US)={qualified}", flush=True)


if __name__ == "__main__":
    main()
