import React from 'react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const RefundPolicyPage: React.FC = () => {
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
                            Thank you for choosing JTradePilot. We appreciate your business and want to ensure you have a
                            clear understanding of our refund policy.
                        </p>
                        <p className="text-future-gray">
                            Please read this policy carefully before making a purchase. By subscribing to JTradePilot,
                            you agree to the terms outlined below.
                        </p>
                    </section>

                    {/* 1. Subscription Cancellation */}
                    <section>
                        <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
                            <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                                1
                            </span>
                            Subscription Cancellation
                        </h2>

                        <div className="space-y-3 ml-11 text-future-gray">
                            <p>
                                You may cancel your subscription at any time through your account settings.
                            </p>
                            <p>
                                <strong>Effect of Cancellation:</strong> If you cancel, your subscription will remain active until
                                the end of your current billing period. You will not be charged again after cancellation.
                            </p>
                            <p>
                                <strong>No Partial Refunds:</strong> We do not provide refunds or credits for any partial subscription
                                periods or unused time.
                            </p>
                        </div>
                    </section>

                    {/* 2. Right of Withdrawal (Paddle Policy) */}
                    <section>
                        <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
                            <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                                2
                            </span>
                            Right of Withdrawal (14-Day Money-Back Guarantee)
                        </h2>

                        <div className="space-y-3 ml-11 text-future-gray">
                            <p>
                                In accordance with Paddle's Buyer Terms and consumer protection laws, you have the right to withdraw from your purchase and request a full refund within <strong>14 days</strong> of the initial transaction date, provided you have not significantly utilized the service (e.g., accessed proprietary content, downloaded resources, or used advanced features excessively).
                            </p>
                            <p>
                                <strong>How to Exercise Your Right:</strong> To request a refund under this policy, simply contact our support team within 14 days of your purchase. No specific reason is required, though feedback is appreciated.
                            </p>
                            <p>
                                <strong>After 14 Days:</strong> After the initial 14-day period has passed, all sales are final, and no refunds will be issued for the remainder of the subscription term.
                            </p>
                        </div>
                    </section>

                    {/* 3. Exceptions to Refund Policy */}
                    <section>
                        <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
                            <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                                3
                            </span>
                            Exceptions
                        </h2>

                        <div className="space-y-3 ml-11 text-future-gray">
                            <p>
                                We may consider refund requests outside the 14-day window in the following exceptional circumstances:
                            </p>
                            <ul className="list-disc ml-5 space-y-1">
                                <li>
                                    <strong>Billing Errors:</strong> If you were charged incorrectly or multiple times for the same period due to a technical error.
                                </li>
                                <li>
                                    <strong>Technical Issues:</strong> If you are unable to access the service due to a technical issue on our end that we cannot resolve within a reasonable timeframe.
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* 4. Chargebacks and Disputes */}
                    <section>
                        <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
                            <span className="w-8 h-8 rounded-full bg-photonic-blue text-future-dark flex items-center justify-center text-sm font-bold mr-3">
                                4
                            </span>
                            Chargebacks and Disputes
                        </h2>

                        <div className="space-y-3 ml-11 text-future-gray">
                            <p>
                                We follow this 14-day refund process as an effective measure to avoid chargebacks and the fees that these incur.
                            </p>
                            <p>
                                If you are unsatisfied with the service, <strong>please contact us first</strong> to request a refund. If you initiate a chargeback or dispute with your payment provider without contacting us first, your account will be immediately suspended, and we reserve the right to dispute the chargeback with evidence of your usage and our refund policy.
                            </p>
                        </div>
                    </section>

                    {/* Contact Us */}
                    <section className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10 mt-8">
                        <h2 className="text-2xl font-bold text-future-light mb-4 flex items-center">
                            Contact Us
                        </h2>

                        <div className="space-y-3">
                            <p className="text-future-gray">
                                If you have any questions about this Refund Policy, please contact us:
                            </p>
                            <p className="text-future-gray">
                                <strong>Email:</strong> legal@jtradepilot.com
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            <PublicFooter />
        </div>
    );
};

export default RefundPolicyPage;
