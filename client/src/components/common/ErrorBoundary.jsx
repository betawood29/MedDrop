// Error boundary — catches React rendering errors and shows a fallback UI
// Wrap around routes or sections that might crash

import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="empty-state">
            <span className="empty-icon">😵</span>
            <h3>Something went wrong</h3>
            <p>Please try refreshing the page</p>
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '12px 24px', marginTop: 16 }}
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
