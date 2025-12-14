import React from 'react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const TermsOfServicePage: React.FC = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-future-dark">
      <PublicNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-orbitron font-bold text-future-light mb-4">
            Terms of Service
          </h1>
          <p className="text-future-gray">
            Last updated: December 2024
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-future-light">
          {/* Critical Disclaimer Box */}
          <section className="bg-risk-high/10 rounded-lg p-6 border border-risk-high/30">
            <h2 className="text-xl font-bold text-risk-high mb-3 flex items-center">
              ⚠️ CRITICAL DISCLAIMER
            </h2>
            <div className="space-y-3">
              <p className="text-future-light">
                <strong>JTradePilot is a trading journal and educational tool.</strong> Our AI analysis and features
                are provided "AS IS" for educational purposes only and are not investment advice.
              </p>
              <p className="text-future-light">
                <strong>Trading involves substantial risk of loss.</strong> Past performance does not guarantee future results.
                You alone are responsible for all trading decisions. We are not liable for losses from trades made based on
                JTradePilot analysis or suggestions.
              </p>
              <p className="text-future-light">
                <strong>AI Analysis May Contain Errors.</strong> Our AI is not 100% accurate and may provide incorrect analysis.
                Always verify our suggestions with your own analysis before trading.
              </p>
            </div>
          </section>

          {/* Introduction */}
          <section className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
            <div className="mb-4 text-future-gray">
              <p className="font-semibold text-future-light mb-2">Service Operator:</p>
              <p>JTradePilot (Sole Proprietorship)</p>
              <p>Contact: support@jtradepilot.com</p>
            </div>
            <p className="text-future-gray mb-4">
              These Terms of Service ("Terms") govern your use of JTradePilot, including our website,
              mobile application, and all related services (the "Service"). By accessing or using JTradePilot,
              you agree to be bound by these Terms. If you do not agree with any provision of these Terms,
              you may not use the Service.
            </p>
            <p className="text-future-gray">
              Please read these Terms carefully, including our Privacy Policy and all other linked policies.
            </p>
          </section>

          {/* 1. Eligibility */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                1
              </span>
              Eligibility
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                You must be at least 18 years old and have the legal capacity to enter into binding agreements
                to use JTradePilot.
              </p>
              <p>
                You represent and warrant that your use of the Service complies with all applicable laws and regulations
                in your jurisdiction.
              </p>
              <p>
                If you are accessing the Service on behalf of an organization, you represent that you have authority
                to bind that organization to these Terms.
              </p>
            </div>
          </section>

          {/* 2. Account Registration */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                2
              </span>
              Account Registration
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                To use certain features of JTradePilot, you must create an account. You agree to provide
                accurate and complete information and keep your account information current.
              </p>
              <p>
                You are responsible for maintaining the confidentiality of your password and account credentials.
                You agree to accept responsibility for all activities that occur under your account.
              </p>
              <p>
                You must notify us immediately of any unauthorized access or use of your account.
              </p>
              <p>
                We reserve the right to suspend or terminate your account if information provided is false, inaccurate,
                or violates these Terms.
              </p>
            </div>
          </section>

          {/* 3. Subscription & Billing */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                3
              </span>
              Subscription & Billing
            </h2>

            <div className="space-y-4 ml-11">


              <div>
                <h3 className="font-semibold text-future-light mb-2">Automatic Renewal</h3>
                <p className="text-future-gray">
                  Paid subscriptions renew automatically on a monthly or annual basis (as you select) until cancelled.
                  We will charge your payment method on each renewal date. You authorize us to charge you for renewal
                  unless you cancel your subscription.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Cancellation</h3>
                <p className="text-future-gray">
                  You may cancel your subscription at any time through your account settings. Cancellation takes effect
                  at the end of your current billing period. No refunds are provided for unused portions of your subscription period.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Payment Processing</h3>
                <p className="text-future-gray">
                  Subscriptions are processed through Paddle. By providing payment information, you authorize Paddle
                  to process charges on your behalf. Please review Paddle's terms for additional payment terms.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Price Changes</h3>
                <p className="text-future-gray">
                  We may change subscription prices with 30 days' notice. Continued use after the notice period
                  constitutes acceptance of the new price.
                </p>
              </div>
            </div>
          </section>

          {/* 4. User Responsibilities */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                4
              </span>
              User Responsibilities
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                <strong>Trading Decisions:</strong> You alone are responsible for all trading decisions. JTradePilot analysis
                and AI suggestions are educational and not investment advice. You should conduct your own analysis and
                consult with a licensed financial advisor before making trading decisions.
              </p>
              <p>
                <strong>Prohibited Uses:</strong> You agree NOT to:
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Use the Service for illegal purposes or in violation of any laws</li>
                  <li>Harass, abuse, or threaten other users or our staff</li>
                  <li>Attempt to gain unauthorized access to the Service</li>
                  <li>Share your account access with non-subscribers (account sharing violation)</li>
                  <li>Scrape, spider, or otherwise automatically access the Service</li>
                  <li>Modify or reverse-engineer the Service</li>
                  <li>Use the Service to violate third-party intellectual property rights</li>
                  <li>Spam or distribute unsolicited messages</li>
                  <li>Use the Service for high-frequency trading bots or algorithmic trading without permission</li>
                </ul>
              </p>
              <p>
                <strong>Responsible Trading:</strong> You agree to use trading discipline and risk management practices.
                Only trade with money you can afford to lose.
              </p>
            </div>
          </section>

          {/* 5. AI Analysis Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                5
              </span>
              AI Analysis & Limitations
            </h2>

            <div className="space-y-4 ml-11">
              <p className="text-future-gray">
                <strong>NOT Investment Advice:</strong> JTradePilot's AI analysis is provided for educational purposes
                only and does NOT constitute investment advice, trading signals, or financial recommendations.
              </p>

              <p className="text-future-gray">
                <strong>Error Possibility:</strong> AI analysis may contain errors, omissions, or inaccuracies.
                The AI is trained on general patterns and may not account for your specific trading context,
                market conditions, or risk tolerance.
              </p>

              <p className="text-future-gray">
                <strong>No Guarantees:</strong> We do not guarantee the accuracy, completeness, or reliability of
                AI analysis. Past AI analysis performance does not guarantee future accuracy.
              </p>

              <p className="text-future-gray">
                <strong>Your Responsibility:</strong> You are solely responsible for evaluating AI suggestions.
                Always verify recommendations with your own analysis before trading.
              </p>

              <p className="text-future-gray">
                <strong>Data Sharing:</strong> To provide AI analysis, your trading data and screenshots may be
                sent to Google Gemini API. Please review Google's privacy policy and terms before using AI features.
              </p>
            </div>
          </section>

          {/* 6. Risk Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                6
              </span>
              Trading Risk & Disclaimer
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                <strong>Substantial Risk:</strong> Trading in financial markets (forex, stocks, crypto, indices, commodities)
                involves substantial risk of loss. Most traders lose money.
              </p>
              <p>
                <strong>Past Performance:</strong> Past trading results do not guarantee future performance.
                Historical data shown on JTradePilot should not be considered as a guarantee of future profitability.
              </p>
              <p>
                <strong>Individual Results:</strong> Results shown for other users are specific to their circumstances.
                Your results will differ based on your broker, market conditions, position sizing, and discipline.
              </p>
              <p>
                <strong>Only Risk Capital:</strong> Only trade with capital you can afford to lose completely.
                Do not trade with money needed for living expenses or debt obligations.
              </p>
              <p>
                <strong>Leverage Amplifies Risk:</strong> Using leverage amplifies both profits and losses.
                High leverage can result in complete loss of capital.
              </p>
              <p>
                <strong>Not for Everyone:</strong> Trading is not suitable for everyone. If you are unsure about the risks,
                consult a financial advisor before trading.
              </p>
            </div>
          </section>

          {/* 7. Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                7
              </span>
              Intellectual Property Rights
            </h2>

            <div className="space-y-4 ml-11">
              <div>
                <h3 className="font-semibold text-future-light mb-2">Our Content</h3>
                <p className="text-future-gray">
                  All content on JTradePilot, including but not limited to text, graphics, logos, and software,
                  is owned by JTradePilot or our licensors and is protected by copyright and intellectual property laws.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Your Content</h3>
                <p className="text-future-gray">
                  By uploading trading data, screenshots, playbooks, or other content to JTradePilot, you grant us
                  a non-exclusive license to store, process, and display your content to provide the Service.
                </p>
                <p className="text-future-gray">
                  If you mark playbooks as "public," other users may view and learn from your strategies.
                  You retain ownership of your content and can delete it at any time.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Restrictions</h3>
                <p className="text-future-gray">
                  You may not copy, modify, distribute, sell, or exploit any portion of JTradePilot without
                  prior written permission from JTradePilot.
                </p>
              </div>
            </div>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                8
              </span>
              Limitation of Liability
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                <strong>AS-IS BASIS:</strong> JTradePilot is provided "AS IS" without warranties of any kind,
                express or implied. We do not warrant that the Service will be error-free, secure, or continuously available.
              </p>
              <p>
                <strong>NO LIABILITY FOR TRADING LOSSES:</strong> We are NOT liable for any trading losses, including losses
                resulting from: use of AI analysis, technical errors, service interruptions, or market movements.
              </p>
              <p>
                <strong>LIMITED DAMAGES:</strong> To the maximum extent permitted by law, JTradePilot's liability to you
                for any claims arising from these Terms shall not exceed the amount you paid for your subscription in the
                12 months preceding the claim.
              </p>
              <p>
                <strong>EXCLUSION:</strong> In no event shall JTradePilot be liable for: lost profits, lost data,
                lost opportunities, indirect damages, consequential damages, or punitive damages, even if warned of the possibility.
              </p>
            </div>
          </section>

          {/* 9. Disclaimer of Warranties */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                9
              </span>
              Disclaimer of Warranties
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                <strong>To the maximum extent permitted by law, JTradePilot is provided on an "AS-IS" and "AS-AVAILABLE" basis.
                  We make no warranties, representations, or conditions of any kind, including:</strong>
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Accuracy or completeness of trading data</li>
                <li>Accuracy of AI analysis</li>
                <li>Suitability of the Service for your purposes</li>
                <li>Fitness for a particular purpose</li>
                <li>Non-infringement of third-party rights</li>
                <li>Uninterrupted or error-free operation</li>
              </ul>
            </div>
          </section>

          {/* 10. Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                10
              </span>
              Indemnification
            </h2>

            <p className="ml-11 text-future-gray">
              You agree to defend, indemnify, and hold harmless JTradePilot and its officers, directors, employees,
              and agents from any claims, damages, losses, liabilities, and expenses (including attorney's fees) arising
              from: your use of the Service, your violation of these Terms, your trading activities, or your content.
            </p>
          </section>

          {/* 11. Suspension & Termination */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                11
              </span>
              Suspension & Termination
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                We may suspend or terminate your account immediately, without notice, if you:
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Violate these Terms</li>
                <li>Engage in fraudulent or illegal activity</li>
                <li>Share your account with non-subscribers</li>
                <li>Abuse the Service or other users</li>
              </ul>
              <p className="mt-3">
                Upon termination, your right to use the Service ends immediately. We may delete your account data
                after a 30-day grace period, though data may be retained for legal compliance.
              </p>
            </div>
          </section>

          {/* 12. Changes to Service */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                12
              </span>
              Changes to Service
            </h2>

            <p className="ml-11 text-future-gray">
              We may modify, suspend, or discontinue the Service (or any feature) at any time with or without notice.
              We will notify you of material changes. Your continued use constitutes acceptance of changes.
            </p>
          </section>

          {/* 13. Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                13
              </span>
              Governing Law & Dispute Resolution
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                These Terms shall be governed by and interpreted in accordance with applicable laws.
              </p>
              <p>
                Any disputes shall be resolved through binding arbitration, except that either party may pursue injunctive relief
                in court for intellectual property violations or account misuse.
              </p>
              <p>
                By using JTradePilot, you agree to submit to arbitration instead of litigation.
              </p>
            </div>
          </section>

          {/* 14. Contact Us */}
          <section className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                14
              </span>
              Contact Us
            </h2>

            <div className="ml-11 space-y-3">
              <p className="text-future-gray">
                For questions about these Terms, please contact:
              </p>
              <p className="text-future-gray">
                <strong>Legal Business Name:</strong> JTradePilot (Sole Proprietorship)
              </p>
              <p className="text-future-gray">
                <strong>Email:</strong> support@jtradepilot.com
              </p>
            </div>
          </section>

        </div>
      </div >

      <PublicFooter />
    </div >
  );
};

export default TermsOfServicePage;
