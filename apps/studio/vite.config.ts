import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function workspaceSourcePath(directory: string): string {
  const path = decodeURIComponent(
    new URL("../../packages/" + directory + "/src/index.ts", import.meta.url).pathname,
  );
  return path.replace(/^\/([A-Za-z]:\/)/u, "$1");
}

const workspaceSourceAliases = [
  ["music-spec", "music-spec"],
  ["compiler", "compiler"],
  ["runtime-data", "runtime-data"],
  ["search", "search"],
  ["ui", "ui"],
  ["motion", "motion"],
].map(([packageName, directory]) => ({
  find: new RegExp("^@vgine/" + packageName + "$"),
  replacement: workspaceSourcePath(directory),
}));

export default defineConfig(({ command }) => ({
  base: "./",
  plugins: [react()],
  resolve: command === "serve" ? { alias: workspaceSourceAliases } : undefined,
  build: {
    target: "es2022",
  },
}));
