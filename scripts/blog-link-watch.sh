#!/bin/bash
# Keep linking Naver blogs until every place has a real blog source.
set -u
cd "$(dirname "$0")/.."
LOG="${LOG:-/tmp/blog-link.log}"
echo "===== watch start $(date) =====" >> "$LOG"

remaining() {
  python3 - <<'PY'
import json
from pathlib import Path
places={p["id"] for p in json.loads(Path("data/places.json").read_text())}
sources={s["id"]:s for s in json.loads(Path("data/sources.json").read_text())}
links=json.loads(Path("data/place_sources.json").read_text())
done=set()
for l in links:
  s=sources.get(l["source_id"])
  if s and s.get("provider") in ("naver_blog","tistory"):
    done.add(l["place_id"])
print(len(places - done))
PY
}

while true; do
  left="$(remaining)"
  echo "[watch] remaining=${left} $(date)" >> "$LOG"
  if [[ "$left" == "0" ]]; then
    echo "[watch] DONE $(date)" >> "$LOG"
    exit 0
  fi
  yarn blog:link >> "$LOG" 2>&1
  code=$?
  echo "[watch] yarn exit=${code} $(date)" >> "$LOG"
  sleep 3
done
