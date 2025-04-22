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
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "worker") {
            return "worker.js"; // Keep worker.js filename unchanged
          }
          if (
            chunk.name === "index" &&
            chunk.facadeModuleId.endsWith("index.js")
          ) {
            return "index.js"; // Keep original index.js filename
          }
          return "assets/[name]-[hash].js"; // Place other files in assets with hash
        },
      },
    },
  },
});
