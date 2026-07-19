import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Zenflow crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          height: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          color: 'var(--text-primary, #fff)', textAlign: 'center', padding: 24,
        }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', maxWidth: 420 }}>
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 13,
            }}
          >
            Reload Zenflow
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
