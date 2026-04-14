import LegalPageLayout from "@/components/LegalPageLayout";

const Privacy = () => (
  <LegalPageLayout title="Privacy Policy" lastUpdated="April 14, 2026">
    <p>SRL "InfoSofTeh" (Fiscal Code: 1003600043827), operating the Campometric platform at www.campometric.com, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal data.</p>

    <h2>Data Controller</h2>
    <p>
      <strong>SRL "InfoSofTeh"</strong><br />
      Address: mun. Chișinău, str. Grenoble 106/A, ap. 46, Republic of Moldova<br />
      Email: <a href="mailto:campometric@gmail.com">campometric@gmail.com</a>
    </p>

    <h2>Data We Collect</h2>
    <p><strong>Account Data:</strong></p>
    <ul>
      <li>Full name</li>
      <li>Email address</li>
      <li>Password (encrypted)</li>
      <li>Country, league, and team (optional)</li>
      <li>Date of birth (optional)</li>
      <li>Position played</li>
      <li>Profile photo (optional)</li>
      <li>Transfermarkt profile link (optional)</li>
    </ul>
    <p><strong>Performance Data:</strong></p>
    <ul>
      <li>GPS session data uploaded by you (distance, speed, accelerations, decelerations, sprint distance, high-speed running, heart rate)</li>
      <li>Session metadata (date, duration, session type, opponent)</li>
      <li>AI-generated performance reports and CPI scores</li>
    </ul>
    <p><strong>Payment Data:</strong></p>
    <p>Payment transactions are processed by Paddle.com. We do not store your credit card details. Paddle acts as the Merchant of Record and processes your payment data in accordance with their Privacy Policy.</p>
    <p><strong>Usage Data:</strong></p>
    <ul>
      <li>IP address</li>
      <li>Browser type and device information</li>
      <li>Pages visited and time spent on the Platform</li>
      <li>Referral source</li>
    </ul>
    <p><strong>Affiliate Data (if applicable):</strong></p>
    <ul>
      <li>Referral code usage</li>
      <li>Commission earnings</li>
      <li>Payment details (Revolut tag/IBAN or bank transfer details) provided voluntarily for payout purposes</li>
    </ul>

    <h2>How We Use Your Data</h2>
    <p>We use your data to:</p>
    <ul>
      <li>Provide and improve the Platform's services</li>
      <li>Generate AI-powered performance reports from your GPS data</li>
      <li>Display your public profile on the leaderboard and player directory</li>
      <li>Process payments and manage subscriptions</li>
      <li>Communicate with you about your account, reports, and platform updates</li>
      <li>Calculate and display leaderboard rankings</li>
      <li>Manage the Affiliate Program (track referrals and commissions)</li>
      <li>Analyze platform usage to improve our services</li>
      <li>Comply with legal obligations</li>
    </ul>

    <h2>Legal Basis for Processing</h2>
    <p>We process your data based on:</p>
    <ul>
      <li><strong>Contract performance:</strong> to provide the services you signed up for</li>
      <li><strong>Legitimate interest:</strong> to improve our platform and prevent fraud</li>
      <li><strong>Consent:</strong> for marketing communications (you can opt out at any time)</li>
      <li><strong>Legal obligation:</strong> to comply with applicable laws</li>
    </ul>

    <h2>Data Sharing</h2>
    <p>We share your data with:</p>
    <ul>
      <li><strong>Paddle.com:</strong> for payment processing (as Merchant of Record)</li>
      <li><strong>Anthropic (Claude AI):</strong> your GPS session data is sent to the Claude API for generating performance reports. Data is processed in accordance with Anthropic's data usage policies and is not used to train AI models.</li>
      <li><strong>Publicly:</strong> your name, position, club, country, and performance statistics are displayed publicly on the Campometric leaderboard and player directory. All accounts are public by default.</li>
    </ul>
    <p>We do NOT sell your personal data to third parties.</p>
    <p>We do NOT share your raw GPS data with scouts, clubs, or any third party without your explicit consent.</p>

    <h2>Data Retention</h2>
    <ul>
      <li><strong>Account data:</strong> retained for as long as your account is active. Deleted within 30 days of account deletion.</li>
      <li><strong>Performance data and reports:</strong> retained for as long as your account is active.</li>
      <li><strong>Payment records:</strong> retained for 5 years as required by Moldovan tax legislation.</li>
      <li><strong>Affiliate data:</strong> retained for 3 years after the end of the affiliate relationship.</li>
    </ul>

    <h2>Your Rights</h2>
    <p>Under applicable data protection laws (including GDPR where applicable), you have the right to:</p>
    <ul>
      <li>Access your personal data</li>
      <li>Correct inaccurate data</li>
      <li>Delete your account and data ("right to be forgotten")</li>
      <li>Export your data in a portable format</li>
      <li>Object to processing based on legitimate interest</li>
      <li>Withdraw consent for marketing communications</li>
    </ul>
    <p>To exercise any of these rights, contact us at <a href="mailto:campometric@gmail.com">campometric@gmail.com</a>.</p>

    <h2>Data Security</h2>
    <p>We implement appropriate technical and organizational measures to protect your data, including:</p>
    <ul>
      <li>Encryption of data in transit (HTTPS/TLS)</li>
      <li>Encryption of passwords (hashed, never stored in plain text)</li>
      <li>Access controls limiting who can view personal data</li>
      <li>Regular security reviews</li>
    </ul>

    <h2>Cookies</h2>
    <p>The Platform uses essential cookies required for authentication and session management. We do not use advertising or tracking cookies.</p>

    <h2>Children's Privacy</h2>
    <p>The Platform is not intended for children under 16. We do not knowingly collect data from children under 16. If we become aware that a child under 16 has provided us with personal data, we will take steps to delete it.</p>

    <h2>International Transfers</h2>
    <p>Your data may be processed outside the Republic of Moldova (for example, by Anthropic's Claude API servers or Paddle's payment infrastructure). In such cases, we ensure appropriate safeguards are in place to protect your data.</p>

    <h2>Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify registered users of significant changes via email. Continued use of the Platform after changes constitutes acceptance.</p>

    <h2>Contact</h2>
    <p>For privacy-related inquiries:</p>
    <p>
      <strong>SRL "InfoSofTeh"</strong><br />
      Email: <a href="mailto:campometric@gmail.com">campometric@gmail.com</a><br />
      Address: mun. Chișinău, str. Grenoble 106/A, ap. 46, Republic of Moldova
    </p>
  </LegalPageLayout>
);

export default Privacy;
