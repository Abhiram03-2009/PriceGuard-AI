import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { crashed: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[PriceGuard] Uncaught render error:', error, info);
  }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#030912',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '16px', padding: '24px',
          fontFamily: 'system-ui, sans-serif', color: '#f8fafc',
        }}>
          <div style={{ fontSize: '32px' }}>⚠️</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#18a8ff' }}>PriceGuard AI</div>
          <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', maxWidth: '280px', lineHeight: 1.6 }}>
            Something went wrong loading the app. Please refresh or restart.
          </div>
          <button
            onClick={() => { this.setState({ crashed: false }); window.location.reload(); }}
            style={{
              marginTop: '8px', padding: '10px 24px', borderRadius: '8px',
              background: 'rgba(24,168,255,0.15)', border: '1px solid rgba(24,168,255,0.4)',
              color: '#18a8ff', fontSize: '13px', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Reload App
          </button>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre style={{ fontSize: '10px', color: '#ff3668', maxWidth: '320px', overflow: 'auto', marginTop: '8px' }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
