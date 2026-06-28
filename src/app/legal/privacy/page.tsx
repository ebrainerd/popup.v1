import type { Metadata } from "next";
import Link from "next/link";
import { LegalTemplateNotice } from "@/components/legal-template-notice";
import {
  LEGAL_BUSINESS_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
  LEGAL_SITE_URL,
} from "@/lib/legal-site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `${LEGAL_BUSINESS_NAME} Privacy Policy`,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <LegalTemplateNotice />

      <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {LEGAL_LAST_UPDATED}</p>

      <div className="prose prose-sm mt-6 max-w-none space-y-5 text-foreground/90">
        <section>
          <h2 className="text-xl font-bold">1. Introduction</h2>
          <p>
            {LEGAL_BUSINESS_NAME} (&quot;PopUp,&quot; &quot;we,&quot; &quot;us&quot;) respects your
            privacy. This Privacy Policy explains how we collect, use, disclose, and protect
            personal information when you use {LEGAL_SITE_URL} and related services (the
            &quot;Service&quot;). It should be read with our{" "}
            <Link href="/legal/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. Information we collect</h2>
          <h3 className="text-lg font-semibold">Information you provide</h3>
          <ul className="list-disc pl-5">
            <li>
              <strong>Account data:</strong> email address, password (hashed), username, display
              name, avatar, and profile preferences.
            </li>
            <li>
              <strong>Authentication:</strong> if you use Google sign-in, we receive information
              from Google such as your name, email, and profile image as permitted by your Google
              account settings.
            </li>
            <li>
              <strong>Seller data:</strong> shop names, descriptions, images, stream settings,
              product listings, and payout onboarding data you provide to Stripe.
            </li>
            <li>
              <strong>Transaction data:</strong> items purchased or sold, order status, shipping
              addresses, tracking numbers, and communications related to orders.
            </li>
            <li>
              <strong>User content:</strong> chat messages, bids, follows, reminder opt-ins, and
              live-stream metadata.
            </li>
            <li>
              <strong>Support:</strong> information you send when contacting us.
            </li>
          </ul>
          <h3 className="mt-4 text-lg font-semibold">Information collected automatically</h3>
          <ul className="list-disc pl-5">
            <li>
              <strong>Device and usage data:</strong> IP address, browser type, device identifiers,
              pages viewed, and approximate location derived from IP.
            </li>
            <li>
              <strong>Cookies and similar technologies:</strong> session cookies required for login
              and security; see Section 8.
            </li>
            <li>
              <strong>Realtime presence:</strong> viewer counts and room participation during live
              shops.
            </li>
            <li>
              <strong>Error diagnostics:</strong> crash and performance data when monitoring is
              enabled.
            </li>
          </ul>
          <h3 className="mt-4 text-lg font-semibold">Information from third parties</h3>
          <ul className="list-disc pl-5">
            <li>
              <strong>Stripe:</strong> payment status, Connect account status, and fraud signals.
            </li>
            <li>
              <strong>Google:</strong> basic profile data when you choose Google sign-in.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. How we use information</h2>
          <p>We use personal information to:</p>
          <ul className="list-disc pl-5">
            <li>Create and secure accounts, authenticate users, and prevent fraud and abuse.</li>
            <li>Operate shops, checkout, auctions, payouts, and order fulfillment workflows.</li>
            <li>Provide live streaming, chat, reminders, and notifications you request.</li>
            <li>Communicate about orders, shops, security, and Service updates.</li>
            <li>Improve, debug, and analyze the Service.</li>
            <li>Comply with law, enforce our Terms, and protect users and PopUp.</li>
          </ul>
          <p>
            <strong>We do not sell your personal information.</strong> We do not use your data for
            third-party advertising based on cross-site tracking.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. How we share information</h2>
          <p>We share information in these circumstances:</p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Between buyers and sellers:</strong> order and shipping details needed to
              complete transactions.
            </li>
            <li>
              <strong>Service providers</strong> who process data on our behalf, including:
              <ul className="mt-2 list-disc pl-5">
                <li>Supabase — database, authentication, file storage, realtime.</li>
                <li>Stripe — payments and seller payouts.</li>
                <li>Vercel — application hosting.</li>
                <li>Resend — transactional email.</li>
                <li>Google — OAuth sign-in (if you choose it).</li>
                <li>Cloudflare Turnstile — bot protection on signup/login.</li>
                <li>LiveKit — native live video when enabled.</li>
                <li>Sentry — error monitoring when configured.</li>
              </ul>
            </li>
            <li>
              <strong>Legal and safety:</strong> when required by law, subpoena, or to protect
              rights, safety, and security.
            </li>
            <li>
              <strong>Business transfers:</strong> in connection with a merger, acquisition, or
              asset sale, subject to this Policy.
            </li>
          </ul>
          <p>
            Public shop pages, usernames, listings, and chat visible during live events may be
            viewable by other users.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Retention</h2>
          <p>
            We retain personal information for as long as needed to provide the Service, resolve
            disputes, enforce agreements, and meet legal, tax, and accounting obligations. Order
            and payout records may be kept for several years as required for financial compliance.
            Chat history may be stored but only recent messages are displayed in the room UI. You
            may request deletion as described in Section 10; some data may be retained where
            required by law or legitimate business needs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Security</h2>
          <p>
            We use technical and organizational measures appropriate to a marketplace application,
            including encrypted transport (HTTPS), access controls, and database row-level
            security. No method of transmission or storage is 100% secure. You are responsible for
            safeguarding your account credentials.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">7. International users</h2>
          <p>
            PopUp is operated from the United States. If you access the Service from outside the
            U.S., your information may be processed in the U.S. and other countries where our
            providers operate, which may have different data protection laws than your country. By
            using the Service, you consent to this transfer where permitted by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">8. Cookies and similar technologies</h2>
          <p>We use:</p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Essential cookies</strong> for authentication sessions and security (including
              Supabase auth cookies).
            </li>
            <li>
              <strong>Turnstile</strong> tokens when captcha is enabled on login/signup.
            </li>
          </ul>
          <p>
            You can control cookies through browser settings, but disabling essential cookies may
            prevent you from logging in.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">9. Communications</h2>
          <p>
            We send transactional messages (order confirmations, shipping updates, live alerts,
            drop reminders) as part of the Service. You may receive emails or push notifications
            based on actions you take (e.g., opting into reminders or enabling web push). You can
            disable push in your browser or device settings. We do not send unrelated marketing
            email without consent where required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">10. Your privacy rights</h2>
          <p>Depending on where you live, you may have the right to:</p>
          <ul className="list-disc pl-5">
            <li>Access personal information we hold about you.</li>
            <li>Correct inaccurate information.</li>
            <li>Delete certain information, subject to legal exceptions.</li>
            <li>Opt out of certain processing where applicable.</li>
            <li>Not receive discriminatory treatment for exercising privacy rights.</li>
          </ul>
          <h3 className="mt-4 text-lg font-semibold">California residents (CCPA/CPRA)</h3>
          <p>
            California residents may request to know, delete, or correct personal information. We do
            not sell personal information. To submit a request, email{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:underline">
              {LEGAL_CONTACT_EMAIL}
            </a>
            . We will verify your request as required by law.
          </p>
          <h3 className="mt-4 text-lg font-semibold">European Economic Area, UK, and Switzerland</h3>
          <p>
            Where GDPR or similar laws apply, our legal bases include contract performance,
            legitimate interests (security, improvement, fraud prevention), and consent where
            required. You may have rights to access, rectification, erasure, restriction,
            portability, and objection. You may lodge a complaint with your local supervisory
            authority.
          </p>
          <p>
            To exercise any rights, contact{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:underline">
              {LEGAL_CONTACT_EMAIL}
            </a>
            . We will respond within timelines required by applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">11. Children</h2>
          <p>
            The Service is not directed to children under 13 (or 16 in certain jurisdictions), and
            we do not knowingly collect personal information from them. If you believe a child has
            provided us data, contact us and we will delete it as required.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">12. Changes to this Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the revised version
            with an updated &quot;Last updated&quot; date and provide additional notice for material
            changes where required.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">13. Contact</h2>
          <p>
            Privacy questions or requests:{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:underline">
              {LEGAL_CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
