import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function workspaceSourcePath(directory: string): string {
  const path = decodeURIComponent(
    new URL("../../packages/" + directory + "/src/index.ts", import.meta.url).pathname,
  );
  return path.replace(/^\/([A-Za-z]:\/)/u, "$1");
}

const workspacePackages = [
  ["music-spec", "music-spec"],
  ["compiler", "compiler"],
  ["runtime-data", "runtime-data"],
  ["search", "search"],
  ["ui", "ui"],
  ["motion", "motion"],
  ["project-storage", "project-storage"],
] as const;

const workspaceSourceAliases = workspacePackages.map(([packageName, directory]) => ({
  find: new RegExp("^@vgine/" + packageName + "$"),
  replacement: workspaceSourcePath(directory),
}));

export default defineConfig(({ command }) => ({
  base: "./",
  plugins: [react()],
  ...(command === "serve"
    ? { resolve: { alias: workspaceSourceAliases } }
    : {}),
  build: {
    target: "es2022",
  },
}));
