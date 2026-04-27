import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const parsedPort = Number.parseInt(process.env.PORT ?? "5173", 10);
const port = Number.isNaN(parsedPort) || parsedPort <= 0 ? 5173 : parsedPort;

export default defineConfig({
    base: process.env.BASE_PATH ?? "/",
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "src"),
            "@assets": path.resolve(import.meta.dirname, "assets"),
        },
    },
    build: {
        outDir: "dist/public",
        emptyOutDir: true,
    },
    server: {
        port,
        host: "0.0.0.0",
    },
    preview: {
        port,
        host: "0.0.0.0",
    },
});
