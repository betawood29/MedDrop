// DeliveryReview — inline review card shown on delivered orders

import { useState } from 'react';
import { Star, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitFeedback } from '../../services/feedbackService';

const QUESTIONS = [
  { id: 'speed',   label: 'How was the delivery speed?' },
  { id: 'quality', label: 'Were the items in good condition?' },
  { id: 'service', label: 'How was the overall service?' },
];

const REVIEW_KEY = (orderId) => `review-submitted-${orderId}`;

const StarRow = ({ value, onChange }) => (
  <div className="review-stars">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        className={`review-star-btn${value >= n ? ' active' : ''}`}
        onClick={() => onChange(n)}
        aria-label={`${n} star`}
      >
        <Star size={22} />
      </button>
    ))}
  </div>
);

const DeliveryReview = ({ orderId }) => {
  const alreadySubmitted = !!localStorage.getItem(REVIEW_KEY(orderId));

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(alreadySubmitted);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please give a star rating');
      return;
    }
    setLoading(true);
    try {
      await submitFeedback({
        type: 'delivery_review',
        orderId,
        rating,
        message: comment.trim() || null,
      });
      localStorage.setItem(REVIEW_KEY(orderId), '1');
      setDone(true);
      toast.success('Thanks for your review!');
    } catch {
      toast.error('Could not submit review. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="delivery-review-card review-done">
        <CheckCircle size={24} className="review-done-icon" />
        <div>
          <strong>Review submitted</strong>
          <p>Thanks for sharing your experience!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-review-card">
      <div className="review-header">
        <span className="review-emoji">🌟</span>
        <div>
          <strong>How was your experience?</strong>
          <p>Your feedback helps us improve every delivery</p>
        </div>
      </div>

      <div className="review-body">
        <div className="review-question">
          <span>Overall rating</span>
          <StarRow value={rating} onChange={setRating} />
        </div>

        <div className="review-comment-wrap">
          <label className="input-label" htmlFor="review-comment">
            Anything specific? <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
          </label>
          <textarea
            id="review-comment"
            className="input review-textarea"
            placeholder="e.g. Delivery was fast, packaging was great…"
            value={comment}
            maxLength={500}
            rows={3}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <button
          className="btn-primary review-submit-btn"
          onClick={handleSubmit}
          disabled={loading || rating === 0}
        >
          <Send size={15} />
          {loading ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
};

export default DeliveryReview;
