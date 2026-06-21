import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "PopUp Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 rounded-md border border-accent/40 bg-accent/5 p-3 text-sm text-muted-foreground">
        <strong>Template — review before launch.</strong> This is a starting point, not
        legal advice. Have it reviewed by qualified counsel and tailored to your business
        before relying on it.
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-sm mt-6 max-w-none space-y-5 text-foreground/90">
        <section>
          <h2 className="text-xl font-bold">1. Overview</h2>
          <p>
            PopUp (&quot;PopUp,&quot; &quot;we,&quot; &quot;us&quot;) operates a platform where
            sellers run time-boxed virtual pop-up shops and buyers purchase physical goods. By
            accessing or using PopUp you agree to these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. Accounts</h2>
          <p>
            You must provide accurate information and are responsible for activity under your
            account. You must be old enough to form a binding contract in your jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Sellers</h2>
          <p>
            Sellers are responsible for their listings, pricing (including the flat shipping rate
            built into prices), fulfillment, and compliance with applicable law. Payouts are made
            via Stripe Connect after an order ships, less the platform fee described below. Sellers
            must complete Stripe onboarding to receive funds.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Buyers &amp; payments</h2>
          <p>
            Purchases are processed by Stripe. Prices include shipping as set by the seller. By
            buying, you authorize the charge and agree the sale is between you and the seller. PopUp
            is not the merchant of record for goods.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Platform fee</h2>
          <p>
            PopUp charges a platform fee of 9% on transactions. Fees may change with notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Conduct &amp; content</h2>
          <p>
            You agree not to post unlawful, infringing, or abusive content (including in live
            chat). We may remove content, mute, or suspend accounts that violate these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">7. Refunds &amp; disputes</h2>
          <p>
            Refund and dispute handling is between buyer and seller, subject to Stripe&apos;s
            processes and applicable law. Contact the seller first; chargebacks may be governed by
            Stripe.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">8. Disclaimers &amp; liability</h2>
          <p>
            The service is provided &quot;as is.&quot; To the maximum extent permitted by law, PopUp
            disclaims warranties and is not liable for indirect or consequential damages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">9. Changes</h2>
          <p>We may update these Terms; continued use constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">10. Contact</h2>
          <p>Questions about these Terms: support@your-domain.example.</p>
        </section>
      </div>
    </div>
  );
}
