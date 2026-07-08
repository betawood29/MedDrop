// Feedback FAB — small floating button linking to the suggestions page

import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquareHeart } from 'lucide-react';

const FeedbackFab = () => {
  const location = useLocation();

  // Don't show on the suggestions page itself, or auth pages
  const hiddenOn = ['/suggestions', '/login', '/signup'];
  if (hiddenOn.includes(location.pathname)) return null;

  return (
    <NavLink to="/suggestions" className="feedback-fab" aria-label="Share suggestions or feedback" title="Suggestions & Feedback">
      <MessageSquareHeart size={20} />
    </NavLink>
  );
};

export default FeedbackFab;
