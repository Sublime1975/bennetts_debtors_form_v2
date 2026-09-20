/**
 * On each new applications/{id} document, send a free-tier Resend notification.
 *
 * Secrets (Firebase Functions config / params):
 *   RESEND_API_KEY  — from https://resend.com (free: 3,000 emails/mo, 100/day)
 *   NOTIFY_EMAIL    — accounts inbox, e.g. accounts@bennetts.co.za
 *   FROM_EMAIL      — verified Resend sender, e.g. onboarding@resend.dev (dev) or apps@yourdomain
 */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { Resend } = require("resend");

initializeApp();

const resendApiKey = defineSecret("RESEND_API_KEY");
const notifyEmail = defineString("NOTIFY_EMAIL");
const fromEmail = defineString("FROM_EMAIL", {
  default: "Bennett's Engineering <onboarding@resend.dev>",
});

exports.onApplicationCreated = onDocumentCreated(
  {
    document: "applications/{appId}",
    region: "europe-west1",
    secrets: [resendApiKey],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() || {};
    const appId = event.params.appId;
    const to = notifyEmail.value();
    if (!to) {
      console.error("NOTIFY_EMAIL is not set");
      await snap.ref.update({ emailStatus: "failed", emailError: "NOTIFY_EMAIL missing" });
      return;
    }

    const resend = new Resend(resendApiKey.value());
    const trading = (data.company && data.company.tradingName) || "Unknown company";
    const contactName = (data.contact && data.contact.accountsContactName) || "";
    const contactEmail = (data.contact && data.contact.accountsEmail) || "";
    const credit = (data.credit && data.credit.creditLimitRequested) || "";
    const ref = data.referenceNumber || appId;

    const subject = `New debtor application ${ref} — ${trading}`;
    const html = `
      <h2>New credit application</h2>
      <p><strong>Reference:</strong> ${escapeHtml(ref)}</p>
      <p><strong>Trading name:</strong> ${escapeHtml(trading)}</p>
      <p><strong>AP contact:</strong> ${escapeHtml(contactName)} &lt;${escapeHtml(contactEmail)}&gt;</p>
      <p><strong>Credit limit requested:</strong> R ${escapeHtml(String(credit))}</p>
      <p>Open Firebase Console → Firestore → <code>applications/${escapeHtml(appId)}</code> to review fields and Storage paths for uploaded documents.</p>
    `;

    try {
      const result = await resend.emails.send({
        from: fromEmail.value(),
        to: [to],
        replyTo: contactEmail || undefined,
        subject,
        html,
      });
      await snap.ref.update({
        emailStatus: "sent",
        emailId: result.data && result.data.id ? result.data.id : null,
        emailedAt: new Date(),
      });
    } catch (err) {
      console.error("Resend failed", err);
      await snap.ref.update({
        emailStatus: "failed",
        emailError: String(err && err.message ? err.message : err),
      });
    }
  }
);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
