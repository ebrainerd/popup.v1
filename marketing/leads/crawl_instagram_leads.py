#!/usr/bin/env python3
"""Snowball-crawl Instagram related profiles from seed accounts and qualify
leads for PopUp (popupdrop.co) creator outreach.

Uses Instagram's anonymous web profile endpoint. Crawl starts from known-good
seed sellers; each profile response includes ~30 related profiles which are
queued for evaluation (profiles related to QUALIFIED sellers are explored with
higher priority, keeping the crawl inside the handmade-seller niche).

Qualification criteria (from product owner):
  - 10k-50k followers
  - sells physical products aimed at followers (bio/link keyword heuristics)
  - has a shop link in bio
  - based in the US (bio location evidence; foreign signals hard-excluded)
  - public account, recently active

Resumable: state is checkpointed to state.json / profiles.jsonl.
"""

import json
import os
import random
import re
import signal
import subprocess
import time
import urllib.parse
from collections import deque

BASE = os.path.dirname(os.path.abspath(__file__))
STATE_PATH = os.path.join(BASE, "state.json")
PROFILES_PATH = os.path.join(BASE, "profiles.jsonl")

# Target counts US-confirmed leads only; 'unknown' rows are kept as backups.
TARGET_QUALIFIED = int(os.environ.get("TARGET_QUALIFIED", "130"))
MAX_FETCHES = int(os.environ.get("MAX_FETCHES", "4000"))
DELAY_RANGE = (8.0, 13.0)
REST_EVERY = 40          # take a longer pause every N fetches
REST_RANGE = (60, 150)
COOLDOWN_SECONDS = 600   # sleep between canary probes while IP-blocked
CANARY = "instagram"

SEEDS = ["seedbeadbliss", "karolinaskrafts", "s2heartbunny", "nixinjewelry"]

ENDPOINT = "https://i.instagram.com/api/v1/users/web_profile_info/?username={u}"
HEADERS = {
    "x-ig-app-id": "936619743392459",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
}

# --- qualification heuristics ---------------------------------------------

PRODUCT_KEYWORDS = {
    # craft/product types
    "jewelry": "jewelry", "jewellery": "jewelry", "earring": "jewelry",
    "necklace": "jewelry", "bracelet": "jewelry", "beaded": "beadwork",
    "bead": "beadwork", "seed bead": "beadwork", "miyuki": "beadwork",
    "crochet": "crochet", "amigurumi": "crochet", "knit": "knitting",
    "plush": "plushies", "plushie": "plushies",
    "polymer clay": "polymer clay", "clay charm": "polymer clay",
    "ceramic": "ceramics", "pottery": "ceramics",
    "candle": "candles", "soap": "soap/bath", "bath bomb": "soap/bath",
    "sticker": "stickers", "stationery": "stationery", "washi": "stationery",
    "pin": "enamel pins", "enamel pin": "enamel pins", "keychain": "keychains",
    "charm": "charms", "resin": "resin art",
    "print": "art prints", "art print": "art prints", "illustration": "illustration",
    "embroider": "embroidery", "cross stitch": "embroidery",
    "quilt": "quilting", "sew": "sewing", "handbag": "bags", "tote": "bags",
    "leather": "leather goods", "woodwork": "woodworking", "wood": "woodworking",
    "glass": "glass art", "suncatcher": "suncatchers",
    "tuft": "rug tufting", "rug": "rug tufting",
    "planner": "planners", "journal": "journals", "scrapbook": "papercraft",
    "papercraft": "papercraft", "mini album": "papercraft", "card making": "papercraft",
    "wax melt": "candles", "perfume": "fragrance", "skincare": "skincare",
    "apparel": "apparel", "tee": "apparel", "hoodie": "apparel",
    "hat": "apparel", "beanie": "apparel", "scrunchie": "accessories",
    "hair clip": "accessories", "hair bow": "accessories", "bow": "accessories",
    "pottery wheel": "ceramics", "macrame": "macrame", "wreath": "home decor",
    "home decor": "home decor", "mug": "ceramics", "tumbler": "tumblers",
    "crystal": "crystals", "gemstone": "jewelry", "opal": "jewelry",
    "wire wrap": "jewelry", "silversmith": "jewelry", "goldsmith": "jewelry",
    "lampwork": "glass art", "figurine": "figurines", "doll": "dolls",
    "miniature": "miniatures", "terrarium": "plants/terrariums",
    "soy candle": "candles", "art doll": "dolls", "needle felt": "felting",
    "felted": "felting", "punch needle": "punch needle",
    "bookbinding": "bookbinding", "vinyl": "stickers",
    "pet portrait": "custom art", "commission": "custom art",
    "3d print": "3d printing", "cosplay": "cosplay props",
}

