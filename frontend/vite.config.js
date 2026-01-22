import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    allowedHosts: ["localhost", "trading.evoagents.cn","www.evoagents.cn"]
  },
  plugins: [vue(), tsconfigPaths(), tailwindcss()],
  preview: {
    host: "0.0.0.0",
    port: 4173
  },
});

