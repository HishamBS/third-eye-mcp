import { spawn } from "node:child_process";

export function launchPortal(sessionId: string, auto = true): void {
  if (!sessionId) return;
  const args = ["run", "third_eye.cli", "portal", "--session-id", sessionId];
  if (auto) {
    args.push("--auto");
  } else {
    args.push("--no-auto");
  }
  const command = process.env.UV_PATH ?? "uv";
  try {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
    });
    child.unref();
  } catch (error) {
    // ignore launch failures; portal is optional
  }
}