SELLER_KEYWORDS = [
    "shop", "store", "etsy", "small business", "small biz", "handmade",
    "order", "buy", "sale", "drop", "restock", "sold out", "made to order",
    "ships", "shipping", "free shipping", "link below", "shop below",
    "shop my", "new arrivals", "custom orders", "commissions open",
    "market", "craft fair", "boutique", "maker", "artisan",
]

DIGITAL_ONLY_KEYWORDS = [
    "digital download", "printable", "svg", "preset", "lightroom",
    "ebook", "e-book", "online course", "masterclass", "coaching",
    "1:1 coaching", "mentorship", "webinar", "digital planner", "procreate brush",
]

SERVICE_KEYWORDS = [
    "tattoo", "salon", "photographer for hire", "book your", "booking",
    "appointments", "nail tech", "lash tech", "hair stylist",
]

SHOP_DOMAINS = {
    "etsy.com": "Etsy", "etsy.me": "Etsy",
    "shopify.com": "Shopify", "myshopify.com": "Shopify",
    "bigcartel.com": "Big Cartel", "squarespace.com": "Squarespace",
    "square.site": "Square", "shop.app": "Shop app",
    "amazon.com": "Amazon Handmade", "faire.com": "Faire",
    "shopmy.us": "ShopMy", "goimagine.com": "GoImagine",
    "wixsite.com": "Wix", "storenvy.com": "Storenvy",
    "threadless.com": "Threadless", "redbubble.com": "Redbubble",
    "society6.com": "Society6", "michaels.com": "Michaels MakerPlace",
    "whatnot.com": "Whatnot", "depop.com": "Depop", "poshmark.com": "Poshmark",
    "gumroad.com": "Gumroad", "ko-fi.com": "Ko-fi",
    "inprnt.com": "INPRNT", "fourthwall.com": "Fourthwall",
    "teespring.com": "Spring", "bonfire.com": "Bonfire",
    "spoonflower.com": "Spoonflower", "bigcommerce.com": "BigCommerce",
    "ecwid.com": "Ecwid", "weebly.com": "Weebly",
}

# never probe these as potential storefronts
PROBE_EXCLUDE = (
    "youtube.com", "youtu.be", "facebook.com", "fb.com", "tiktok.com",
    "twitter.com", "x.com", "pinterest.com", "twitch.tv", "discord.gg",
    "discord.com", "spotify.com", "threads.net", "instagram.com",
    "patreon.com", "onlyfans.com", "cash.app", "paypal.me", "paypal.com",
    "venmo.com", "sjv.io", "pxf.io", "linksynergy.com", "shareasale.com",
    "awin1.com", "amzn.to", "amazon.com", "bit.ly", "mailchi.mp",
    "substack.com", "eepurl.com", "forms.gle", "docs.google.com",
    "linktr.ee", "beacons.ai", "carrd.co", "wk5q.net", "apple.com",
    "spotify.link", "open.spotify.com", "podcasts.apple.com", "email.com",
    "shopltk.com", "liketk.it", "magic.ly", "howl.me", "genius.gg",
    "gstatic.com", "google.com", "googleapis.com", "datagrail.io",
    "linktree.com", "cloudfront.net", "jsdelivr.net", "unpkg.com",
    "sentry.io", "typeform.com", "calendly.com", "vimeo.com", "w3.org",
)
LINK_HUB_DOMAINS = {
    "linktr.ee": "Linktree", "beacons.ai": "Beacons", "carrd.co": "Carrd",
    "carrd.com": "Carrd", "linkin.bio": "Linkin.bio", "milkshake.app": "Milkshake",
    "stan.store": "Stan", "bio.site": "Bio Site", "lnk.bio": "Lnk.Bio",
    "solo.to": "Solo.to", "campsite.bio": "Campsite", "tap.bio": "Tap.bio",
    "direct.me": "Direct.me", "hoo.be": "Hoo.be", "linkpop.com": "Linkpop",
    "komi.io": "Komi", "snipfeed.co": "Snipfeed", "withkoji.com": "Koji",
    "flow.page": "Flowpage", "allmylinks.com": "AllMyLinks", "later.bio": "Later",
    "pillar.io": "Pillar", "liinks.co": "Liinks",
}

