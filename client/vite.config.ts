import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
        target: "http://127.0.0.1:5050",
        changeOrigin: true
      },
      "/socket.io": {
        target: "http://127.0.0.1:5050",
        ws: true
      }
    }
  }
});
