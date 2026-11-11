#!/usr/bin/env bash
# Kiểm kiểu mã Kotlin của mô-đun USB (modules/plasma-usb) khi máy không có Android SDK.
# Biên dịch với thư viện Android API 35 (gói android-all của Robolectric trên Maven Central) và bản giả API Expo
# trong scripts/kotlin-stubs. Đạt nghĩa là mã đúng cú pháp và đúng kiểu; không thay cho việc dựng APK và thử với mạch.
# Chạy: bash scripts/kiem-tra-kotlin.sh   (lần đầu tải khoảng 260 MB vào thư mục .cache/kotlin-check)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/.cache/kotlin-check"
KOTLIN_VERSION=2.0.21
ANDROID_ALL=15-robolectric-12650502
mkdir -p "$CACHE"
if [ ! -x "$CACHE/kotlinc/bin/kotlinc" ]; then
  curl -sSL -o "$CACHE/kotlinc.zip" "https://github.com/JetBrains/kotlin/releases/download/v$KOTLIN_VERSION/kotlin-compiler-$KOTLIN_VERSION.zip"
  (cd "$CACHE" && unzip -q -o kotlinc.zip)
fi
if [ ! -f "$CACHE/android-all.jar" ]; then
  curl -sSL -o "$CACHE/android-all.jar" "https://repo1.maven.org/maven2/org/robolectric/android-all/$ANDROID_ALL/android-all-$ANDROID_ALL.jar"
fi
rm -rf "$CACHE/out"
"$CACHE/kotlinc/bin/kotlinc" -Werror -cp "$CACHE/android-all.jar" -d "$CACHE/out" \
  "$ROOT"/scripts/kotlin-stubs/*.kt \
  "$ROOT"/modules/plasma-usb/android/src/main/java/expo/modules/plasmausb/*.kt
echo "kiem-tra-kotlin: modules/plasma-usb biên dịch đạt"