# domains that never count as a "shop link"
NON_SHOP_DOMAINS = (
    "youtube.com", "youtu.be", "facebook.com", "fb.com", "tiktok.com",
    "twitter.com", "x.com", "pinterest.com", "twitch.tv", "discord.gg",
    "discord.com", "spotify.com", "threads.net", "instagram.com",
    "onlyfans.com", "fanhouse.app", "cash.app", "paypal.me", "venmo.com",
)

EN_STOPWORDS = {
    "the", "and", "for", "with", "your", "you", "shop", "handmade", "made",
    "my", "to", "of", "in", "all", "by", "on", "free", "shipping", "order",
    "orders", "custom", "new", "small", "business", "jewelry", "us", "we",
    "love", "art", "artist", "maker", "designs", "link", "below", "here",
}
NON_EN_STOPWORDS = {
    # es/pt/fr/de/it/tr/id common words
    "el", "la", "los", "las", "de", "del", "para", "por", "con", "envíos",
    "envios", "compra", "hecho", "mano", "joyería", "joyeria", "tienda",
    "pedidos", "aquí", "aqui", "toda", "todo", "somos",
    "o", "os", "das", "dos", "loja", "feito", "à", "não", "nao", "frete",
    "le", "les", "des", "et", "pour", "avec", "fait", "boutique", "livraison",
    "und", "der", "die", "das", "für", "mit", "aus", "wir", "ich",
    "di", "il", "per", "fatto", "spedizione", "negozio",
    "ve", "için", "icin", "takı", "taki", "el yapımı", "kargo", "sipariş",
    "siparis", "bilgi", "ürün", "urun", "tasarım", "tasarim", "dm'den",
    "dan", "dari", "untuk", "dengan", "yang",
}
TURKISH_CHARS = set("ğışİĞŞ")


def looks_english(bio_l):
    words = set(re.findall(r"[a-zA-ZÀ-ÿğışİĞŞçöüÇÖÜ']+", bio_l))
    if TURKISH_CHARS & set(bio_l):
        return False
    en = len(words & EN_STOPWORDS)
    other = len(words & NON_EN_STOPWORDS)
    return en >= other


# --- US location heuristics -------------------------------------------------

