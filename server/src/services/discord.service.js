/**
 * Discord notification service
 * Sends a webhook message when a firm's internship status changes to OPEN.
 * Requires DISCORD_WEBHOOK_URL in environment variables.
 */

// ─── Notify Discord when a firm opens ────────────────────────────────────────
async function notifyDiscord(firm, newStatus) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) return;           
  if (newStatus !== "OPEN") return;  
  
  const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: `🟢 **${firm.name}** internship applications are now **OPEN**!\n${firm.url}`,
      }),
    });
    console.log(`[Discord] Notified: ${firm.name}`);
  } catch (err) {
    console.warn("[Discord] Webhook failed:", err.message);
  }
}

module.exports = { notifyDiscord };
