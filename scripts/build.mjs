import { build } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "dist");
const watch = process.argv.includes("--watch");
const alias = { "@": resolve(root, "src") };

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const common = {
  root,
  configFile: false,
  logLevel: "warn",
  resolve: { alias },
  publicDir: false,
};

const watchOpt = watch ? {} : null;

await build({
  ...common,
  plugins: [react()],
  base: "./",
  build: {
    outDir: out,
    emptyOutDir: false,
    watch: watchOpt,
    target: "es2022",
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        popup: resolve(root, "src/popup/index.html"),
        options: resolve(root, "src/options/index.html"),
      },
    },
  },
});

await build({
  ...common,
  build: {
    outDir: out,
    emptyOutDir: false,
    watch: watchOpt,
    target: "es2022",
    chunkSizeWarningLimit: 8000,
    lib: {
      entry: resolve(root, "src/background/index.ts"),
      formats: ["es"],
      fileName: () => "background.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

await build({
  ...common,
  build: {
    outDir: out,
    emptyOutDir: false,
    watch: watchOpt,
    target: "es2022",
    lib: {
      entry: resolve(root, "src/content/index.ts"),
      name: "applyfillContent",
      formats: ["iife"],
      fileName: () => "content.js",
    },
  },
});

const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
manifest.version = pkg.version;
writeFileSync(resolve(out, "manifest.json"), JSON.stringify(manifest, null, 2));
cpSync(resolve(root, "public"), out, { recursive: true });
