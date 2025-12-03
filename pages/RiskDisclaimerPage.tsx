import React from 'react';

const RiskDisclaimerPage: React.FC = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-future-dark pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-orbitron font-bold text-future-light mb-4">
            Risk Disclaimer & Disclosures
          </h1>
          <p className="text-future-gray">
            Last updated: December 2024
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-future-light">
          {/* Critical Warning */}
          <section className="bg-risk-high/15 rounded-lg p-8 border-2 border-risk-high/50">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⚠️</div>
              <div>
                <h2 className="text-2xl font-bold text-risk-high mb-4">
                  TRADING INVOLVES SUBSTANTIAL RISK OF LOSS
                </h2>
                <p className="text-future-light text-lg font-semibold mb-4">
                  Most traders lose money. Trading is not suitable for everyone.
                </p>
                <p className="text-future-gray">
                  JTradePilot is a trading journal and educational tool. Our AI analysis is not investment advice
                  and does not guarantee profits. By using JTradePilot, you acknowledge understanding these risks.
                </p>
              </div>
            </div>
          </section>

          {/* 1. General Trading Risks */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                1
              </span>
              General Trading Risks
            </h2>

            <div className="space-y-4 ml-11">
              <div>
                <h3 className="font-semibold text-future-light mb-2">Market Risk</h3>
                <p className="text-future-gray">
                  Trading in any market (forex, stocks, crypto, indices, commodities) exposes you to market risk.
                  Market prices can move unexpectedly, causing substantial losses. You may lose your entire investment.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Volatility Risk</h3>
                <p className="text-future-gray">
                  Highly volatile markets can experience rapid price swings. In volatile conditions, your positions
                  may be liquidated at worse prices than expected, resulting in larger losses than anticipated.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Leverage Risk</h3>
                <p className="text-future-gray">
                  Trading with leverage amplifies both gains and losses. Using leverage, you can lose more than
                  your initial deposit. Even small market moves against you can wipe out your trading account entirely.
                  High leverage = high risk.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Liquidity Risk</h3>
                <p className="text-future-gray">
                  In some markets or instruments, low liquidity can prevent you from exiting positions at expected prices.
                  This is particularly true for less popular trading pairs, cryptocurrencies, or after-hours trading.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Slippage & Execution Risk</h3>
                <p className="text-future-gray">
                  The actual price you receive may differ from the expected price, especially during volatile market conditions.
                  This difference (slippage) can significantly affect your trading results.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Psychological Risks */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                2
              </span>
              Psychological & Behavioral Risks
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                <strong>Overconfidence:</strong> Success in trading can lead to overconfidence, causing traders to
                take larger positions or more risks than prudent.
              </p>
              <p>
                <strong>Revenge Trading:</strong> After losses, traders often take larger risks to quickly recover losses,
                resulting in deeper losses.
              </p>
              <p>
                <strong>Emotional Trading:</strong> Fear and greed are the primary drivers of poor trading decisions.
                Emotions can override your trading plan.
              </p>
              <p>
                <strong>Confirmation Bias:</strong> Traders often seek analysis that confirms their existing positions,
                ignoring contrary evidence.
              </p>
              <p>
                <strong>Analysis Paralysis:</strong> Over-analysis of markets can cause missed opportunities or delays
                in executing trades.
              </p>
            </div>
          </section>

          {/* 3. Technology Risks */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                3
              </span>
              Technology & System Risks
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                <strong>Internet Connection:</strong> Loss of internet connection can prevent you from monitoring
                or managing positions, resulting in unexpected losses.
              </p>
              <p>
                <strong>Broker System Failures:</strong> Your broker's system may experience outages, preventing
                trade execution or exit. JTradePilot is not responsible for broker system failures.
              </p>
              <p>
                <strong>Platform Errors:</strong> While rare, our platform may experience errors or bugs. We cannot
                guarantee error-free operation. Always maintain independent monitoring of your trades.
              </p>
              <p>
                <strong>Data Security:</strong> While we implement security measures, no system is completely secure.
                Unauthorized access to your account could result in unauthorized trading.
              </p>
            </div>
          </section>

          {/* 4. AI & Analysis Risks */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                4
              </span>
              AI Analysis & Tool Limitations
            </h2>

            <div className="space-y-4 ml-11">
              <div>
                <h3 className="font-semibold text-future-light mb-2">NOT Investment Advice</h3>
                <p className="text-future-gray">
                  JTradePilot's AI analysis is NOT investment advice, trading signals, or recommendations.
                  It is educational content for your review only.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">AI Errors & Inaccuracies</h3>
                <p className="text-future-gray">
                  Our AI may provide incorrect analysis. AI can:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Miss important market context</li>
                    <li>Provide contradictory suggestions</li>
                    <li>Fail to account for your specific situation</li>
                    <li>Make logical errors or false correlations</li>
                  </ul>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Past Analysis ≠ Future Accuracy</h3>
                <p className="text-future-gray">
                  The fact that AI analysis was accurate in the past does not mean it will be accurate in the future.
                  Market conditions change constantly, and AI may not adapt appropriately.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Always Verify Suggestions</h3>
                <p className="text-future-gray">
                  Before using any AI suggestion to inform a trade, you must independently verify the analysis
                  with your own research and judgment.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-future-light mb-2">Data to Third Parties</h3>
                <p className="text-future-gray">
                  Your trading data and screenshots are sent to Google Gemini API for analysis.
                  Review Google's privacy policy and understand the implications of sending sensitive data.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Statistical Realities */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                5
              </span>
              Statistical Reality of Trading
            </h2>

            <div className="space-y-4 ml-11">
              <div className="bg-future-panel/50 rounded p-4 border border-photonic-blue/10">
                <p className="text-future-gray mb-2">
                  <strong>Research shows:</strong>
                </p>
                <ul className="list-disc ml-5 space-y-2 text-future-gray">
                  <li><strong>90% of retail traders lose money</strong> in their first year</li>
                  <li>Most traders who do become profitable take 3-5 years of consistent work</li>
                  <li>Even successful traders experience losing months and losing years</li>
                  <li>Consistency is rare - trading performance varies significantly</li>
                  <li>Account blow-ups (losing entire account) are common among leverage users</li>
                </ul>
              </div>

              <p className="text-future-gray">
                <strong>These are not guaranteed outcomes.</strong> They reflect statistical averages.
                Your results will depend on your skills, discipline, risk management, and luck.
              </p>
            </div>
          </section>

          {/* 6. Past Performance */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                6
              </span>
              Past Performance Disclaimer
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                <strong>PAST PERFORMANCE DOES NOT GUARANTEE FUTURE RESULTS.</strong>
              </p>
              <p>
                Historical trading results shown in JTradePilot (your own or other users') should not be considered
                as a guarantee of future performance. Many factors can change between past and future trading:
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Market conditions change</li>
                <li>Volatility increases or decreases</li>
                <li>Strategies that worked may stop working</li>
                <li>Your emotional/psychological state affects execution</li>
                <li>External events (economic news, black swans) create new risks</li>
              </ul>
            </div>
          </section>

          {/* 7. Personal Responsibility */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                7
              </span>
              Your Personal Responsibility
            </h2>

            <div className="space-y-3 ml-11 text-future-gray">
              <p>
                <strong>You are solely responsible for:</strong>
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>All trading decisions</li>
                <li>Assessing your own risk tolerance</li>
                <li>Position sizing and risk management</li>
                <li>Verifying all analysis before trading</li>
                <li>Losses from your trades</li>
                <li>Understanding all markets you trade</li>
                <li>Maintaining backups of your data</li>
              </ul>
              <p className="mt-3">
                Do not trade based on JTradePilot analysis alone. Do not trade with money you need for living expenses.
                Do not trade if you cannot afford to lose.
              </p>
            </div>
          </section>

          {/* 8. When NOT to Trade */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                8
              </span>
              When NOT to Trade
            </h2>

            <p className="ml-11 text-future-gray mb-4">
              <strong>Consider avoiding trading if:</strong>
            </p>

            <ul className="ml-11 list-disc space-y-2 text-future-gray">
              <li>You don't have a proven, tested trading strategy</li>
              <li>You don't understand the markets you're trading</li>
              <li>You're trading to recover losses (revenge trading)</li>
              <li>You're trading while emotionally stressed</li>
              <li>You don't have an emergency fund separate from trading capital</li>
              <li>You're using leverage you don't fully understand</li>
              <li>You need the money you're planning to trade</li>
              <li>You're trading in a market experiencing unusual volatility</li>
              <li>You're tired or not focused</li>
              <li>You're under the influence of alcohol or drugs</li>
            </ul>
          </section>

          {/* 9. Questions to Ask Yourself */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                9
              </span>
              Before You Trade: Ask Yourself
            </h2>

            <div className="ml-11 space-y-2 text-future-gray">
              <p>✓ Can I afford to lose this entire position?</p>
              <p>✓ Does this fit my trading plan?</p>
              <p>✓ Am I making this decision based on analysis or emotion?</p>
              <p>✓ Have I verified my analysis independently?</p>
              <p>✓ Is my position size appropriate for my account?</p>
              <p>✓ Do I have a clear exit plan?</p>
              <p>✓ What is my worst-case loss on this trade?</p>
              <p>✓ Am I using too much leverage?</p>
            </div>
          </section>

          {/* 10. Seek Professional Advice */}
          <section className="bg-photonic-blue/10 rounded-lg p-6 border border-photonic-blue/30">
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                10
              </span>
              Seek Professional Advice
            </h2>

            <p className="text-future-gray mb-4">
              <strong>If you are unsure about trading:</strong>
            </p>
            <p className="text-future-gray">
              Consult with a licensed financial advisor, investment professional, or trading mentor.
              JTradePilot is not a substitute for professional financial advice.
            </p>
            <p className="text-future-gray mt-4">
              If you believe you have a gambling problem with trading, please seek help from:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>National Council on Problem Gambling (1-800-522-4700 in US)</li>
                <li>Gamblers Anonymous (www.gamblersanonymous.org)</li>
                <li>A mental health professional</li>
              </ul>
            </p>
          </section>

          {/* Acknowledgment */}
          <section className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
            <h2 className="text-xl font-bold text-future-light mb-4">
              By Using JTradePilot, You Acknowledge:
            </h2>
            <div className="ml-4 space-y-2 text-future-gray">
              <p>✓ You understand trading involves substantial risk of loss</p>
              <p>✓ You are responsible for your own trading decisions</p>
              <p>✓ JTradePilot is NOT investment advice</p>
              <p>✓ AI analysis may contain errors</p>
              <p>✓ Past performance ≠ future results</p>
              <p>✓ You have read and understood this disclaimer</p>
              <p>✓ You are trading with money you can afford to lose</p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
            <h2 className="text-2xl font-bold text-future-light mb-4">
              Questions About These Risks?
            </h2>

            <div className="space-y-3">
              <p className="text-future-gray">
                <strong>Email:</strong> support@jtradepilot.com
              </p>
              <p className="text-future-gray">
                <strong>Website:</strong> www.jtradepilot.com
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-photonic-blue/10">
            <p className="text-future-gray text-sm text-center">
              © 2024 JTradePilot. All rights reserved. | Risk Disclaimer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskDisclaimerPage;
