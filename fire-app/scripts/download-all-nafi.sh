#!/usr/bin/env bash
# Downloads all NAFI fire scar shapefiles (2000-2025) and extracts to local data folder.
# Usage: bash scripts/download-all-nafi.sh
set -euo pipefail

DATA_DIR="${FIRE_SCAR_DATA_DIR:-C:/Users/tobyw/OneDrive/GIS/Data/Fire Data/Fire scar Data}"
BASE_URL="https://www.firenorth.org.au/nafi3/downloads/firescars"
# Use Windows-compatible temp path (PowerShell can't access /tmp)
TEMP_DIR="$LOCALAPPDATA/Temp/nafi-download-$$"
mkdir -p "$TEMP_DIR"

mkdir -p "$DATA_DIR"

echo "Downloading NAFI fire scar shapefiles to: $DATA_DIR"
echo "Temp dir: $TEMP_DIR"
echo ""

for year in $(seq 2000 2025); do
  ZIP_NAME="${year} firescar shapefiles.zip"
  ENCODED_NAME="${year}%20firescar%20shapefiles.zip"
  URL="${BASE_URL}/${year}/${ENCODED_NAME}"
  ZIP_PATH="${TEMP_DIR}/${year}.zip"

  echo "[$year] Downloading..."
  if curl -sL -o "$ZIP_PATH" "$URL"; then
    echo "[$year] Extracting..."
    # Convert Git Bash paths to Windows paths for PowerShell
    WIN_ZIP=$(cygpath -w "$ZIP_PATH")
    WIN_DEST=$(cygpath -w "$DATA_DIR")
    powershell -NoProfile -ExecutionPolicy Bypass -Command \
      "Expand-Archive -LiteralPath '${WIN_ZIP}' -DestinationPath '${WIN_DEST}' -Force"
    echo "[$year] Done."
  else
    echo "[$year] FAILED to download."
  fi

  # Clean up zip to save disk space
  rm -f "$ZIP_PATH"
  echo ""
done

echo "All downloads complete. Files extracted to: $DATA_DIR"
echo "Cleaning up temp dir..."
rm -rf "$TEMP_DIR"
echo "Done."
