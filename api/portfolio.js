const getWebhookUrl = () =>
    (process.env.GOOGLE_SHEETS_WEBHOOK_URL ?? "").trim();

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res
            .status(405)
            .json({ ok: false, error: "Method not allowed." });
    }

    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) {
        return res.status(500).json({
            ok: false,
            error: "Missing GOOGLE_SHEETS_WEBHOOK_URL in Vercel environment.",
        });
    }

    const body =
        req.body && typeof req.body === "object"
            ? req.body
            : (() => {
                  try {
                      return JSON.parse(req.body ?? "{}");
                  } catch {
                      return {};
                  }
              })();

    const {
        music_link = "",
        bottleneck = "",
        commitment = "",
        submitted_at = new Date().toISOString(),
    } = body;

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

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Vercel function error while sending to webhook", error);
        return res.status(502).json({
            ok: false,
            error: "Failed to reach Google Sheets webhook.",
        });
    }
}
