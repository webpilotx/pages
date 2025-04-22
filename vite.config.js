import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import api from "./api.js";
import { builtinModules } from "module";

// https://vite.dev/config/
export default defineConfig({
  base: "/pages/",
  plugins: [
    tailwindcss(),
    react(),
    (() => ({
      name: "vite-plugin-app",
      configureServer(server) {
        server.middlewares.use(api);
      },
    }))(),
  ],
  build: {
    rollupOptions: {
      input: ["index.html", "index.js", "worker.js"],
      external: [...builtinModules, "node-fetch", "express"],
    },
  },
});
