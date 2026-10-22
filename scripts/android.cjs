const { spawnSync } = require("node:child_process");
const path = require("node:path");
const windows = process.platform === "win32";
const result = spawnSync(
  windows ? "powershell.exe" : "npm",
  windows
    ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(__dirname, "android.ps1"), "-Mode", "Run", ...process.argv.slice(2)]
    : ["run", "android", "--workspace", "@cardiorehab/mobile", "--", ...process.argv.slice(2)],
  { cwd: path.resolve(__dirname, ".."), stdio: "inherit" }
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
