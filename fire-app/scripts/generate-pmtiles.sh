#!/usr/bin/env bash
# Converts per-year fire scar GeoJSON files to PMTiles vector tiles using tippecanoe (via Docker).
# Usage: bash scripts/generate-pmtiles.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")/../public/data/fire-scars" && pwd)"
COUNT=0

for f in "$DIR"/[0-9][0-9][0-9][0-9].json; do
  year=$(basename "$f" .json)
  echo "Converting $year.json → $year.pmtiles"
  MSYS_NO_PATHCONV=1 docker run --rm -v "$DIR:/data" indigoag/tippecanoe:latest \
    tippecanoe \
      -o "/data/${year}.pmtiles" \
      -l fire_scars \
      --minimum-zoom=5 \
      --maximum-zoom=12 \
      --simplification=4 \
      --detect-shared-borders \
      --no-tile-size-limit \
      --force \
      "/data/${year}.json"
  COUNT=$((COUNT + 1))
done

echo "Done. Generated $COUNT PMTiles files."
