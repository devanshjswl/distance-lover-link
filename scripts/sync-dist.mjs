// Mirrors the Nitro/Vercel static output into ./dist so tooling that expects a
// conventional `dist/` client bundle (deploy checks, static previews) finds it.
import { cpSync, existsSync, rmSync } from "node:fs";

const source = ".vercel/output/static";
const target = "dist";

if (!existsSync(source)) {
  console.error(`[sync-dist] missing ${source} — did the build run?`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`[sync-dist] copied ${source} -> ${target}`);
