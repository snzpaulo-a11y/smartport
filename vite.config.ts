import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/iprog-api": {
        target: "https://www.iprogsms.com",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/iprog-api/, ""),
      },
      "/mailtrap-api": {
        target: "https://send.api.mailtrap.io",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mailtrap-api/, ""),
      },
    },

  },
  plugins: [
    react(), 
    // basicSsl(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