US_STATES = [
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
    "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
    "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
    "maine", "maryland", "massachusetts", "michigan", "minnesota",
    "mississippi", "missouri", "montana", "nebraska", "nevada",
    "new hampshire", "new jersey", "new mexico", "new york",
    "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
    "pennsylvania", "rhode island", "south carolina", "south dakota",
    "tennessee", "texas", "utah", "vermont", "virginia", "washington",
    "west virginia", "wisconsin", "wyoming",
]
US_CITIES = [
    "nyc", "new york city", "los angeles", "chicago", "houston", "austin",
    "seattle", "portland", "denver", "atlanta", "dallas", "san diego",
    "san francisco", "bay area", "brooklyn", "nashville", "phoenix",
    "philadelphia", "boston", "minneapolis", "miami", "orlando", "tampa",
    "charlotte", "columbus", "indianapolis", "detroit", "kansas city",
    "las vegas", "baltimore", "milwaukee", "albuquerque", "tucson",
    "sacramento", "pittsburgh", "cincinnati", "st. louis", "st louis",
    "salt lake city", "new orleans", "raleigh", "richmond", "louisville",
    "oklahoma city", "memphis", "el paso", "fort worth", "tulsa", "omaha",
    "boise", "anchorage", "honolulu", "savannah", "asheville", "charleston",
    "san antonio", "san jose", "long beach", "colorado springs",
]
US_REGION_WORDS = [
    "usa", "u.s.a", "u.s.", "united states", "made in the us", "made in usa",
    "made in the usa", "us shipping", "free us shipping", "us only",
    "ships from the us", "ships from usa", "american made",
    "pnw", "midwest", "socal", "norcal", "new england", "made in la",
    "made in nyc", "veteran owned",
]
# "city, ST" two-letter state pattern (bio is lowercased before matching)
US_CITY_ST_RE = re.compile(
    r"[a-z][a-z .]{2,},\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|ia|id|il|ks|"
    r"ky|la|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|pa|ri|sc|"
    r"sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b"
)

FOREIGN_WORDS = [
    "australia", "australian", "sydney", "melbourne", "brisbane", "perth",
    " uk ", "united kingdom", "britain", "british", "london", "england",
    "scotland", "wales", "ireland", "irish", "dublin",
    "canada", "canadian", "toronto", "vancouver", "montreal", "ontario",
    "alberta", "quebec", "new zealand", " nz ", "auckland",
    "germany", "france", "italy", "spain", "netherlands", "poland",
    "sweden", "norway", "denmark", "finland", "portugal", "greece",
    "austria", "belgium", "switzerland", "turkey", "türkiye", "istanbul",
    "mexico", "brazil", "brasil", "argentina", "colombia", "chile", "peru",
    "india", "japan", "korea", "china", "philippines", "indonesia",
    "thailand", "vietnam", "malaysia", "singapore", "south africa",
    "worldwide shipping from", "eu shipping", "ships from europe",
]
FOREIGN_CURRENCY = ["£", "€", "₺", "₹", "₩", "¥", " aud", " cad", " gbp", " nzd", "$aud", "$cad", "$nzd"]
FOREIGN_TLDS = (
    ".co.uk", ".uk/", ".com.au", ".net.au", ".ca/", ".de/", ".fr/", ".nl/",
    ".co.nz", ".ie/", ".com.tr", ".com.mx", ".com.br", ".in/", ".jp/",
    ".eu/", ".es/", ".it/", ".pl/", ".se/", ".ch/", ".at/", ".be/", ".dk/",
)
FOREIGN_DOMAINS = ("shopier.com", "trendyol.com", "hepsiburada.com", "notonthehighstreet.com", "folksy.com")
US_FLAG = "\U0001f1fa\U0001f1f8"
FLAG_RE = re.compile("[\U0001f1e6-\U0001f1ff]{2}")


def us_location_check(bio, links, business_address):
    """Return (status, evidence). status in {'US', 'unknown', 'foreign'}."""
    bio_l = " " + bio.lower() + " "
    links_l = " ".join(links).lower() + "/"

    evidence = []
    if US_FLAG in bio:
        evidence.append("US flag in bio")
    for w in US_REGION_WORDS:
        if w.lower() in bio_l:
            evidence.append(f"'{w.strip()}'")
            break
    for s in US_STATES:
        if re.search(r"\b" + re.escape(s) + r"\b", bio_l):
            evidence.append(f"state: {s}")
            break
    for c in US_CITIES:
        if re.search(r"\b" + re.escape(c) + r"\b", bio_l):
            evidence.append(f"city: {c}")
            break
    m = US_CITY_ST_RE.search(bio_l)
    if m:
        evidence.append(f"city,ST: '{m.group(0).strip()}'")
    city = (business_address or {}).get("city_name")
    if city:
        evidence.append(f"business address: {city}")

    foreign = []
    other_flags = [f for f in FLAG_RE.findall(bio) if f != US_FLAG]
    if other_flags:
        foreign.append("non-US flag " + "".join(other_flags[:3]))
    for w in FOREIGN_WORDS:
        if w in bio_l:
            foreign.append(f"'{w.strip()}'")
            break
    for cur in FOREIGN_CURRENCY:
        if cur in bio_l:
            foreign.append(f"currency '{cur.strip()}'")
            break
    if any(t in links_l for t in FOREIGN_TLDS) or any(d in links_l for d in FOREIGN_DOMAINS):
        foreign.append("foreign shop domain")

    if evidence and not foreign:
        return "US", "; ".join(evidence[:3])
    # explicit "based in X" style US claim outranks material-origin mentions
    # (e.g. "Australian sourced ~ made in LA")
    strong_us = any(e.startswith(("city", "state", "business address")) or "made in" in e for e in evidence)
    if evidence and foreign and strong_us:
        return "US", "; ".join(evidence[:3]) + " (note: " + foreign[0] + ")"
    if foreign:
        return "foreign", "; ".join(foreign[:3])
    return "unknown", ""


