import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const serverUrl = process.env.SERVER_URL || "http://127.0.0.1:5050";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@omnitransit/shared": path.resolve(__dirname, "../shared/index.ts")
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api": {
        target: serverUrl,
        changeOrigin: true
      },
      "/socket.io": {
        target: serverUrl,
        ws: true
      }
    }
  }
});
