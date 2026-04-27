import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

dotenv.config({ path: path.join(currentDirPath, ".env") });

const app = express();
app.use(express.json({ limit: "100kb" }));

const rawPort = process.env.PROXY_PORT ?? "8787";
const parsedPort = Number.parseInt(rawPort, 10);
const port = Number.isNaN(parsedPort) || parsedPort <= 0 ? 8787 : parsedPort;

const getWebhookUrl = () =>
    (process.env.GOOGLE_SHEETS_WEBHOOK_URL ?? "").trim();

app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "portfolio-proxy" });
});

app.post("/api/portfolio", async (req, res) => {
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) {
        return res.status(500).json({
            ok: false,
            error: "Missing GOOGLE_SHEETS_WEBHOOK_URL in server environment.",
        });
    }

    const {
        music_link = "",
        bottleneck = "",
        commitment = "",
        submitted_at = new Date().toISOString(),
    } = req.body ?? {};

    if (typeof commitment !== "string" || commitment.trim() === "") {
        return res
            .status(400)
            .json({ ok: false, error: "commitment is required." });
    }

    try {
        const formData = new URLSearchParams({
            music_link: String(music_link),
            bottleneck: String(bottleneck),
            commitment: String(commitment),
            submitted_at: String(submitted_at),
        });

        const upstreamResponse = await fetch(webhookUrl, {
            method: "POST",
            body: formData,
            redirect: "follow",
        });

        const upstreamBody = await upstreamResponse.text();
        const hasAppsScriptError =
            upstreamBody.includes("Script function not found") ||
            upstreamBody.includes("<title>Error</title>");

        if (!upstreamResponse.ok || hasAppsScriptError) {
            return res.status(502).json({
                ok: false,
                error: "Google Sheets webhook rejected the request. Check Apps Script deployment, doPost handler, and URL.",
            });
        }

        return res.json({ ok: true });
    } catch (error) {
        console.error("Proxy error while sending to webhook", error);
        return res.status(502).json({
            ok: false,
            error: "Failed to reach Google Sheets webhook.",
        });
    }
});

app.listen(port, () => {
    console.log(`Portfolio proxy listening on http://localhost:${port}`);
});