GOOD_CATEGORIES = {
    "artist", "art", "arts & crafts store", "jewelry/watches",
    "jewelry & watches store", "shopping & retail", "product/service",
    "retail company", "clothing (brand)", "e-commerce website",
    "gift shop", "home decor", "design & fashion", "visual arts",
    "crafts", "small business", "entrepreneur", "brand",
}


def classify_link(url):
    if not url:
        return None, None
    try:
        host = urllib.parse.urlparse(url).netloc.lower()
    except ValueError:
        return None, None
    host = host[4:] if host.startswith("www.") else host
    for dom, name in SHOP_DOMAINS.items():
        if host == dom or host.endswith("." + dom):
            return "shop", name
    for dom, name in LINK_HUB_DOMAINS.items():
        if host == dom or host.endswith("." + dom):
            return "hub", name
    for dom in NON_SHOP_DOMAINS:
        if host == dom or host.endswith("." + dom):
            return "social", None
    return "own_site", host


URL_RE = re.compile(r"https?://[^\s\"'<>\\)]+")
_resolve_cache = {}


def _host(url):
    try:
        h = urllib.parse.urlparse(url).netloc.lower()
    except ValueError:
        return ""
    return h[4:] if h.startswith("www.") else h


def _host_matches(host, dom):
    return host == dom or host.endswith("." + dom)


def _fetch_html(url):
    try:
        res = subprocess.run(
            ["curl", "-sL", "-m", "20", "--max-filesize", "2000000",
             "-A", HEADERS["User-Agent"], url],
            capture_output=True, text=True, timeout=30, errors="replace",
        )
        if res.returncode == 0:
            return res.stdout[:1_500_000]
    except Exception:  # noqa: BLE001
        pass
    return ""


def _cart_signals(html_l):
    shopify = ("cdn.shopify.com" in html_l or "myshopify.com" in html_l
               or "shopify-features" in html_l or "shopify.theme" in html_l)
    cart = ("woocommerce" in html_l or "add to cart" in html_l
            or "add-to-cart" in html_l or "addtocart" in html_l
            or "squarespace-commerce" in html_l or "ecwid" in html_l
            or "bigcommerce" in html_l or "snipcart" in html_l
            or "product-grid" in html_l or "sqs-add-to-cart" in html_l)
    return shopify, cart


