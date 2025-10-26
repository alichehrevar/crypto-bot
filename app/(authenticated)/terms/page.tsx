'use client';

import type { FC } from 'react';

import React, { useState, useRef } from 'react';
import Link from "next/link";

// Note: The <Head> component from 'next/head' is part of the legacy pages router.
// In the app router, metadata and head tags are typically handled in layout.tsx or page.tsx files.
// It has been removed from this component to ensure compatibility and resolve the compilation error.

// This component encapsulates the entire legal page, including its own styling and logic.
const LegalPageComponent: FC = () => {
    // State to manage the currently active tab. Defaults to 'Terms of Service'.
    const [activeTab, setActiveTab] = useState<'tos' | 'privacy'>('tos');

    // A ref to the scrollable content container to reset scroll position on tab change.
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Handler for switching between the 'Terms of Service' and 'Privacy Policy' tabs.
    const handleTabSwitch = (e: React.MouseEvent<HTMLButtonElement>, tab: "tos" | "privacy") => {
        e.preventDefault();
        setActiveTab(tab);
        // When a tab is switched, scroll the content area back to the top.
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    };

    // Dynamic class names for tabs based on the active state.
    const getTabClassName = (tab: 'tos' | 'privacy') => {
        const isActive = activeTab === tab;

        return `legal-tab ${isActive ? 'active' : ''}`;
    };

    return (
        <div className="container mx-auto">
            <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
                <div className="main-container backdrop-blur-sm border-2 rounded-[2.5rem] shadow-2xl w-full h-[95vh] md:h-[90vh] relative overflow-hidden flex flex-col pb-3">
                    <header className="p-6 sm:p-8 border-b flex justify-between items-center flex-shrink-0" style={{ borderColor: 'var(--color-border-secondary)' }}>
                        <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            United Algos Legal
                        </div>
                        <nav className="text-sm space-x-6">
                            <button className={getTabClassName('tos')} onClick={(e) => handleTabSwitch(e, 'tos')}>Terms of Service</button>
                            <button className={getTabClassName('privacy')} onClick={(e) => handleTabSwitch(e, 'privacy')}>Privacy Policy</button>
                            <Link className="hover:text-gray-500 transition-colors" href="/help-center" style={{ color: 'var(--color-text-secondary)' }}>Help Center</Link>
                        </nav>
                    </header>

                    <div ref={scrollContainerRef} className="flex-grow overflow-y-auto no-scrollbar p-6 sm:p-8" id="scroll-container">
                        {/* Conditionally render content based on the active tab */}
                        {activeTab === 'tos' && (
                            <div className="policy-content" id="content-tos">
                                <header className="mb-10">
                                    <h1 className="!mt-0">Terms of Service</h1>
                                    <p className="text-lg">Last Updated: October 13, 2025</p>
                                </header>
                                <section id="introduction-tos">
                                    <h2>1. Introduction and Acceptance of Terms</h2>
                                    <p>Welcome to United Algos (&#34;we,&#34; &#34;us,&#34; or &#34;our&#34;). These Terms of Service (&#34;Terms&#34;) govern your access to and use of the United Algos platform, website, software, and related automated trading services (collectively, the &#34;Services&#34;).</p>
                                    <p>By accessing or using the Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not use our Services. This is a legally binding agreement.</p>
                                </section>

                                <section id="eligibility-tos">
                                    <h2>2. Eligibility and Registration</h2>
                                    <h3>2.1. Age Requirement</h3>
                                    <p>You must be at least 18 years old to use the Services.</p>
                                    <h3>2.2. Jurisdictional Restrictions</h3>
                                    <p>The Services are not intended for use by individuals or entities in jurisdictions where such use would be contrary to local laws or regulations. It is your responsibility to ensure that your use of the Services complies with the laws of your jurisdiction. We reserve the right to restrict access to the Services in certain countries or regions.</p>
                                    <h3>2.3. Registration</h3>
                                    <p>You must register for an account to use the Services. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate.</p>
                                </section>

                                <section id="services-tos">
                                    <h2>3. Services Description</h2>
                                    <p>United Algos provides a software-as-a-service (SaaS) platform that allows users to configure and deploy automated trading algorithms (&#34;Bots&#34;) to interact with supported third-party cryptocurrency exchanges.</p>
                                    <p><strong>United Algos is a tool provider; we are not a financial advisor, broker, exchange, or money transmitter.</strong> We do not provide investment advice, and the strategies available on the platform should not be construed as such. We do not manage your funds directly; your funds remain on your third-party exchange accounts.</p>
                                </section>

                                <section id="security-tos">
                                    <h2>4. User Accounts and Security</h2>
                                    <p>You are solely responsible for maintaining the confidentiality of your account credentials (username and password). You are responsible for all activities that occur under your account.</p>
                                    <p>We strongly recommend the use of Two-Factor Authentication (2FA) for enhanced security. You must immediately notify United Algos of any unauthorized use of your account or any other breach of security.</p>
                                </section>

                                <section id="api-keys-tos">
                                    <h2>5. API Keys and Exchange Connectivity</h2>
                                    <h3>5.1. User Responsibility</h3>
                                    <p>To use the automated trading features, you must provide API keys generated by your cryptocurrency exchange. You are solely responsible for the security and configuration of these API keys.</p>
                                    <h3>5.2. Permissions</h3>
                                    <p><strong>You must never grant &#34;Withdrawal&#34; permissions to the API keys used with United Algos.</strong> The Services only require &#34;Read&#34; and &#34;Trade&#34; permissions. United Algos will not be liable for any loss resulting from permissions granted by you.</p>
                                    <h3>5.3. Connectivity</h3>
                                    <p>We strive to maintain stable connectivity with supported exchanges. However, we are not responsible for downtime, latency, or errors caused by the exchange&#39;s API, network issues, or other factors outside our control.</p>
                                </section>

                                <section id="fees-tos">
                                    <h2>6. Fees, Subscriptions, and Payments</h2>
                                    <h3>6.1. Subscription Fees</h3>
                                    <p>Access to certain features of the Services requires a paid subscription. Fees are stated on our website and are subject to change.</p>
                                    <h3>6.2. Payments</h3>
                                    <p>Subscriptions are billed in advance on a recurring basis (monthly or annually). Payments are processed by third-party payment processors. You must provide valid payment information.</p>
                                    <h3>6.3. Refunds</h3>
                                    <p>All fees are non-refundable, except as expressly provided in these Terms or as required by applicable law.</p>
                                </section>

                                <section className="risk-disclosure" id="risk-disclosure-tos">
                                    <h2>7. Risk Disclosure and Assumption of Risk</h2>
                                    <div className="risk-content">
                                        <p><strong>This section is critical. Please read it carefully.</strong></p>
                                        <h3>7.1. High Risk Investment</h3>
                                        <p>Trading cryptocurrencies involves substantial risk of loss and is not suitable for every investor. The valuation of cryptocurrencies may fluctuate, and, as a result, you may lose more than your original investment.</p>
                                        <h3>7.2. No Financial Advice</h3>
                                        <p>United Algos does not provide financial, investment, or legal advice. Information provided on the platform, including Bot performance statistics, is for informational purposes only. You are solely responsible for determining whether any investment, strategy, or related transaction is appropriate for you based on your personal objectives, financial circumstances, and risk tolerance.</p>
                                        <h3>7.3. Automation Risks</h3>
                                        <p>Automated trading systems rely on software, hardware, and network connectivity. Errors, bugs, or unexpected market events can lead to significant losses. You acknowledge that the use of automated trading systems carries inherent risks, including the risk of the system failing to execute trades as intended.</p>
                                        <h3>7.4. Past Performance</h3>
                                        <p>Past performance of any trading strategy is not indicative of future results. Historical data and backtesting results do not guarantee future profitability.</p>
                                        <h3>7.5. Assumption of Risk</h3>
                                        <p>By using the Services, you acknowledge and accept these risks and agree that United Algos is not responsible for any financial losses incurred.</p>
                                    </div>
                                </section>

                                <section id="ip-rights-tos">
                                    <h2>8. Intellectual Property Rights</h2>
                                    <p>All content, software, algorithms, trademarks, logos, and visual interfaces (collectively, &#34;United Algos IP&#34;) are the exclusive property of United Algos and its licensors. You are granted a limited, non-exclusive, non-transferable license to access and use the Services for their intended purpose. You may not copy, modify, distribute, sell, or reverse-engineer any part of the United Algos IP.</p>
                                </section>

                                <section id="prohibited-conduct-tos">
                                    <h2>9. Prohibited Conduct</h2>
                                    <p>You agree not to use the Services to:</p>
                                    <ul>
                                        <li>Violate any laws or regulations, including securities laws.</li>
                                        <li>Engage in market manipulation, insider trading, or other illegal trading activities.</li>
                                        <li>Attempt to gain unauthorized access to the Services or other users&#39; accounts.</li>
                                        <li>Interfere with the performance of the Services (e.g., DDoS attacks).</li>
                                        <li>Use the Services for money laundering or terrorist financing.</li>
                                        <li>Reverse engineer or decompile the software.</li>
                                    </ul>
                                </section>

                                <section id="termination-tos">
                                    <h2>10. Termination and Suspension</h2>
                                    <p>We reserve the right to suspend or terminate your access to the Services at any time, without notice, for any reason, including, but not limited to, a breach of these Terms, suspected fraudulent activity, or non-payment of fees. You may terminate your account at any time through your account settings.</p>
                                </section>

                                <section id="disclaimer-tos">
                                    <h2>11. Disclaimer of Warranties</h2>
                                    <p>THE SERVICES ARE PROVIDED ON AN &#34;AS IS&#34; AND &#34;AS AVAILABLE&#34; BASIS. UNITED ALGOS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY TRADING STRATEGY WILL BE PROFITABLE.</p>
                                </section>

                                <section id="liability-tos">
                                    <h2>12. Limitation of Liability</h2>
                                    <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL UNITED ALGOS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (i) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICES; (ii) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY (INCLUDING EXCHANGES); OR (iii) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR API KEYS.</p>
                                </section>

                                <section id="indemnification-tos">
                                    <h2>13. Indemnification</h2>
                                    <p>You agree to indemnify, defend, and hold harmless United Algos, its officers, directors, employees, and agents from and against any and all claims, liabilities, damages, losses, and expenses, including reasonable attorneys&#39; fees, arising out of or in any way connected with your access to or use of the Services, your violation of these Terms, or your trading activities.</p>
                                </section>

                                <section id="governing-law-tos">
                                    <h2>14. Governing Law and Dispute Resolution</h2>
                                    <p>These Terms shall be governed by and construed in accordance with the laws of Germany, without regard to its conflict of law principles.</p>
                                    <p>Any disputes arising out of or relating to these Terms or the Services shall be resolved through binding arbitration in Freiburg im Breisgau, Germany, rather than in court, except that you may assert claims in small claims court if your claims qualify.</p>
                                </section>

                                <section id="modifications-tos">
                                    <h2>15. Modifications to the Terms</h2>
                                    <p>We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the Services after the effective date of the revised Terms constitutes your acceptance of the terms.</p>
                                </section>

                                <section id="contact-tos">
                                    <h2>16. Contact Information</h2>
                                    <p>If you have any questions about these Terms of Service, please contact us at:</p>
                                    <p><strong>United Algos Legal Team</strong><br />
                                        Email: <a href="mailto:legal@unitedalgos.com">legal@unitedalgos.com</a></p>
                                </section>

                                <footer className="mt-12 pt-8 border-t text-center text-sm" style={{borderColor: 'var(--color-border-secondary)', color: 'var(--color-text-tertiary)'}}>
                                    <p>© 2025 United Algos. All Rights Reserved.</p>
                                </footer>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div className="policy-content" id="content-privacy">
                                <header className="mb-10">
                                    <h1 className="!mt-0">Privacy Policy</h1>
                                    <p className="text-lg">Last Updated: October 13, 2025</p>
                                </header>
                                <section id="introduction-privacy">
                                    <h2>1. Introduction</h2>
                                    <p>Welcome to United Algos (&#34;we,&#34; &#34;us,&#34; or &#34;our&#34;). United Algos provides a platform for automated algorithmic trading strategies and related services (the &#34;Services&#34;). We are committed to protecting the privacy and security of our users&#39; information. This Privacy Policy outlines how we collect, use, store, and disclose your information when you use our Services.</p>
                                    <p>By using our Services, you agree to the collection and use of information in accordance with this policy. Given the nature of automated trading, we prioritize the security and transparency of our data practices.</p>
                                </section>

                                <section id="information-collected-privacy">
                                    <h2>2. Information We Collect</h2>
                                    <p>We collect several types of information to provide and improve our Services.</p>
                                    <h3>2.1. Personal Identification Information (PII)</h3>
                                    <p>When you create an account or contact support, we collect:</p>
                                    <ul>
                                        <li>Email address and username.</li>
                                        <li>Password (stored securely in a hashed format).</li>
                                        <li>Communication records (support tickets, emails).</li>
                                    </ul>
                                    <h3>2.2. Financial and Payment Information</h3>
                                    <p>To process subscriptions, we collect payment information. This is handled by our third-party payment processors (e.g., Stripe, Coinbase Commerce). We do not store your full credit card details or private keys.</p>
                                    <h3>2.3. Exchange API Keys</h3>
                                    <p>To utilize our automated trading features, you must provide API keys generated by your cryptocurrency exchange. These keys grant us permission to execute trades on your behalf. (See Section 4 for security details).</p>
                                    <h3>2.4. Trading Data and Configurations</h3>
                                    <p>We collect data necessary for the functionality of the Services, including:</p>
                                    <ul>
                                        <li>Bot configurations and strategy parameters.</li>
                                        <li>Trade history executed by our platform.</li>
                                        <li>Exchange balances (as reported via the API for monitoring purposes).</li>
                                    </ul>
                                    <h3>2.5. Usage Data and Logs</h3>
                                    <p>We automatically collect information on how the Services are accessed and used:</p>
                                    <ul>
                                        <li>IP addresses, browser type, operating system, and device identifiers.</li>
                                        <li>Access times, pages visited, and error logs (crucial for security monitoring and debugging).</li>
                                    </ul>
                                </section>

                                <section id="how-we-use-information-privacy">
                                    <h2>3. How We Use Your Information</h2>
                                    <p>United Algos uses the collected data for the following purposes:</p>
                                    <ul>
                                        <li><strong>To Provide the Service:</strong> To authenticate access, execute trading strategies via your API keys, and process transactions.</li>
                                        <li><strong>For Security and Fraud Prevention:</strong> To monitor for suspicious activity, verify identity, and ensure the integrity of our platform.</li>
                                        <li><strong>To Communicate:</strong> To provide customer support, send service-related notifications (e.g., trade alerts, security notices), and (with your consent) marketing communications.</li>
                                        <li><strong>For Service Improvement:</strong> To analyze usage trends, troubleshoot issues, and develop new features. We may use aggregated and anonymized data for statistical analysis.</li>
                                        <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations.</li>
                                    </ul>
                                </section>

                                <section id="api-key-security-privacy">
                                    <h2>4. API Key Security and Usage</h2>
                                    <p>The security of your API keys is paramount, as they grant access to trading on your exchange accounts.</p>
                                    <h3>4.1. Encryption</h3>
                                    <p>All API keys and secrets are encrypted using strong encryption standards (AES-256) both in transit (TLS/SSL) and at rest.</p>
                                    <h3>4.2. Restricted Permissions</h3>
                                    <p><strong>Crucially, United Algos does not require, and strongly advises against, granting &#34;Withdrawal&#34; permissions to the API keys used with our Services.</strong> We only need &#34;Read&#34; and &#34;Trade&#34; permissions. Your funds remain securely on your exchange.</p>
                                    <h3>4.3. Secure Environment</h3>
                                    <p>API keys are stored in a secure, isolated environment and are only accessed by the automated systems required to execute trades. Access by personnel is strictly limited and monitored.</p>
                                    <h3>4.4. IP Whitelisting</h3>
                                    <p>We encourage users to utilize IP whitelisting features provided by exchanges to ensure that API requests only originate from authorized United Algos servers.</p>
                                </section>

                                <section id="data-sharing-privacy">
                                    <h2>5. Data Sharing and Disclosure</h2>
                                    <p>We do not sell your personal information or trading data.</p>
                                    <h3>5.1. Service Providers</h3>
                                    <p>We engage trusted third-party companies to facilitate our Services (e.g., cloud hosting providers, payment processors, email delivery services). These providers are contractually obligated to protect your information and use it only for the purposes for which it was disclosed.</p>
                                    <h3>5.2. Legal Requirements</h3>
                                    <p>We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).</p>
                                    <h3>5.3. Business Transfers</h3>
                                    <p>If United Algos is involved in a merger, acquisition, or asset sale, your information may be transferred. We will provide notice before your information is transferred and becomes subject to a different Privacy Policy.</p>
                                    <h3>5.4. Aggregated Data</h3>
                                    <p>We may share aggregated, anonymized data that cannot reasonably be used to identify you for analytical or research purposes.</p>
                                </section>

                                <section id="data-retention-privacy">
                                    <h2>6. Data Retention and Security</h2>
                                    <p>We retain your personal information only for as long as necessary to provide you with our Services and for legitimate business purposes, such as maintaining performance, complying with our legal obligations, and resolving disputes.</p>
                                    <p>We implement robust technical and organizational measures to protect your information, including firewalls, secure server infrastructure, access controls, and regular security audits. We also strongly encourage users to enable Two-Factor Authentication (2FA).</p>
                                </section>

                                <section id="your-rights-privacy">
                                    <h2>7. Your Rights (GDPR, CCPA, and others)</h2>
                                    <p>Depending on your jurisdiction, you may have specific rights regarding your personal information, including:</p>
                                    <ul>
                                        <li><strong>Right to Access:</strong> You can request a copy of the personal information we hold about you.</li>
                                        <li><strong>Right to Rectification:</strong> You can request that we correct inaccurate or incomplete information.</li>
                                        <li><strong>Right to Erasure (Right to be Forgotten):</strong> You can request the deletion of your personal information, subject to certain legal exceptions.</li>
                                        <li><strong>Right to Restrict Processing:</strong> You can request that we limit the way we use your information.</li>
                                        <li><strong>Right to Data Portability:</strong> You can request to receive your data in a structured, commonly used format.</li>
                                    </ul>
                                    <p>You can exercise these rights through your account settings or by contacting us.</p>
                                </section>

                                <section id="cookies-tracking-privacy">
                                    <h2>8. Cookies and Tracking Technologies</h2>
                                    <p>We use cookies and similar tracking technologies to track activity on our Services. Cookies are used for authentication, security, remembering preferences (like theme selection), and analyzing platform usage. You can instruct your browser to refuse all cookies, but this may affect the functionality of the Services.</p>
                                </section>

                                <section id="international-transfers-privacy">
                                    <h2>9. International Data Transfers</h2>
                                    <p>Your information may be transferred to — and maintained on — computers located outside of your governmental jurisdiction where the data protection laws may differ. We take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy.</p>
                                </section>

                                <section id="changes-to-policy-privacy">
                                    <h2>10. Changes to This Privacy Policy</h2>
                                    <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &#34;Last Updated&#34; date. You are advised to review this Privacy Policy periodically for any changes.</p>
                                </section>

                                <section id="contact-privacy">
                                    <h2>11. Contact Us</h2>
                                    <p>If you have any questions about this Privacy Policy or our data practices, please contact our Data Protection Officer (DPO) at:</p>
                                    <p><strong>United Algos Data Protection Team</strong><br />
                                        Email: <a href="mailto:privacy@unitedalgos.com">privacy@unitedalgos.com</a></p>
                                </section>

                                <footer className="mt-12 pt-8 border-t text-center text-sm" style={{borderColor: 'var(--color-border-secondary)', color: 'var(--color-text-tertiary)'}}>
                                    <p>© 2025 United Algos. All Rights Reserved.</p>
                                </footer>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalPageComponent;
