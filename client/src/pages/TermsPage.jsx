import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">Terms &amp; Conditions</h2>
      </div>

      <div className="static-page-card">
        <p className="static-page-updated">Last updated: April 2025</p>

        <div className="static-section">
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing or using MedDrop, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our service.</p>
        </div>

        <div className="static-section">
          <h3>2. About MedDrop</h3>
          <p>MedDrop is a campus delivery service operating within Chitkara University premises. We deliver medicines, groceries, stationery, and daily essentials to designated gate pickup points.</p>
        </div>

        <div className="static-section">
          <h3>3. Eligibility</h3>
          <p>The service is available exclusively to students, faculty, and staff of Chitkara University. You must provide a valid campus mobile number to register.</p>
        </div>

        <div className="static-section">
          <h3>4. Orders &amp; Payments</h3>
          <ul>
            <li>All orders are subject to product availability.</li>
            <li>Payments must be completed before dispatch.</li>
            <li>Prices are displayed inclusive of applicable taxes.</li>
            <li>We reserve the right to cancel orders in case of stock unavailability or payment failure.</li>
          </ul>
        </div>

        <div className="static-section">
          <h3>5. Prescription Medicines</h3>
          <p>Products marked with <strong>Rx</strong> require a valid prescription. By ordering such items you confirm you hold a valid prescription. MedDrop reserves the right to verify before dispatch.</p>
        </div>

        <div className="static-section">
          <h3>6. Delivery</h3>
          <ul>
            <li>Delivery is to the university gate only — no in-room delivery.</li>
            <li>Estimated delivery times are indicative and may vary.</li>
            <li>Orders not collected within the notified window may be returned.</li>
          </ul>
        </div>

        <div className="static-section">
          <h3>7. Refunds &amp; Cancellations</h3>
          <p>Cancellations are accepted before the order is packed. Refunds for prepaid orders are processed within 5–7 business days to the original payment method. Damaged or incorrect items must be reported within 2 hours of delivery.</p>
        </div>

        <div className="static-section">
          <h3>8. Prohibited Use</h3>
          <p>You may not use MedDrop to order controlled substances without a valid prescription, resell products commercially, or misuse the platform in any way that violates university policy or applicable law.</p>
        </div>

        <div className="static-section">
          <h3>9. Limitation of Liability</h3>
          <p>MedDrop is not liable for delays caused by circumstances beyond our control (power outages, campus events, etc.). Our maximum liability is limited to the value of the order placed.</p>
        </div>

        <div className="static-section">
          <h3>10. Changes to Terms</h3>
          <p>We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the revised terms.</p>
        </div>

        <div className="static-section">
          <h3>11. Contact</h3>
          <p>Questions about these terms? Reach us at <strong>support@meddrop.app</strong> or visit the <span className="static-link" onClick={() => navigate('/contact')}>Contact Us</span> page.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