def _extract_page_links(html, page_url):
    """Outbound links from a hub page (handles Linktree NEXT_DATA JSON too)."""
    urls = []
    m = re.search(r'__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if m:
        try:
            data = json.loads(m.group(1))

            def walk(o):
                if isinstance(o, dict):
                    for k, v in o.items():
                        if k == "url" and isinstance(v, str) and v.startswith("http"):
                            urls.append(v)
                        else:
                            walk(v)
                elif isinstance(o, list):
                    for i in o:
                        walk(i)

            walk(data)
        except ValueError:
            pass
    urls += URL_RE.findall(html)

    page_host = _host(page_url)
    seen, out = set(), []
    for u in urls:
        u = u.strip().rstrip("/").split("#")[0]
        h = _host(u)
        if not h or h == page_host:
            continue
        if any(_host_matches(h, d) for d in PROBE_EXCLUDE):
            continue
        if re.search(r"\.(png|jpe?g|gif|webp|svg|woff2?|ttf|css|js|ico|mp4)$", u.lower()):
            continue
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def resolve_link(url, link_kind):
    """Find an actual storefront behind a bio link.

    Returns (platform, storefront_url) or (None, None).
    """
    key = (url, link_kind)
    if key in _resolve_cache:
        return _resolve_cache[key]
    platform, store = None, None

    html = _fetch_html(url)
    if html:
        html_l = html.lower()
        if link_kind == "own_site":
            shopify, cart = _cart_signals(html_l)
            if shopify:
                platform, store = "Shopify (own domain)", url
            elif cart:
                platform, store = "Own site (cart detected)", url
        if store is None:
            candidates = _extract_page_links(html, url)
            # direct storefront links on the page
            for u in candidates:
                h = _host(u)
                for dom, name in SHOP_DOMAINS.items():
                    if _host_matches(h, dom):
                        platform, store = name, u.split("?")[0]
                        break
                if store:
                    break
            # otherwise probe up to 2 own-domain candidates for cart signals
            if store is None and link_kind == "hub":
                for u in candidates[:2]:
                    sub = _fetch_html(u).lower()
                    if not sub:
                        continue
                    shopify, cart = _cart_signals(sub)
                    if shopify:
                        platform, store = "Shopify (own domain)", u
                        break
                    if cart:
                        platform, store = "Own site (cart detected)", u
                        break

    _resolve_cache[key] = (platform, store)
    return platform, store


def latin_ratio(text):
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 1.0
    latin = sum(1 for c in letters if ("a" <= c.lower() <= "z") or c in "àáâãäåæçèéêëìíîïñòóôõöùúûüýÿ")
    return latin / len(letters)


def evaluate(user):
    """Return (qualified: bool, row: dict|None, expand_priority: int)."""
    followers = user.get("edge_followed_by", {}).get("count", 0)
    bio = user.get("biography") or ""
    bio_l = bio.lower()
    ext_url = user.get("external_url") or ""
    bio_links = [l.get("url") for l in (user.get("bio_links") or []) if l.get("url")]
    all_links = [ext_url] + [u for u in bio_links if u and u != ext_url]
    all_links = [u for u in all_links if u]
    category = (user.get("category_name") or "").strip()
    posts = user.get("edge_owner_to_timeline_media", {}).get("count", 0)
    is_private = user.get("is_private", False)

    # niche + seller signals
    niches = []
    for kw, niche in PRODUCT_KEYWORDS.items():
        if kw in bio_l and niche not in niches:
            niches.append(niche)
    seller_hits = [kw for kw in SELLER_KEYWORDS if kw in bio_l]
    digital_hits = [kw for kw in DIGITAL_ONLY_KEYWORDS if kw in bio_l]
    service_hits = [kw for kw in SERVICE_KEYWORDS if kw in bio_l]

    link_kind, link_name, shop_url = (None, None, None)
    for u in all_links:
        k, n = classify_link(u)
        if k == "shop":
            link_kind, link_name, shop_url = k, n, u
            break
        if k and k != "social" and link_kind in (None, "social"):
            link_kind, link_name, shop_url = k, n, u
        elif k and not link_kind:
            link_kind, link_name = k, n
    link_l = " ".join(all_links).lower()
    link_shop_hint = any(w in link_l for w in ("etsy", "shop", "store"))

    cat_good = category.lower() in GOOD_CATEGORIES

    # For candidates in the follower band with a hub/own-site link, fetch the
    # page to find the actual storefront (verifies "sells physical products").
    store_platform, store_url = (link_name, shop_url) if link_kind == "shop" else (None, None)
    if (not is_private and 10_000 <= followers <= 50_000 and shop_url
            and link_kind in ("hub", "own_site") and store_url is None):
        store_platform, store_url = resolve_link(shop_url, link_kind)

    has_store = store_url is not None
    product_signal = bool(niches) or has_store or link_shop_hint
    seller_signal = bool(seller_hits) or has_store or cat_good

    # expansion priority: how "in-niche" this profile looks (regardless of size)
    expand_priority = 0
    if product_signal and seller_signal:
        expand_priority = 2
    elif product_signal or (seller_signal and all_links):
        expand_priority = 1

    # hard filters
    if is_private:
        return False, None, 0
    if not (10_000 <= followers <= 50_000):
        return False, None, expand_priority
    if not has_store:
        return False, None, expand_priority
    if not product_signal or not seller_signal:
        return False, None, expand_priority
    if digital_hits and not niches:
        return False, None, expand_priority
    if service_hits and not niches:
        return False, None, expand_priority
    if latin_ratio(bio) < 0.75 or not looks_english(bio_l):
        return False, None, expand_priority

    addr = user.get("business_address_json")
    if isinstance(addr, str):
        try:
            addr = json.loads(addr)
        except ValueError:
            addr = None
    us_status, us_evidence = us_location_check(bio, all_links, addr)
    if us_status == "foreign":
        return False, None, expand_priority
    if posts < 20:
        return False, None, expand_priority

    # engagement + recency from embedded recent posts
    edges = user.get("edge_owner_to_timeline_media", {}).get("edges", [])
    likes = [e["node"].get("edge_liked_by", {}).get("count", 0) for e in edges]
    likes = [x for x in likes if x >= 0]  # -1 means hidden like counts
    comments = [e["node"].get("edge_media_to_comment", {}).get("count", 0) for e in edges]
    timestamps = [e["node"].get("taken_at_timestamp", 0) for e in edges]
    avg_likes = round(sum(likes) / len(likes)) if likes else None
    avg_comments = round(sum(comments) / len(comments), 1) if comments else None
    days_since_post = None
    if timestamps:
        days_since_post = round((time.time() - max(timestamps)) / 86400)
        if days_since_post > 90:
            return False, None, expand_priority  # inactive

    eng_rate = None
    if avg_likes is not None and followers:
        eng_rate = round(100 * (avg_likes + (avg_comments or 0)) / followers, 2)

    score = 0
    score += 2 if us_status == "US" else 0
    score += 2 if link_kind == "shop" else 1
    score += min(len(niches), 2)
    score += 1 if cat_good else 0
    score += 1 if seller_hits else 0
    if eng_rate is not None:
        score += 2 if eng_rate >= 3 else (1 if eng_rate >= 1 else 0)
    if days_since_post is not None and days_since_post <= 14:
        score += 1

    row = {
        "username": user["username"],
        "profile_url": f"https://www.instagram.com/{user['username']}/",
        "full_name": (user.get("full_name") or "").strip(),
        "followers": followers,
        "niche": ", ".join(niches[:3]) if niches else (category or "handmade"),
        "bio_link": all_links[0],
        "shop_link": store_url,
        "shop_platform": store_platform or "",
        "us_status": us_status,
        "us_evidence": us_evidence,
        "category": category,
        "posts": posts,
        "avg_likes_recent": avg_likes,
        "avg_comments_recent": avg_comments,
        "engagement_rate_pct": eng_rate,
        "days_since_last_post": days_since_post,
        "fit_score": score,
        "bio": " / ".join(bio.split("\n"))[:220],
    }
    return True, row, 2


# --- crawl machinery --------------------------------------------------------

class FetchError(Exception):
    def __init__(self, code):
        super().__init__(f"HTTP {code}")
        self.code = code


def fetch_profile(username):
    # Instagram 429s Python's urllib TLS fingerprint but accepts curl's,
    # so shell out to curl.
    url = ENDPOINT.format(u=urllib.parse.quote(username))
    cmd = ["curl", "-s", "-m", "25", "-w", "\n%{http_code}"]
    for k, v in HEADERS.items():
        cmd += ["-H", f"{k}: {v}"]
    cmd.append(url)
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=40)
    body, _, code = res.stdout.rpartition("\n")
    code = int(code or 0)
    if code != 200:
        raise FetchError(code)
    return code, json.loads(body)


