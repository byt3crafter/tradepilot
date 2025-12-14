import React, { useState } from 'react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

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
      category: 'General Questions',
      questions: [
        {
          q: 'Is JTradePilot for me?',
          a: 'If you want to improve your trading through data and discipline, then yes. We built this for two types of traders: New Traders who need a simple way to build good habits, and Prop Firm Traders who need to strictly track their risk and drawdown rules.',
        },
        {
          q: 'Is this a signal service?',
          a: 'No. We don\'t tell you what to buy or sell. We give you the tools to analyze your own trades so you can learn what works best for YOU.',
        },
        {
          q: 'Is it free to start?',
          a: 'JTradePilot is a premium tool for serious traders. We offer a simple, affordable monthly subscription that you can cancel anytime. There are no long-term contracts.',
        },
      ],
    },
    {
      category: 'For Prop Traders',
      questions: [
        {
          q: 'Does it track daily drawdown?',
          a: 'Yes. You can set up your specific account size and max daily loss limits. We help you monitor exactly how close you are to breaching rules so you can stay funded.',
        },
        {
          q: 'Does it work with FTMO/FundedNext/etc?',
          a: 'Yes. Our platform is platform-agnostic. You can manually log your trades from any prop firm account and we will track your metrics against your defined objectives.',
        },
      ],
    },
    {
      category: 'For New Traders',
      questions: [
        {
          q: 'I am a total beginner.',
          a: 'Welcome! JTradePilot is designed to be simple. We don\'t overwhelm you with advanced features until you are ready. Start by simply logging your trades (win or loss) and writing a small note about why you took them.',
        },
        {
          q: 'Do I need to connect my broker account?',
          a: 'No. To keep things safe and simple, you manually log your trades. It takes about 20 seconds per trade and actually helps you review the trade more deeply than an automatic sync.',
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
    <div className="h-screen overflow-y-auto bg-future-dark">
      <PublicNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                          className={`text-photonic-blue text-2xl flex-shrink-0 ml-4 transition-transform ${isExpanded ? 'rotate-180' : ''
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
      </div>

      <PublicFooter />
    </div>
  );
};

export default FAQPage;
