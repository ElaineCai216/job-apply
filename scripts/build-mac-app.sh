#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="$ROOT_DIR/macos/build/Apply Desk.app"
CONTENTS="$APP_PATH/Contents"
MODULE_CACHE="/tmp/apply-desk-swift-module-cache"

cd "$ROOT_DIR"
CAPACITOR_BUILD=1 npm run build
rm -rf "$APP_PATH"
mkdir -p "$CONTENTS/MacOS" "$CONTENTS/Resources/public"
mkdir -p "$MODULE_CACHE"
cp macos/Info.plist "$CONTENTS/Info.plist"
cp -R dist/. "$CONTENTS/Resources/public/"
xcrun swiftc macos/ApplyDesk.swift -o "$CONTENTS/MacOS/Apply Desk" -framework Cocoa -framework WebKit -module-cache-path "$MODULE_CACHE"
codesign --force --deep --sign - "$APP_PATH"
echo "Built: $APP_PATH"
