import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const workspaceSourceAliases = [
  ["music-spec", "music-spec"],
  ["compiler", "compiler"],
  ["runtime-data", "runtime-data"],
  ["search", "search"],
  ["ui", "ui"],
  ["motion", "motion"],
].map(([packageName, directory]) => ({
  find: new RegExp("^@vgine/" + packageName + "$"),
  replacement: fileURLToPath(
    new URL("../../packages/" + directory + "/src/index.ts", import.meta.url),
  ),
}));

export default defineConfig(({ command }) => ({
  base: "./",
  plugins: [react()],
  resolve: command === "serve" ? { alias: workspaceSourceAliases } : undefined,
  build: {
    target: "es2022",
  },
}));
