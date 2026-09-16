import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Capacitor loads bundled assets from the app sandbox; GitHub Pages needs its sub-path.
  base: process.env.CAPACITOR_BUILD === "1" ? "./" : "/job-apply/",
  server: { host: true },
  preview: { host: true },
  test: { environment: "node" }
});
