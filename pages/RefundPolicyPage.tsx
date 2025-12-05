import React from 'react';

const RefundPolicyPage: React.FC = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-future-dark pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-orbitron font-bold text-future-light mb-4">
            Refund Policy
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
              At jTradeJournal, we strive to provide the best service possible. This Refund Policy
              outlines the terms and conditions under which refunds may be issued.
            </p>
            <p className="text-future-gray">
              By purchasing a subscription or using our services, you agree to the terms outlined
              in this Refund Policy.
            </p>
          </section>

          {/* 1. Free Trial */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                1
              </span>
              Free Trial Period
            </h2>
            <div className="space-y-4 ml-11">
              <p className="text-future-gray">
                We offer a free trial period to allow you to evaluate our service. During this period,
                you have full access to our features without any charges. You may cancel at any time
                during the trial period without incurring any fees.
              </p>
            </div>
          </section>

          {/* 2. Subscription Refunds */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                2
              </span>
              Subscription Refunds
            </h2>
            <div className="space-y-4 ml-11">
              <p className="text-future-gray">
                All subscription fees are non-refundable except as required by law. Once your
                subscription period begins, you will not be eligible for a refund, regardless
                of usage.
              </p>
              <p className="text-future-gray">
                However, we may consider refund requests on a case-by-case basis for exceptional
                circumstances, such as technical issues that prevent you from accessing the service.
              </p>
            </div>
          </section>

          {/* 3. Cancellation */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                3
              </span>
              Cancellation Policy
            </h2>
            <div className="space-y-4 ml-11">
              <p className="text-future-gray">
                You may cancel your subscription at any time through your account settings. Upon
                cancellation, you will retain access to the service until the end of your current
                billing period. No partial refunds will be provided for the remaining time in your
                billing cycle.
              </p>
            </div>
          </section>

          {/* 4. Payment Errors */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                4
              </span>
              Payment Errors
            </h2>
            <div className="space-y-4 ml-11">
              <p className="text-future-gray">
                If you believe you have been charged in error, please contact us immediately at
                support@jtradejournal.com. We will investigate the issue and issue a refund if
                the charge was made in error.
              </p>
            </div>
          </section>

          {/* 5. How to Request a Refund */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                5
              </span>
              How to Request a Refund
            </h2>
            <div className="space-y-4 ml-11">
              <p className="text-future-gray">
                To request a refund, please contact our support team at support@jtradejournal.com
                with the following information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-future-gray ml-4">
                <li>Your account email address</li>
                <li>Transaction ID or receipt</li>
                <li>Detailed reason for the refund request</li>
              </ul>
              <p className="text-future-gray">
                Refund requests are typically processed within 5-10 business days.
              </p>
            </div>
          </section>

          {/* 6. Contact Us */}
          <section>
            <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                6
              </span>
              Contact Us
            </h2>
            <div className="space-y-4 ml-11">
              <p className="text-future-gray">
                If you have any questions about this Refund Policy, please contact us:
              </p>
              <ul className="list-none space-y-2 text-future-gray ml-4">
                <li><strong>Email:</strong> support@jtradejournal.com</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="text-photonic-blue hover:text-photonic-blue/80 font-semibold transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicyPage;
