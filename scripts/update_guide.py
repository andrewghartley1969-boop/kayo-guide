"""Fetch 3 days of listings for the Kayo channels from yourTV and write guide.json."""
import json, urllib.request, datetime, zoneinfo, concurrent.futures, sys, time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15"
API = "https://www.yourtv.com.au/api"
TZ = zoneinfo.ZoneInfo("Australia/Melbourne")
# (display name, number shown, yourTV region, yourTV channel name)
CHANNELS = [
    ("Fox Sports News", "500", 168, "FOX SPORTS News HD"),
    ("Fox Cricket", "501", 168, "FOX Cricket HD"),
    ("Fox League", "502", 168, "FOX League HD"),
    ("Fox Sports 503", "503", 168, "FOX SPORTS 503 HD"),
    ("Fox Footy", "504", 168, "FOX FOOTY HD"),
    ("Fox Sports 505", "505", 168, "FOX SPORTS 505 HD"),
    ("Fox Sports 506", "506", 168, "FOX SPORTS 506 HD"),
    ("Fox Sports 507", "507", 168, "FOX SPORTS 507 HD"),
    ("ESPN", "509", 168, "ESPN HD"),
    ("ESPN2", "510", 168, "ESPN2HD"),
    ("Racing.com", "529", 94, "RACING.COM"),
]

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(2 + 3 * i)

def day_params():
    today = datetime.datetime.now(TZ).date()
    names = ["today", "tomorrow"]
    names.append(["mon", "tue", "wed", "thu", "fri", "sat", "sun"][(today + datetime.timedelta(days=2)).weekday()])
    return names

def main():
    airing_ids = {}  # channel index -> set of ids
    for day in day_params():
        for region in sorted({c[2] for c in CHANNELS}):
            data = get(f"{API}/guide/?day={day}&timezone=Australia%2FMelbourne&format=json&region={region}")
            by_name = {}
            for g in data:
                for ch in g["channels"]:
                    by_name.setdefault(ch["name"].strip().upper(), ch)
            for i, (_, _, reg, yname) in enumerate(CHANNELS):
                if reg != region:
                    continue
                ch = by_name.get(yname.upper())
                if not ch:
                    print(f"warning: {yname} not found in region {region} ({day})", file=sys.stderr)
                    continue
                for b in ch["blocks"]:
                    for s in b["shows"]:
                        airing_ids.setdefault(i, set()).add(s["id"])
    all_ids = sorted({a for s in airing_ids.values() for a in s})
    details = {}
    def fetch(a):
        try:
            return a, get(f"{API}/airings/{a}")
        except Exception as e:
            print(f"warning: airing {a}: {e}", file=sys.stderr)
            return a, None
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        for a, d in ex.map(fetch, all_ids):
            if d:
                details[a] = d
    out = []
    total = 0
    for i, (name, num, _, _) in enumerate(CHANNELS):
        progs = []
        for a in airing_ids.get(i, ()):
            d = details.get(a)
            if not d or not d.get("date"):
                continue
            start = datetime.datetime.fromisoformat(d["date"].replace("Z", "+00:00"))
            secs = d.get("realtimeDurationSeconds") or (d.get("duration") or 30) * 60
            s = int(start.timestamp() // 60)
            e = s + max(1, round(secs / 60))
            title = (d.get("title") or "").strip()
            ep = (d.get("episodeTitle") or "").strip()
            if ep and ep.lower() != title.lower():
                progs.append([s, e, ep, title])
            else:
                progs.append([s, e, title, ""])
        progs.sort()
        clean = []
        for p in progs:
            if clean and p[0] == clean[-1][0]:
                continue
            if clean and clean[-1][1] > p[0]:
                clean[-1][1] = p[0]
            clean.append(p)
        total += len(clean)
        out.append({"name": name, "num": num, "p": clean})
    if total < 100:
        sys.exit(f"only {total} programmes found; not overwriting guide.json")
    now = datetime.datetime.now(TZ).replace(microsecond=0)
    json.dump({"updated": now.isoformat(), "source": "yourTV", "channels": out},
              open("guide.json", "w"), separators=(",", ":"), ensure_ascii=False)
    print(f"wrote guide.json: {total} programmes")

if __name__ == "__main__":
    main()
