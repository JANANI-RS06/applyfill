import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
if (!existsSync(resolve(dist, "manifest.json"))) {
  console.error("dist/ is missing. Run `npm run build` first.");
  process.exit(1);
}
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
mkdirSync(resolve(root, "release"), { recursive: true });
const target = resolve(root, "release", `applyfill-${version}.zip`);
rmSync(target, { force: true });
execFileSync("zip", ["-r", "-X", "-q", target, "."], { cwd: dist });
console.log(target);
