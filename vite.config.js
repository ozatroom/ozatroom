import { defineConfig } from "vite";

export default defineConfig({
  base: "/ozatroom/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true
  }
});
