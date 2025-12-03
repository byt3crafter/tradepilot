import React from 'react';
import { useView } from '../context/ViewContext';

const PrivacyPolicyPage: React.FC = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-future-dark pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-orbitron font-bold text-future-light mb-4">
            Privacy Policy
          </h1>
          <p className="text-future-gray">
            Last updated: December 2024
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-future-light">
          {/* Introduction */}
          <section className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
            <p className="text-future-gray mb-4">
              JTradePilot ("we," "us," "our," or "Company") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and otherwise process information
              in connection with our website, mobile application, and related services (collectively, the "Services").
            </p>
            <p className="text-future-gray">
              Please read this Privacy Policy carefully. By accessing or using JTradePilot, you acknowledge
              that you have read, understood, and agree to be bound by all the provisions of this Privacy Policy.
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                1
              </span>
              Information We Collect
            </h2>

            <div className="space-y-4 ml-11">
              <div>
                <h3 className="font-semibold text-future-light mb-2">Account Information</h3>
                <p className="text-future-gray">
                  When you create a JTradePilot account, we collect information such as your name, email address,
                  password, and account preferences. This information is necessary to create and maintain your account.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Trading Data</h3>
                <p className="text-future-gray">
                  You provide trading data when you log trades, including: entry/exit dates and times, symbols,
                  prices, lot sizes, risk percentages, trade outcomes (win/loss), trade directions, and associated notes.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Playbook & Setup Information</h3>
                <p className="text-future-gray">
                  You may create playbooks containing trading setups, entry criteria, exit rules, and risk management
                  checklists. This information is stored to help you document your trading strategy.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Media Files</h3>
                <p className="text-future-gray">
                  You may upload screenshots of trading charts, market analysis, or trading setups. These files are stored
                  with your account and may be used by our AI analysis features to provide insights.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Journal & Analysis Data</h3>
                <p className="text-future-gray">
                  You may write trade journals, reflections, and notes about your trades. You may also share text descriptions
                  of trades for AI analysis and parsing.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Broker Account Information</h3>
                <p className="text-future-gray">
                  You may manually input information about your broker accounts, including account type (DEMO/LIVE/PROP_FIRM),
                  initial balance, currency, and leverage settings. We do NOT connect directly to your broker or access your
                  actual account credentials.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Usage Data</h3>
                <p className="text-future-gray">
                  We automatically collect information about how you interact with our Services, including:
                  IP address, browser type, operating system, pages visited, time spent on pages, clicks, and features used.
                  This helps us understand how our Services are being used and improve the user experience.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Cookies & Similar Technology</h3>
                <p className="text-future-gray">
                  We use cookies, local storage, and similar tracking technologies to:
                  <ul className="list-disc ml-5 mt-2 text-future-gray space-y-1">
                    <li>Remember your login status</li>
                    <li>Remember your preferences</li>
                    <li>Analyze site traffic</li>
                    <li>Provide analytics</li>
                  </ul>
                </p>
              </div>
            </div>
          </section>

          {/* 2. How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                2
              </span>
              How We Use Your Information
            </h2>

            <div className="space-y-3 ml-11">
              <p className="text-future-gray">
                <strong>To Provide the Service:</strong> Enable you to create accounts, log trades, create playbooks,
                track trading objectives, and use all features of JTradePilot.
              </p>
              <p className="text-future-gray">
                <strong>AI Analysis:</strong> Generate AI-powered insights about your trades, including analysis of trade
                quality, pre-trade checklist validation, chart analysis, and trade idea generation. Your trading data and
                screenshots are sent to Google Gemini API for analysis.
              </p>
              <p className="text-future-gray">
                <strong>Customer Support:</strong> Respond to your inquiries, resolve issues, and provide support.
              </p>
              <p className="text-future-gray">
                <strong>Service Improvement:</strong> Understand usage patterns, identify bugs, optimize features,
                and develop new functionality.
              </p>
              <p className="text-future-gray">
                <strong>Communications:</strong> Send you account-related emails, billing notifications,
                and updates about our Services (you can opt out of non-critical communications).
              </p>
              <p className="text-future-gray">
                <strong>Legal Compliance:</strong> Comply with applicable laws, regulations, and legal processes.
                Enforce our Terms of Service and other agreements.
              </p>
              <p className="text-future-gray">
                <strong>Fraud Prevention:</strong> Detect, prevent, and address fraud, security issues, and technical issues.
              </p>
            </div>
          </section>

          {/* 3. AI Analysis & Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                3
              </span>
              AI Analysis & Third-Party Services
            </h2>

            <div className="space-y-4 ml-11">
              <p className="text-future-gray">
                JTradePilot uses the Google Gemini API to provide AI-powered trade analysis. When you use AI features,
                your trading data, screenshots, and text descriptions are sent to Google's servers for processing.
              </p>
              <p className="text-future-gray">
                <strong>Important:</strong> Google's privacy policy applies to data processed by their API.
                Please review <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-photonic-blue hover:underline">Google's Privacy Policy</a> for details.
              </p>
              <p className="text-future-gray">
                We also work with the following service providers:
                <ul className="list-disc ml-5 mt-2 text-future-gray space-y-1">
                  <li><strong>Clerk:</strong> Authentication and user management - <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-photonic-blue hover:underline">Privacy Policy</a></li>
                  <li><strong>Paddle:</strong> Payment processing and billing - <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-photonic-blue hover:underline">Privacy Policy</a></li>
                  <li><strong>Supabase (PostgreSQL):</strong> Database hosting - <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-photonic-blue hover:underline">Privacy Policy</a></li>
                </ul>
              </p>
            </div>
          </section>

          {/* 4. Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                4
              </span>
              Data Sharing & Disclosure
            </h2>

            <div className="space-y-3 ml-11">
              <p className="text-future-gray">
                <strong>We DO NOT sell your personal data to third parties.</strong>
              </p>
              <p className="text-future-gray">
                We share information only in the following circumstances:
              </p>
              <p className="text-future-gray">
                <strong>Service Providers:</strong> We share data with companies that provide services on our behalf,
                such as payment processors, email services, and hosting providers. These providers are contractually
                obligated to use your data only to provide services to us.
              </p>
              <p className="text-future-gray">
                <strong>Legal Requirements:</strong> We may disclose information if required by law, or if we believe
                in good faith that disclosure is necessary to comply with legal obligations, protect our rights or your safety,
                or prevent fraud.
              </p>
              <p className="text-future-gray">
                <strong>Business Transfers:</strong> If JTradePilot is sold, merged, or acquired, your information may be
                transferred as part of that transaction. You will be notified of any such change and any choices you may
                have regarding your personal information.
              </p>
              <p className="text-future-gray">
                <strong>With Your Consent:</strong> We may share information with third parties with your explicit consent.
              </p>
            </div>
          </section>

          {/* 5. Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                5
              </span>
              Data Security
            </h2>

            <div className="space-y-3 ml-11">
              <p className="text-future-gray">
                We implement industry-standard security measures to protect your personal information, including:
              </p>
              <p className="text-future-gray">
                <strong>Encryption:</strong> Data is encrypted in transit (HTTPS) and at rest in our database.
              </p>
              <p className="text-future-gray">
                <strong>Access Controls:</strong> Access to your data is restricted to authorized personnel who need
                it to provide services to you.
              </p>
              <p className="text-future-gray">
                <strong>Regular Backups:</strong> We maintain regular backups of your data to prevent loss.
              </p>
              <p className="text-future-gray">
                <strong>Monitoring:</strong> We monitor our systems for security incidents and unauthorized access.
              </p>
              <p className="text-future-gray">
                <strong>Important:</strong> While we implement strong security measures, no system is completely secure.
                If you believe your account has been compromised, please contact us immediately.
              </p>
            </div>
          </section>

          {/* 6. Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                6
              </span>
              Your Privacy Rights
            </h2>

            <div className="space-y-4 ml-11">
              <p className="text-future-gray">
                <strong>Access Your Data:</strong> You can access your personal data at any time through your account settings.
              </p>
              <p className="text-future-gray">
                <strong>Download Your Data:</strong> You can download your trading data, playbooks, and journals in a
                standard format (JSON/CSV) through your account.
              </p>
              <p className="text-future-gray">
                <strong>Correct Your Data:</strong> You can update or correct your personal information at any time.
              </p>
              <p className="text-future-gray">
                <strong>Delete Your Account:</strong> You can request deletion of your account and associated data.
                Upon deletion, we will remove your data from our active systems, though backups may be retained for
                a limited period for legal and compliance purposes.
              </p>
              <p className="text-future-gray">
                <strong>GDPR Rights (EU Residents):</strong> If you are located in the EU, you have additional rights under
                the General Data Protection Regulation (GDPR), including rights to access, rectification, erasure,
                restriction of processing, and data portability. Please contact us to exercise these rights.
              </p>
              <p className="text-future-gray">
                <strong>CCPA Rights (California Residents):</strong> If you are a California resident, you have rights under
                the California Consumer Privacy Act (CCPA). Please contact us for more information.
              </p>
              <p className="text-future-gray">
                To exercise any of these rights, please contact us at privacy@jtradepilot.com.
              </p>
            </div>
          </section>

          {/* 7. Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                7
              </span>
              Children's Privacy
            </h2>

            <p className="ml-11 text-future-gray">
              JTradePilot is not intended for children under the age of 18. We do not knowingly collect personal information
              from children under 18. If we become aware that a child under 18 has provided us with personal information,
              we will delete such information promptly and terminate the child's account. If you believe we have collected
              information from a child under 18, please contact us immediately.
            </p>
          </section>

          {/* 8. Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                8
              </span>
              Changes to This Privacy Policy
            </h2>

            <p className="ml-11 text-future-gray">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology,
              legal requirements, or other factors. We will notify you of material changes by posting the updated policy
              on our website and updating the "Last updated" date at the top of this policy. Your continued use of JTradePilot
              after such modifications constitutes your acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* 9. Contact Us */}
          <section className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                9
              </span>
              Contact Us
            </h2>

            <div className="ml-11 space-y-3">
              <p className="text-future-gray">
                If you have any questions about this Privacy Policy or our privacy practices,
                please contact us at:
              </p>
              <p className="text-future-gray">
                <strong>Email:</strong> privacy@jtradepilot.com
              </p>
              <p className="text-future-gray">
                <strong>Website:</strong> www.jtradepilot.com
              </p>
              <p className="text-future-gray">
                We will respond to your inquiries within 30 days.
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-photonic-blue/10">
            <p className="text-future-gray text-sm text-center">
              © 2024 JTradePilot. All rights reserved. | Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
