import Header from '../components/Header';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header title="PRIVACY POLICY" showBackButton={true} />

      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="bg-[#2a2a2a] rounded-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Information We Collect</h2>
              <p className="mb-3">We collect the following types of information:</p>

              <h3 className="text-xl font-semibold text-white mb-2">Account Information</h3>
              <ul className="list-disc ml-6 mb-4 space-y-1">
                <li>Email address (required for account creation and authentication)</li>
                <li>Display name (used to identify you in games)</li>
                <li>Password (encrypted and never stored in plain text)</li>
                <li>Profile photo (optional)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2">Game Data</h3>
              <ul className="list-disc ml-6 mb-4 space-y-1">
                <li>Game scores and statistics</li>
                <li>Match history</li>
                <li>Player performance metrics</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-2">Usage Information</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>Last activity timestamps</li>
                <li>Feature usage patterns</li>
                <li>Device and browser information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. How We Use Your Information</h2>
              <p className="mb-2">We use your information to:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Provide and maintain the Service</li>
                <li>Track your game statistics and history</li>
                <li>Enable friend connections and social features</li>
                <li>Send you important service updates (password resets, account notifications)</li>
                <li>Send marketing emails (only if you've opted in)</li>
                <li>Improve and personalize your experience</li>
                <li>Detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. Information Sharing</h2>
              <p className="mb-3">We do NOT sell your personal information. We may share your information in the following cases:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>With Friends:</strong> Your display name, avatar, and game statistics are visible to users you've accepted as friends</li>
                <li><strong>At Venues:</strong> When you join a venue, your profile information is visible to that venue</li>
                <li><strong>Public Leaderboards:</strong> If you participate in public competitions, your stats may be displayed on leaderboards</li>
                <li><strong>Service Providers:</strong> We use Supabase for data storage and authentication</li>
                <li><strong>Legal Requirements:</strong> If required by law or to protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. Email Privacy</h2>
              <p className="mb-2"><strong className="text-green-400">Important Privacy Protection:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Your email address is NEVER displayed to other users</li>
                <li>Other users can only find you by email if they know your EXACT email address</li>
                <li>Email addresses do NOT appear in search suggestions or autocomplete</li>
                <li>We do not allow partial email searches to prevent email harvesting</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">5. Marketing Communications</h2>
              <p className="mb-2">
                We will only send you marketing emails, newsletters, or promotional content if you have explicitly
                opted in during signup or in your account settings. You can:
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Unsubscribe from marketing emails at any time using the link in any email</li>
                <li>Change your marketing preferences in your account settings</li>
                <li>Continue to receive important service emails (password resets, security alerts) even if you opt out of marketing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">6. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information,
                including:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Encrypted password storage</li>
                <li>Secure HTTPS connections</li>
                <li>Regular security updates</li>
                <li>Limited access to personal data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">7. Your Rights (GDPR)</h2>
              <p className="mb-2">If you are in the European Union, you have the right to:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate data</li>
                <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Withdraw Consent:</strong> Opt out of marketing at any time</li>
                <li><strong>Object:</strong> Object to certain data processing activities</li>
              </ul>
              <p className="mt-3">To exercise these rights, contact us at: <span className="text-green-400">[YOUR EMAIL]</span></p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">8. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active. If you delete your account,
                we will delete or anonymize your personal data within 30 days, except where we are required to retain
                it for legal purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">9. Children's Privacy</h2>
              <p>
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal
                information from children under 13. If we become aware that we have collected such information, we
                will take steps to delete it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by
                email or through a notice on the Service. Your continued use of the Service after changes constitutes
                acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">11. Contact Us</h2>
              <p>
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="mt-2 text-green-400">
                [boringolbrad@gmail.com]<br />
                [YOUR BUSINESS NAME/ADDRESS if applicable]
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-500">
              By using Swamp Darts, you acknowledge that you have read and understood this Privacy Policy
              and agree to its terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
