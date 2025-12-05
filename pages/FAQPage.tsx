import React, { useState } from 'react';

interface FAQItem {
  category: string;
  questions: {
    q: string;
    a: string;
  }[];
}

const FAQPage: React.FC = () => {
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const faqs: FAQItem[] = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'What is JTradePilot?',
          a: 'JTradePilot is a trading journal and analytics platform designed to help traders build discipline through systematic reflection. We help you log trades, analyze your performance, document trading setups (playbooks), and track trading objectives. Our AI provides educational insights to help you understand your trading patterns.',
        },
        {
          q: 'Is JTradePilot a trading signal provider?',
          a: 'No. We do NOT provide trading signals or tell you when to trade. JTradePilot is designed to help you reflect on trades you\'ve already made. We provide educational analysis using AI, but this is NOT investment advice.',
        },
        {
          q: 'Do I need to be an experienced trader to use JTradePilot?',
          a: 'No. JTradePilot is designed for traders at all levels, from beginners to professionals. If you trade and want to improve, JTradePilot can help. We\'re especially useful for new traders building consistent trading habits.',
        },
        {
          q: 'Is there a free trial?',
          a: 'Yes! New users get a free trial period (typically 14 days). You can try all features without entering payment information. At the end of your trial, your account will convert to a paid subscription unless you cancel.',
        },
      ],
    },
    {
      category: 'Features & Usage',
      questions: [
        {
          q: 'How do I log a trade?',
          a: 'Go to the Trades section and click "Add Trade." Enter your entry date/time, exit date/time, symbol, entry price, exit price, lot size, direction (buy/sell), and outcome (win/loss/breakeven). You can also add screenshots and notes. The entire process takes about 30 seconds per trade.',
        },
        {
          q: 'Can I import trades from my broker?',
          a: 'Yes! We support bulk import. You can copy your trading history from your broker and paste it into JTradePilot. We\'ll parse the data and create trades automatically. This saves time if you have many historical trades.',
        },
        {
          q: 'What is a Playbook?',
          a: 'A playbook documents your trading strategy. It includes: your trading setups (specific entry conditions), entry criteria (checklist), exit rules, and risk management rules. Playbooks help you systematize your trading and measure which setups actually work. You can mark playbooks as private (only you see them) or public (other traders can learn from your strategy).',
        },
        {
          q: 'How do I use AI analysis?',
          a: 'Our AI automatically analyzes your trades, identifies patterns, and provides insights. You can also use AI features like: trade analysis (common mistakes), chart analysis from screenshots, trade idea generation, and text-to-trade parsing. Remember: AI analysis is educational and may contain errors. Always verify before trading.',
        },
        {
          q: 'Can I track multiple trading accounts?',
          a: 'Yes! You can create multiple broker accounts (DEMO, LIVE, PROP_FIRM) and switch between them. Each account has its own trades, playbooks, and objectives. This is useful if you trade multiple accounts or account types.',
        },
        {
          q: 'What metrics does JTradePilot calculate?',
          a: 'We calculate: Total PL, number of trades, win rate, profit factor, expectancy, largest wins/losses, average hold time, performance by asset, performance by day of week, and performance by hour of day. These metrics help you understand what\'s working in your trading.',
        },
      ],
    },
    {
      category: 'AI & Analysis',
      questions: [
        {
          q: 'Is the AI 100% accurate?',
          a: 'No. Our AI is educational and may contain errors. The AI is trained on general patterns and may miss important context about your specific trades or market conditions. Always verify AI suggestions with your own analysis before using them in trading decisions.',
        },
        {
          q: 'Does JTradePilot guarantee profitable trading?',
          a: 'No. We cannot and do not guarantee profits. Trading involves substantial risk of loss. Most traders lose money. JTradePilot is a tool to help you understand your trading and build discipline. Your results depend on your skills, discipline, risk management, and market conditions.',
        },
        {
          q: 'What happens to my data when I use AI features?',
          a: 'When you use AI features, your trading data and screenshots are sent to Google Gemini API for processing. This is necessary to provide AI analysis. Please review Google\'s privacy policy to understand how they handle data. Non-AI features don\'t require data sharing.',
        },
        {
          q: 'Can I turn off AI analysis?',
          a: 'Yes. You can use JTradePilot without AI features. Simply don\'t click AI analysis buttons. All journaling, tracking, and basic analytics work without AI.',
        },
      ],
    },
    {
      category: 'Account & Subscription',
      questions: [
        {
          q: 'How much does JTradePilot cost?',
          a: 'We offer different subscription tiers depending on your needs. See our Pricing page for current pricing. All plans include a free trial to test features before committing to a paid plan.',
        },
        {
          q: 'Can I upgrade or downgrade my subscription?',
          a: 'Yes. You can upgrade or downgrade your subscription at any time through your account settings. Changes take effect at your next billing cycle.',
        },
        {
          q: 'How do I cancel my subscription?',
          a: 'You can cancel anytime through your account settings. Your subscription remains active until the end of the current billing period. No refunds are provided for unused portions of your billing period.',
        },
        {
          q: 'What payment methods do you accept?',
          a: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and other payment methods through Paddle. Payment processing is handled securely by Paddle.',
        },
        {
          q: 'Do you offer refunds?',
          a: 'Refunds are generally not provided for used subscription time. However, if you experience a technical issue or billing error, please contact us at support@jtradepilot.com and we\'ll work with you to resolve it.',
        },
        {
          q: 'What happens to my data if I cancel?',
          a: 'Your trading data, playbooks, and analysis remain accessible for 30 days after cancellation. After 30 days, your data will be deleted permanently. You can request data download before cancellation.',
        },
      ],
    },
    {
      category: 'Trading & Risk',
      questions: [
        {
          q: 'Can JTradePilot help me become profitable?',
          a: 'JTradePilot can help you understand your trading and identify patterns. But becoming profitable depends on YOU—your skills, discipline, risk management, and trading plan. JTradePilot is a tool to support improvement, not a magic solution.',
        },
        {
          q: 'Does JTradePilot connect to my broker account?',
          a: 'No. We DO NOT connect to your broker or access your real account. This is intentional for security. You manually log trades into JTradePilot. This also prevents us from sending your sensitive broker credentials anywhere.',
        },
        {
          q: 'Is my trading data secure?',
          a: 'Yes. Your data is encrypted in transit (HTTPS) and at rest in our database. We implement industry-standard security measures. However, no system is 100% secure. If you suspect unauthorized access, contact us immediately.',
        },
        {
          q: 'How much capital should I have to start trading?',
          a: 'This depends on your trading style and broker. Most brokers require $500-$2,000 minimum to open an account, though some crypto exchanges accept less. Important: Only trade with money you can afford to lose completely. Do not trade with money you need for living expenses.',
        },
        {
          q: 'What if I have a trading problem or addiction?',
          a: 'If you believe you have a gambling problem or trading addiction, please reach out to: National Council on Problem Gambling (1-800-522-4700 in US), Gamblers Anonymous (www.gamblersanonymous.org), or a mental health professional. There is help available.',
        },
      ],
    },
    {
      category: 'Technical & Support',
      questions: [
        {
          q: 'What browsers does JTradePilot support?',
          a: 'JTradePilot works on all modern browsers: Chrome, Firefox, Safari, and Edge. We recommend the latest version of your browser for best performance.',
        },
        {
          q: 'Does JTradePilot have a mobile app?',
          a: 'Currently, JTradePilot is web-based and works on all devices including phones and tablets. A native mobile app may be developed in the future based on user feedback.',
        },
        {
          q: 'What if I encounter a bug or issue?',
          a: 'Please report bugs to support@jtradepilot.com with details about what happened. Include: what you were doing, what you expected to happen, and what actually happened. Screenshots are helpful. We prioritize bug fixes quickly.',
        },
        {
          q: 'How can I suggest a feature?',
          a: 'We love feedback! Submit feature requests to feedback@jtradepilot.com or use the feedback form in your account. Since we\'re in beta, your suggestions directly influence what we build next.',
        },
        {
          q: 'What if I forget my password?',
          a: 'Click "Forgot Password" on the login page and follow the email instructions to reset your password. If you don\'t receive an email, check your spam folder or contact support@jtradepilot.com.',
        },
        {
          q: 'How do I contact support?',
          a: 'You can reach our support team at support@jtradepilot.com. We typically respond within 24 hours during business days.',
        },
      ],
    },
    {
      category: 'Privacy & Legal',
      questions: [
        {
          q: 'Is my trading data private?',
          a: 'Yes. Your trading data is private to you (unless you make a playbook public, which you control). We do not share your trading data with other users or third parties. See our Privacy Policy for details.',
        },
        {
          q: 'Do you sell my data?',
          a: 'No. We DO NOT sell your data to anyone. Your trading data belongs to you. We only use your data to provide the service and generate AI analysis.',
        },
        {
          q: 'What is your privacy policy?',
          a: 'Our Privacy Policy explains how we collect, use, and protect your data. It covers data security, user rights, and third-party services. Read it at: jtradepilot.com/privacy',
        },
        {
          q: 'What are the Terms of Service?',
          a: 'Our Terms of Service explain your rights and responsibilities when using JTradePilot. They cover account usage, subscriptions, liability, and trading risks. Read them at: jtradepilot.com/terms',
        },
        {
          q: 'Do you have a risk disclaimer?',
          a: 'Yes. Our Risk Disclaimer clearly explains trading risks: substantial loss risk, no profit guarantees, AI errors, leverage risks, etc. Read it before using JTradePilot: jtradepilot.com/risk-disclaimer',
        },
        {
          q: 'Can I download my data?',
          a: 'Yes. You can export your trading data, playbooks, and analysis in standard formats (JSON/CSV) through your account settings. This ensures you own your data.',
        },
        {
          q: 'Can I delete my account?',
          a: 'Yes. You can request account deletion anytime. This will remove your account and data from our active systems. Backups may be retained for a limited period for legal compliance.',
        },
      ],
    },
  ];

  return (
    <div className="h-screen overflow-y-auto bg-future-dark pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-orbitron font-bold text-future-light mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-future-gray text-lg">
            Can't find your answer? Contact us at support@jtradepilot.com
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-12">
          {faqs.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h2 className="text-2xl font-bold text-photonic-blue mb-6 pb-3 border-b border-photonic-blue/20">
                {section.category}
              </h2>

              <div className="space-y-3">
                {section.questions.map((item, itemIndex) => {
                  const key = `${sectionIndex}-${itemIndex}`;
                  const isExpanded = expanded[key] || false;

                  return (
                    <div
                      key={key}
                      className="bg-future-panel/50 rounded-lg border border-photonic-blue/10 overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => toggleExpand(key)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-future-panel/70 transition-colors"
                      >
                        <h3 className="text-lg font-semibold text-future-light text-left">
                          {item.q}
                        </h3>
                        <span
                          className={`text-photonic-blue text-2xl flex-shrink-0 ml-4 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          ▼
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-6 py-4 bg-future-panel border-t border-photonic-blue/10">
                          <p className="text-future-gray leading-relaxed">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still Need Help */}
        <section className="mt-16 bg-photonic-blue/10 rounded-lg p-8 border border-photonic-blue/30">
          <h2 className="text-2xl font-bold text-future-light mb-4 text-center">
            Still Have Questions?
          </h2>
          <p className="text-future-gray text-center mb-6">
            We're here to help. Reach out anytime—we typically respond within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@jtradepilot.com"
              className="px-6 py-3 bg-photonic-blue text-future-dark font-semibold rounded-lg hover:bg-photonic-blue/90 transition-colors text-center"
            >
              Email Support
            </a>
            <a
              href="/about"
              className="px-6 py-3 bg-future-panel text-future-light font-semibold rounded-lg border border-photonic-blue/20 hover:border-photonic-blue/40 transition-colors text-center"
            >
              Learn About Us
            </a>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-photonic-blue/10 text-center">
          <p className="text-future-gray text-sm">
            © 2024 JTradePilot. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
