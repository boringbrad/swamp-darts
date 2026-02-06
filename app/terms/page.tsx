import Header from '../components/Header';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header title="TERMS OF SERVICE" showBackButton={true} />

      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="bg-[#2a2a2a] rounded-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          <p className="text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Swamp Darts ("the Service"), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. Description of Service</h2>
              <p>
                Swamp Darts is a darts game tracking and statistics application. The Service allows users to:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Track cricket and golf darts games</li>
                <li>Maintain game statistics and history</li>
                <li>Connect with friends and compete</li>
                <li>Access venue features for dart establishments</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all
                activities that occur under your account. You agree to:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Provide accurate and complete information when creating your account</li>
                <li>Keep your password secure and confidential</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. User Conduct</h2>
              <p>You agree not to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
                <li>Upload malicious code or interfere with the Service's operation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">5. Privacy</h2>
              <p>
                Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy
                to understand our practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">6. Intellectual Property</h2>
              <p>
                All content, features, and functionality of the Service are owned by Swamp Darts and are
                protected by copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">7. Limitation of Liability</h2>
              <p>
                The Service is provided "as is" without warranties of any kind. We shall not be liable for any
                indirect, incidental, special, or consequential damages arising out of your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any material
                changes via email or through the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">9. Contact</h2>
              <p>
                If you have questions about these Terms of Service, please contact us at:
              </p>
              <p className="mt-2 text-green-400">
                [boringolbrad@gmail.com]
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-500">
              These terms constitute a legally binding agreement. By using Swamp Darts, you acknowledge
              that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
