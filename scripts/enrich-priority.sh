#!/bin/bash
# Priority enrichment loop:
#  1) KR visit-category empties (Naver blog)
#  2) KR visit-category thin refresh (1–2 blogs)
#  3) KR landmark-ish YouTube
set -u
cd "$(dirname "$0")/.."
LOG="${LOG:-/tmp/enrich-priority.log}"
VISIT="landmark,heritage,park,forest,beach,viewpoint,street,market"
YT_CATS="landmark,heritage,beach,park,forest,viewpoint"
BLOG_BUDGET="${BLOG_BUDGET:-20000}"
THIN_BUDGET="${THIN_BUDGET:-5000}"
YT_BUDGET="${YT_BUDGET:-100}"

echo "===== enrich-priority start $(date) =====" | tee -a "$LOG"

echo "[1/3] blog empty visit KR budget=$BLOG_BUDGET $(date)" | tee -a "$LOG"
yarn blog:link --empty-only --country KR --category "$VISIT" --budget "$BLOG_BUDGET" >> "$LOG" 2>&1
echo "[1/3] exit=$? $(date)" | tee -a "$LOG"

echo "[2/3] blog thin visit KR budget=$THIN_BUDGET $(date)" | tee -a "$LOG"
yarn blog:link --force --only-thin --country KR --category "$VISIT" --budget "$THIN_BUDGET" >> "$LOG" 2>&1
echo "[2/3] exit=$? $(date)" | tee -a "$LOG"

echo "[3/3] youtube visit KR budget=$YT_BUDGET $(date)" | tee -a "$LOG"
yarn youtube:link --empty-only --country KR --category "$YT_CATS" --budget "$YT_BUDGET" >> "$LOG" 2>&1
echo "[3/3] exit=$? $(date)" | tee -a "$LOG"

echo "===== enrich-priority DONE $(date) =====" | tee -a "$LOG"
