const { spawn, execSync } = require("child_process");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

function freePortOnWindows(port) {
  if (!isWin) return;
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const lines = output.split(/\r?\n/).filter(Boolean);
    const pids = new Set();
    for (const line of lines) {
      if (line.includes("LISTENING")) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== "0" && Number(pid) !== process.pid) {
          pids.add(pid);
        }
      }
    }
    for (const pid of pids) {
      try {
        console.log(`\x1b[33mFreeing port ${port} (terminating stale PID ${pid})...\x1b[0m`);
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      } catch {
        // Ignore if already exited
      }
    }
  } catch {
    // Port is already free
  }
}

freePortOnWindows(5050);
freePortOnWindows(5173);

try {
  execSync(`${npmCmd} run build:shared`, { stdio: "inherit" });
} catch {
  // Continue even if shared build already up to date
}

function startProcess(name, args, colorCode) {
  const child = spawn(npmCmd, args, {
    stdio: "inherit",
    shell: true,
    env: process.env
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\x1b[${colorCode}m[${name}] exited with code ${code}\x1b[0m`);
    }
  });

  return child;
}

console.log("\x1b[36mStarting SKYGO Server (http://127.0.0.1:5050) & Client (http://localhost:5173)...\x1b[0m");

const serverProc = startProcess("SERVER", ["run", "dev:server"], "35");
let clientProc = null;
setTimeout(() => {
  clientProc = startProcess("CLIENT", ["run", "dev:client"], "32");
}, 1500);

process.on("SIGINT", () => {
  serverProc.kill("SIGINT");
  if (clientProc) clientProc.kill("SIGINT");
  process.exit(0);
});
