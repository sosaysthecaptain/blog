import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "../dirigible-mac/Dirigible/Resources"),
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
    },
  },
});
