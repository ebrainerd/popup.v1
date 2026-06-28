import Link from "next/link";
import {
  LEGAL_BUSINESS_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_GOVERNING_STATE,
  LEGAL_SITE_URL,
  LEGAL_VENUE_CITY,
  LEGAL_VENUE_COUNTY,
} from "@/lib/legal-site";
import { cn } from "@/lib/utils";

export function TermsOfServiceContent({ className }: { className?: string }) {
  return (
<div className={cn("prose prose-sm max-w-none space-y-5 text-foreground/90", className)}>
        <section>
          <h2 className="text-xl font-bold">1. Agreement</h2>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the{" "}
            {LEGAL_BUSINESS_NAME} website and services at {LEGAL_SITE_URL} (collectively, the
            &quot;Service&quot;), operated by {LEGAL_BUSINESS_NAME} (&quot;PopUp,&quot;
            &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account, browsing,
            selling, buying, bidding, chatting, or otherwise using the Service, you agree to these
            Terms and our{" "}
            <Link href="/legal/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. The Service</h2>
          <p>
            PopUp is an online marketplace platform that enables independent sellers to run
            time-limited virtual pop-up shops, offer products (including flash sales and live
            auctions), stream live video, and sell physical goods to buyers. PopUp provides
            hosting, discovery tools, checkout technology, and payment facilitation.{" "}
            <strong>
              PopUp is not the seller of record for goods listed on the platform.
            </strong>{" "}
            Each sale is a transaction between the buyer and the individual seller, subject to
            these Terms and applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Eligibility</h2>
          <ul className="list-disc pl-5">
            <li>
              You must be at least <strong>18 years old</strong> (or the age of majority in your
              jurisdiction, if higher) to create an account, sell, purchase, or bid.
            </li>
            <li>
              You must provide accurate registration information and keep your account credentials
              secure. You are responsible for all activity under your account.
            </li>
            <li>
              You may not use the Service if you are barred under applicable law or if we have
              suspended or terminated your account.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Seller terms</h2>
          <p>If you sell on PopUp, you additionally agree that:</p>
          <ul className="list-disc pl-5">
            <li>
              You are solely responsible for your listings, descriptions, photos, pricing, inventory,
              shipping timelines, packaging, and customer service for your orders.
            </li>
            <li>
              Prices you set should include the flat per-order shipping amount you configure. You
              must ship to the address provided and provide accurate tracking when requested.
            </li>
            <li>
              You will comply with all applicable laws, including consumer protection, product
              safety, export, tax, and licensing requirements for the goods you sell.
            </li>
            <li>
              You will not list prohibited items (see Section 8) or misrepresent products,
              condition, or availability.
            </li>
            <li>
              Payouts are processed through <strong>Stripe Connect</strong>. You must complete
              Stripe&apos;s onboarding and identity verification to receive funds. Payout timing may
              include a hold period after you mark an order shipped (currently up to 72 hours) to
              allow for dispute and fraud review.
            </li>
            <li>
              You authorize PopUp to deduct a <strong>platform fee of 9%</strong> (nine percent)
              from amounts otherwise payable to you, and to pass payment processing costs as
              configured through Stripe. We may change fees with reasonable notice.
            </li>
            <li>
              You are the merchant of record for tax purposes unless otherwise required by law. You
              are responsible for determining, collecting, and remitting applicable sales, use,
              VAT, or similar taxes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Buyer terms</h2>
          <ul className="list-disc pl-5">
            <li>
              When you purchase, you enter a contract directly with the seller. PopUp facilitates
              payment but does not take title to goods.
            </li>
            <li>
              You authorize Stripe to charge your payment method for the total shown at checkout,
              including item price and shipping as set by the seller.
            </li>
            <li>
              You must provide a valid shipping address and promptly communicate with the seller
              regarding delivery issues.
            </li>
            <li>
              <strong>Live auctions and binding bids:</strong> If you place a bid in a live
              auction, your bid is an offer to purchase at that price if you are the winning bidder
              when the auction ends. Winning bidders are obligated to complete checkout. Failure to
              pay may result in account action and forfeiture of future bidding privileges.
            </li>
            <li>
              <strong>Flash sales:</strong> Inventory may be limited. Checkout sessions may expire
              if not completed in time; a held item may be released to other buyers.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Payments, refunds, and disputes</h2>
          <ul className="list-disc pl-5">
            <li>
              Payments are processed by <strong>Stripe</strong>. PopUp does not store full payment
              card numbers.
            </li>
            <li>
              Refunds, returns, and order issues are primarily between buyer and seller. Contact the
              seller first. PopUp may, but is not obligated to, assist with disputes.
            </li>
            <li>
              Chargebacks and payment disputes are handled under Stripe&apos;s and applicable card
              network rules. Sellers may be debited for chargebacks or refunds as Stripe permits.
            </li>
            <li>
              We do not guarantee that sellers will ship, that goods will meet expectations, or
              that disputes will resolve in your favor.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">7. Live streaming and chat</h2>
          <ul className="list-disc pl-5">
            <li>
              Sellers may broadcast live video through PopUp&apos;s native streaming or embedded
              third-party players (e.g., YouTube, Twitch). Third-party streams are subject to
              those providers&apos; terms as well.
            </li>
            <li>
              You may not stream or post content that is unlawful, infringing, harassing, hateful,
              sexually exploitative, dangerous, or otherwise violates these Terms.
            </li>
            <li>
              Chat and room features are for community interaction during shops. We may moderate,
              remove messages, mute users, or end streams that violate these Terms.
            </li>
            <li>
              <strong>Recording:</strong> Do not record or redistribute others&apos; streams or
              personal information without consent where required by law.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">8. Prohibited conduct and items</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5">
            <li>Violate any law or third-party rights.</li>
            <li>
              List or sell illegal goods, stolen property, counterfeit items, weapons where
              prohibited, controlled substances, recalled products, or other items we prohibit in
              our discretion.
            </li>
            <li>Manipulate auctions, bids, reviews, or reminder counts.</li>
            <li>Scrape, reverse engineer, or overload the Service.</li>
            <li>Circumvent fees, payouts, or security measures.</li>
            <li>Impersonate others or misrepresent your affiliation with PopUp.</li>
          </ul>
          <p>
            We may remove listings, cancel transactions, withhold payouts, or suspend accounts for
            violations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">9. Your content and license</h2>
          <p>
            You retain ownership of content you submit (listings, images, stream footage, chat). You
            grant PopUp a worldwide, non-exclusive, royalty-free license to host, display,
            reproduce, and distribute your content solely to operate, promote, and improve the
            Service. You represent that you have all rights necessary to grant this license.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">10. Copyright complaints (DMCA)</h2>
          <p>
            If you believe content on the Service infringes your copyright, send a notice to{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:underline">
              {LEGAL_CONTACT_EMAIL}
            </a>{" "}
            including: (1) identification of the copyrighted work; (2) identification of the
            infringing material and its location; (3) your contact information; (4) a statement of
            good-faith belief; (5) a statement under penalty of perjury that your notice is
            accurate and you are authorized to act; and (6) your physical or electronic signature.
            We may remove content and terminate repeat infringers. Counter-notice procedures
            under 17 U.S.C. § 512 may apply.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">11. Termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or terminate your access,
            remove content, or cancel shops at any time for any reason, including violation of
            these Terms, risk concerns, or legal requirements. Sections that by nature should
            survive (payment obligations, disclaimers, liability limits, indemnity, dispute terms)
            survive termination.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">12. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM
            EXTENT PERMITTED BY LAW, POPUP DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
            WARRANT UNINTERRUPTED, SECURE, OR ERROR-FREE OPERATION, OR THE CONDUCT OF USERS,
            SELLERS, OR THIRD-PARTY PROVIDERS.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">13. Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, POPUP AND ITS OFFICERS, DIRECTORS, EMPLOYEES,
            AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF
            THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICE
            IS LIMITED TO THE GREATER OF (A) AMOUNTS YOU PAID TO POPUP IN PLATFORM FEES IN THE
            TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100). SOME
            JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE CASES, OUR LIABILITY IS
            LIMITED TO THE FULLEST EXTENT PERMITTED BY LAW.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">14. Indemnification</h2>
          <p>
            You will defend, indemnify, and hold harmless PopUp from claims, damages, losses, and
            expenses (including reasonable attorneys&apos; fees) arising from your content, your
            products, your sales or purchases, your breach of these Terms, or your violation of
            law or third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">15. Dispute resolution and governing law</h2>
          <p>
            These Terms are governed by the laws of the State of {LEGAL_GOVERNING_STATE}, United
            States, without regard to conflict-of-law rules. Except where prohibited, you and PopUp
            agree that disputes will be resolved by binding individual arbitration rather than in
            court, and you waive any right to participate in a class action. Either party may seek
            injunctive relief in court for intellectual property or unauthorized access. If
            arbitration does not apply to you (for example, certain consumer protections in your
            jurisdiction), you agree that exclusive venue for such claims will be the state and
            federal courts located in {LEGAL_VENUE_COUNTY}, {LEGAL_GOVERNING_STATE}, including the
            city of {LEGAL_VENUE_CITY}.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">16. Changes</h2>
          <p>
            We may update these Terms from time to time. We will post the revised Terms with an
            updated &quot;Last updated&quot; date. Material changes may be communicated by email
            or in-product notice where required. Continued use after changes take effect constitutes
            acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">17. Contact</h2>
          <p>
            Questions about these Terms:{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:underline">
              {LEGAL_CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
  );
}
