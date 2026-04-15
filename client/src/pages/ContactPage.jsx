import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Clock, MessageSquare } from 'lucide-react';

const CONTACT_ITEMS = [
  {
    icon: Phone,
    label: 'WhatsApp / Call',
    value: '+91 98765 43210',
    href: 'https://wa.me/919876543210',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'support@meddrop.app',
    href: 'mailto:support@meddrop.app',
  },
  {
    icon: MapPin,
    label: 'Delivery Location',
    value: 'Chitkara University Gate, Rajpura',
    href: null,
  },
  {
    icon: Clock,
    label: 'Working Hours',
    value: 'Mon – Sat, 9 AM – 9 PM',
    href: null,
  },
];

const ContactPage = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">Contact Us</h2>
      </div>

      <div className="static-page-card">
        <p className="contact-intro">
          Have a question, issue, or just want to say hello? We're here to help. Reach us through any of the channels below.
        </p>

        <div className="contact-list">
          {CONTACT_ITEMS.map(({ icon: Icon, label, value, href }) => (
            <div className="contact-item" key={label}>
              <div className="contact-icon-wrap">
                <Icon size={18} />
              </div>
              <div className="contact-item-text">
                <span className="contact-item-label">{label}</span>
                {href ? (
                  <a className="contact-item-value contact-link" href={href} target="_blank" rel="noreferrer">
                    {value}
                  </a>
                ) : (
                  <span className="contact-item-value">{value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="static-page-card" style={{ marginTop: 12 }}>
        <div className="contact-suggestion-cta">
          <MessageSquare size={22} />
          <div>
            <strong>Got a suggestion or complaint?</strong>
            <p>Use our dedicated feedback form — we read every submission.</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/suggestions')}>
            Give Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
