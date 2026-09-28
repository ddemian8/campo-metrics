import LegalPageLayout from "@/components/LegalPageLayout";

const Refund = () => (
  <LegalPageLayout title="Refund Policy" lastUpdated="April 14, 2026">
    <p>This Refund Policy applies to all paid subscriptions on the Campometric platform (www.campometric.com), operated by SRL "InfoSofTeh".</p>

    <h2>Payment Processor</h2>
    <p>All payments are processed by Paddle.com, which acts as the Merchant of Record. Paddle handles billing, invoicing, tax collection, and refund processing on our behalf.</p>

    <h2>7-Day Refund Policy</h2>
    <p>If you are not satisfied with your paid subscription (Player Pro or Club), you may request a full refund within 7 days of your initial purchase or subscription renewal.</p>
    <p>To request a refund:</p>
    <ol>
      <li>Email us at <a href="mailto:campometric@gmail.com">campometric@gmail.com</a> with your account email and reason for the refund</li>
      <li>Refunds are processed within 5–10 business days via the original payment method</li>
      <li>Refunds are handled by Paddle.com</li>
    </ol>

    <h2>After 7 Days</h2>
    <p>After the 7-day refund window:</p>
    <ul>
      <li>No refunds will be issued for the current billing period</li>
      <li>You may cancel your subscription at any time from your account settings</li>
      <li>Cancellation takes effect at the end of the current billing period</li>
      <li>You retain access to paid features until the end of the period you have already paid for</li>
    </ul>

    <h2>Promo Code Subscriptions</h2>
    <p>If you activated a paid plan using a free promotional code:</p>
    <ul>
      <li>No refund is applicable (no payment was made)</li>
      <li>When the promotional period ends, you will be downgraded to the Free plan unless you choose to subscribe</li>
    </ul>

    <h2>What Is Not Refundable</h2>
    <ul>
      <li>Partial months of subscription usage</li>
      <li>Subscriptions older than 7 days from purchase or renewal</li>
      <li>Free plan usage (no payment involved)</li>
      <li>Dissatisfaction with AI-generated report content (reports are generated based on the data you provide; results vary depending on data quality)</li>
    </ul>

    <h2>Cancellation vs Refund</h2>
    <p>Cancellation and refund are different:</p>
    <ul>
      <li><strong>Cancellation:</strong> stops future billing. You keep access until the end of the current period. Cancel anytime from your account settings.</li>
      <li><strong>Refund:</strong> returns the money for the current period. Must be requested within 7 days.</li>
    </ul>

    <h2>Exceptional Circumstances</h2>
    <p>We may consider refund requests outside the 7-day window in exceptional circumstances, such as:</p>
    <ul>
      <li>Technical errors that prevented you from using the Platform</li>
      <li>Duplicate charges</li>
      <li>Unauthorized transactions</li>
    </ul>
    <p>These are evaluated on a case-by-case basis.</p>

    <h2>Contact</h2>
    <p>For refund requests or questions:</p>
    <p>
      <strong>SRL "InfoSofTeh"</strong><br />
      Email: <a href="mailto:campometric@gmail.com">campometric@gmail.com</a><br />
      Address: mun. Chișinău, str. Grenoble 106/A, ap. 46, Republic of Moldova
    </p>
  </LegalPageLayout>
);

export default Refund;
