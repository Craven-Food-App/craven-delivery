#!/usr/bin/env node
/**
 * Removes Android sync target dirs before `cap sync` to avoid Windows ENOTEMPTY/EPERM.
 * Stops the Gradle daemon first to release file locks, then deletes the dirs.
 * Run from repo root or from apps/feeder; cleans ./android (relative to cwd).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const androidDir = path.resolve(process.cwd(), "android");
const dirsToClean = [
  path.join(androidDir, "app", "src", "main", "assets", "public"),
  path.join(androidDir, "capacitor-cordova-android-plugins"),
];

// Stop Gradle daemon to release file handles (fixes EPERM on Windows)
const gradlew = path.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");
if (fs.existsSync(gradlew)) {
  spawnSync(gradlew, ["--stop"], { cwd: androidDir, stdio: "ignore", windowsHide: true });
}

function rmRecursive(dir) {
  if (!fs.existsSync(dir)) return true;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 2 });
      console.log("Cleaned:", dir);
      return true;
    } catch (err) {
      if (attempt === 3) {
        console.error("Could not clean:", dir);
        console.error("  ", err.message);
        console.error("");
        console.error("Close Android Studio and any terminal in that folder, then run sync again.");
        return false;
      }
    }
  }
  return false;
}

let ok = true;
for (const dir of dirsToClean) {
  if (!rmRecursive(dir)) ok = false;
}
process.exit(ok ? 0 : 1);
