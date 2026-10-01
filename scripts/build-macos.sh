#!/usr/bin/env bash
# Builds a Release Finny.app for macOS, signed with Adlyn's free Personal Team
# (the Keychain needs the team's keychain-access-groups entitlement; spike
# report §4).
#
# Output: build/Finny.app. The JS bundle (Hermes bytecode) is embedded, so the
# app runs without Metro. Drag it to /Applications to use it.
#
# Build-time config: as for ios:ipa, Babel inlines the Supabase URL and anon
# key into the bundle (scripts/build-env.js), from the shell environment or
# from .env at the repo root.
#
# The free team's provisioning profile lasts 7 days; rebuilding signs the app
# again with a current one (build plan Section 0 item 10).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="Finny"
BUILD_DIR="$ROOT/build"
DERIVED="$BUILD_DIR/macos-derived"
BUILT="$DERIVED/Build/Products/Release/$APP_NAME.app"
APP="$BUILD_DIR/$APP_NAME.app"

LOG="$BUILD_DIR/macos-release.log"

if [ ! -f "$ROOT/.env" ] && { [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; }; then
  echo "error: no .env and SUPABASE_URL / SUPABASE_ANON_KEY unset; the app would fail at launch" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"
echo "Building $APP_NAME (Release, macOS). Full log: $LOG"

if ! xcodebuild \
  -workspace "$ROOT/macos/finny.xcworkspace" \
  -scheme finny-macOS \
  -configuration Release \
  -destination 'platform=macOS' \
  -derivedDataPath "$DERIVED" \
  -allowProvisioningUpdates \
  build >"$LOG" 2>&1; then
  grep -E ' error:|BUILD FAILED' "$LOG" | tail -20 >&2
  echo "error: xcodebuild failed, see $LOG" >&2
  exit 1
fi

if [ ! -d "$BUILT" ]; then
  echo "error: build did not produce $BUILT" >&2
  exit 1
fi

if [ ! -f "$BUILT/Contents/Resources/main.jsbundle" ]; then
  echo "error: $BUILT has no main.jsbundle, so it would need Metro to run" >&2
  exit 1
fi

rm -rf "$APP"
ditto "$BUILT" "$APP"

EXPIRES="$(security cms -D -i "$APP/Contents/embedded.provisionprofile" 2>/dev/null |
  plutil -extract ExpirationDate raw -o - - 2>/dev/null || echo unknown)"
echo "Built $APP ($(du -sh "$APP" | cut -f1)); profile expires $EXPIRES"
