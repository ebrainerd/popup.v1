/** Shared support contact + transactional email footer copy. */

export const SUPPORT_EMAIL = "support@popupdrop.co";

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

/** HTML footer for buyer/seller transactional emails (Resend). */
export function transactionalEmailFooter(siteUrl: string): string {
  return `<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
    Questions? Email <a href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a> or visit
    <a href="${siteUrl}/support">Support</a>. See our <a href="${siteUrl}/legal/terms">Terms</a>.
  </p>`;
}
