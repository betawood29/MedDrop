import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Lightbulb, Bug, AlertCircle, MessageSquare, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitFeedback } from '../services/feedbackService';

const TYPES = [
  { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, desc: 'Ideas to improve MedDrop' },
  { value: 'complaint', label: 'Complaint', icon: AlertCircle, desc: 'Something went wrong' },
  { value: 'bug', label: 'Bug Report', icon: Bug, desc: 'App not working correctly' },
  { value: 'general', label: 'General', icon: MessageSquare, desc: 'Anything else on your mind' },
];

const SuggestionsPage = () => {
  const navigate = useNavigate();
  const [type, setType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      toast.error('Please write at least a few words');
      return;
    }
    setLoading(true);
    try {
      await submitFeedback({ type, message: message.trim() });
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="page-container">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h2 className="page-title">Feedback</h2>
        </div>
        <div className="feedback-success">
          <CheckCircle size={52} className="feedback-success-icon" />
          <h3>Thank you!</h3>
          <p>Your feedback has been received. We read every submission and use it to make MedDrop better for everyone.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Back to Shop</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">Suggestions &amp; Feedback</h2>
      </div>

      <p className="feedback-intro">
        Your opinion matters. Help us improve MedDrop by sharing what you think — good or bad.
      </p>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <div className="feedback-type-grid">
          {TYPES.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              type="button"
              className={`feedback-type-card${type === value ? ' active' : ''}`}
              onClick={() => setType(value)}
            >
              <Icon size={20} />
              <span className="feedback-type-label">{label}</span>
              <span className="feedback-type-desc">{desc}</span>
            </button>
          ))}
        </div>

        <div className="feedback-field">
          <label className="input-label" htmlFor="feedback-msg">
            Your message <span className="feedback-char-count">{message.length} / 1000</span>
          </label>
          <textarea
            id="feedback-msg"
            className="input feedback-textarea"
            placeholder="Tell us what's on your mind…"
            value={message}
            maxLength={1000}
            rows={5}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <button className="btn-primary feedback-submit" type="submit" disabled={loading || message.trim().length < 5}>
          <Send size={16} />
          {loading ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default SuggestionsPage;
