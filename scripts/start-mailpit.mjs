import { spawn } from "node:child_process";
import path from "node:path";

const executable = path.join(
  process.cwd(),
  ".local-tools",
  "mailpit",
  process.platform === "win32" ? "mailpit.exe" : "mailpit",
);

const mailpit = spawn(
  executable,
  ["--listen", "127.0.0.1:8025", "--smtp", "127.0.0.1:1025"],
  { stdio: "inherit" },
);

mailpit.on("error", () => {
  console.error(
    "Mailpit is not installed for this computer. See https://mailpit.axllent.org/docs/install/",
  );
  process.exitCode = 1;
});

mailpit.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => mailpit.kill(signal));
}
