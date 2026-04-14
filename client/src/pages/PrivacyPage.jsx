import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">Privacy Policy</h2>
      </div>

      <div className="static-page-card">
        <p className="static-page-updated">Last updated: April 2025</p>

        <div className="static-section">
          <h3>1. Information We Collect</h3>
          <p>When you use MedDrop, we collect:</p>
          <ul>
            <li><strong>Phone number</strong> — used for account creation and order updates via SMS/WhatsApp.</li>
            <li><strong>Name, hostel &amp; gate preference</strong> — used to personalise your delivery experience.</li>
            <li><strong>Order history</strong> — to help you track past purchases.</li>
            <li><strong>Push notification tokens</strong> — to deliver order status notifications to your device.</li>
          </ul>
        </div>

        <div className="static-section">
          <h3>2. How We Use Your Information</h3>
          <ul>
            <li>Processing and fulfilling your orders.</li>
            <li>Sending real-time order status updates.</li>
            <li>Improving our product catalogue and service quality.</li>
            <li>Responding to your support queries and feedback.</li>
          </ul>
          <p>We do <strong>not</strong> sell or rent your personal data to third parties.</p>
        </div>

        <div className="static-section">
          <h3>3. Data Sharing</h3>
          <p>We may share your information only with:</p>
          <ul>
            <li><strong>Payment processors</strong> (Razorpay) to complete transactions — governed by their own privacy policy.</li>
            <li><strong>SMS/WhatsApp providers</strong> solely to deliver order notifications.</li>
            <li><strong>Law enforcement</strong> if required by applicable law.</li>
          </ul>
        </div>

        <div className="static-section">
          <h3>4. Push Notifications</h3>
          <p>If you grant permission, we store a device push token to send you order updates. You can revoke this permission at any time from your browser or device settings, or via the Profile page.</p>
        </div>

        <div className="static-section">
          <h3>5. Data Retention</h3>
          <p>Your account data is retained as long as your account is active. Order records are kept for a minimum of 1 year for compliance purposes. You may request deletion of your account by contacting us.</p>
        </div>

        <div className="static-section">
          <h3>6. Security</h3>
          <p>We use industry-standard encryption (HTTPS/TLS) for all data in transit. Passwords are never stored — authentication is OTP-based. Push subscription keys are stored securely and never exposed.</p>
        </div>

        <div className="static-section">
          <h3>7. Your Rights</h3>
          <ul>
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and associated data.</li>
          </ul>
          <p>To exercise any of these rights, contact us via the <span className="static-link" onClick={() => navigate('/contact')}>Contact Us</span> page.</p>
        </div>

        <div className="static-section">
          <h3>8. Cookies &amp; Local Storage</h3>
          <p>MedDrop uses browser local storage to keep you logged in and remember your cart. No third-party tracking cookies are used.</p>
        </div>

        <div className="static-section">
          <h3>9. Changes to This Policy</h3>
          <p>We may update this Privacy Policy periodically. Significant changes will be communicated via the app. Continued use after changes constitutes acceptance.</p>
        </div>

        <div className="static-section">
          <h3>10. Contact</h3>
          <p>Privacy concerns? Email us at <strong>privacy@meddrop.app</strong> or visit the <span className="static-link" onClick={() => navigate('/contact')}>Contact Us</span> page.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
