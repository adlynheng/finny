#!/usr/bin/env bash
# Builds an unsigned Release .ipa of the iOS app for SideStore, which signs it
# on the phone with Adlyn's free Apple ID (build plan Section 0 item 10).
#
# Output: build/Finny.ipa. The JS bundle (Hermes bytecode) is embedded, so the
# app runs without Metro.
#
# Build-time config: the "Bundle React Native code and images" build phase runs
# Metro on the JS, and Babel inlines the Supabase URL and anon key into it
# (scripts/build-env.js). They come from the shell environment or from .env at
# the repo root, so fill in .env (see .env.example) before running this.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="Finny"
BUILD_DIR="$ROOT/build"
DERIVED="$BUILD_DIR/ios-derived"
APP="$DERIVED/Build/Products/Release-iphoneos/$APP_NAME.app"
IPA="$BUILD_DIR/$APP_NAME.ipa"

LOG="$BUILD_DIR/ios-release.log"

if [ ! -f "$ROOT/.env" ] && { [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; }; then
  echo "error: no .env and SUPABASE_URL / SUPABASE_ANON_KEY unset; the app would fail at launch" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"
echo "Building $APP_NAME (Release, iphoneos). Full log: $LOG"

if ! xcodebuild \
  -workspace "$ROOT/ios/$APP_NAME.xcworkspace" \
  -scheme "$APP_NAME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$DERIVED" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  build >"$LOG" 2>&1; then
  grep -E ' error:|BUILD FAILED' "$LOG" | tail -20 >&2
  echo "error: xcodebuild failed, see $LOG" >&2
  exit 1
fi

if [ ! -d "$APP" ]; then
  echo "error: build did not produce $APP" >&2
  exit 1
fi

if [ ! -f "$APP/main.jsbundle" ]; then
  echo "error: $APP has no main.jsbundle, so it would need Metro to run" >&2
  exit 1
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir "$STAGE/Payload"
cp -R "$APP" "$STAGE/Payload/"
rm -f "$IPA"
(cd "$STAGE" && zip -qry "$IPA" Payload)

echo "Built $IPA ($(du -h "$IPA" | cut -f1))"
