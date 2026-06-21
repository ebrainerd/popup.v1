import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "PopUp Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 rounded-md border border-accent/40 bg-accent/5 p-3 text-sm text-muted-foreground">
        <strong>Template — review before launch.</strong> This is a starting point, not
        legal advice. Tailor it to your actual data practices and jurisdictions (e.g. GDPR/CCPA)
        with qualified counsel.
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-sm mt-6 max-w-none space-y-5 text-foreground/90">
        <section>
          <h2 className="text-xl font-bold">1. Information we collect</h2>
          <ul className="list-disc pl-5">
            <li>Account info: email, username, profile details (via email or Google sign-in).</li>
            <li>Seller info: shop content and, via Stripe, payout onboarding details.</li>
            <li>Order info: items purchased and shipping addresses.</li>
            <li>Usage &amp; content: chat messages, follows, viewer presence, and basic analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. How we use it</h2>
          <p>
            To operate the marketplace: authentication, running shops, processing payments and
            payouts, delivering orders, real-time chat/live features, notifications, fraud
            prevention, and support.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Processors we share with</h2>
          <ul className="list-disc pl-5">
            <li><strong>Supabase</strong> — database, authentication, storage, realtime.</li>
            <li><strong>Stripe</strong> — payments, Connect payouts, identity/verification.</li>
            <li><strong>Vercel</strong> — hosting.</li>
            <li>Optional: <strong>Resend</strong> (email) and <strong>Sentry</strong> (error monitoring).</li>
          </ul>
          <p>We do not sell your personal information.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Cookies &amp; sessions</h2>
          <p>We use cookies necessary for authentication and session management.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Data retention</h2>
          <p>
            We retain data as needed to provide the service and meet legal/financial obligations.
            Chat history is retained but only recent messages are displayed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, or delete your
            data. Contact us to make a request.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">7. Security</h2>
          <p>
            We use industry-standard measures (including database row-level security and encrypted
            transport). No system is perfectly secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">8. Contact</h2>
          <p>
            Privacy questions:{" "}
            <a href="mailto:popup.shop.live@gmail.com" className="text-primary hover:underline">
              popup.shop.live@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