def cooldown():
    """IP got rate-limited: sleep, then probe a canary until it clears."""
    while True:
        print(f"[cooldown] sleeping {COOLDOWN_SECONDS}s", flush=True)
        time.sleep(COOLDOWN_SECONDS)
        try:
            fetch_profile(CANARY)
            print("[cooldown] canary ok, resuming", flush=True)
            return
        except Exception as e:  # noqa: BLE001
            print(f"[cooldown] canary still blocked: {e}", flush=True)


def load_state():
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH) as f:
            s = json.load(f)
        return (deque(s["queue_hi"]), deque(s["queue_lo"]), set(s["seen"]),
                s["fetches"], s["qualified"])
    return deque(SEEDS), deque(), set(SEEDS), 0, 0


def save_state(queue_hi, queue_lo, seen, fetches, qualified):
    tmp = STATE_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"queue_hi": list(queue_hi), "queue_lo": list(queue_lo),
                   "seen": list(seen), "fetches": fetches,
                   "qualified": qualified}, f)
    os.replace(tmp, STATE_PATH)


def main():
    queue_hi, queue_lo, seen, fetches, qualified = load_state()
    out = open(PROFILES_PATH, "a")
    attempts = {}
    consecutive_errors = 0
    stop = {"flag": False}
    signal.signal(signal.SIGTERM, lambda *a: stop.update(flag=True))

    print(f"resume: fetches={fetches} qualified={qualified} "
          f"queue_hi={len(queue_hi)} queue_lo={len(queue_lo)}", flush=True)

    while (queue_hi or queue_lo) and qualified < TARGET_QUALIFIED and fetches < MAX_FETCHES:
        if stop["flag"]:
            break
        from_hi = bool(queue_hi)
        username = queue_hi.popleft() if queue_hi else queue_lo.popleft()
        try:
            status, data = fetch_profile(username)
            consecutive_errors = 0
        except Exception as e:  # noqa: BLE001
            code = getattr(e, "code", None)
            consecutive_errors += 1
            attempts[username] = attempts.get(username, 0) + 1
            if code == 404:
                consecutive_errors = 0
                continue
            if attempts[username] >= 3:
                print(f"[skip] {username}: {code or e} "
                      f"x{attempts[username]}", flush=True)
            else:
                (queue_hi if from_hi else queue_lo).append(username)
                print(f"[retry-later] {username}: {code or e} "
                      f"(strike {consecutive_errors})", flush=True)
            if consecutive_errors >= 3 and code in (401, 429):
                save_state(queue_hi, queue_lo, seen, fetches, qualified)
                cooldown()
                consecutive_errors = 0
            else:
                time.sleep(20)
            continue

        fetches += 1
        user = (data.get("data") or {}).get("user")
        if not user:
            time.sleep(random.uniform(*DELAY_RANGE))
            continue

        ok, row, prio = evaluate(user)
        if ok:
            if row["us_status"] == "US":
                qualified += 1
            out.write(json.dumps(row, ensure_ascii=False) + "\n")
            out.flush()

        # queue related profiles; children of in-niche profiles go first
        related = [e["node"]["username"]
                   for e in user.get("edge_related_profiles", {}).get("edges", [])]
        for r in related:
            if r not in seen:
                seen.add(r)
                (queue_hi if prio >= 2 else queue_lo).append(r)

        if fetches % 25 == 0:
            save_state(queue_hi, queue_lo, seen, fetches, qualified)
            print(f"fetches={fetches} qualified={qualified} "
                  f"hi={len(queue_hi)} lo={len(queue_lo)} seen={len(seen)}", flush=True)

        if fetches % REST_EVERY == 0:
            time.sleep(random.uniform(*REST_RANGE))
        time.sleep(random.uniform(*DELAY_RANGE))

    save_state(queue_hi, queue_lo, seen, fetches, qualified)
    out.close()
    print(f"DONE fetches={fetches} qualified={qualified}", flush=True)


if __name__ == "__main__":
    main()
