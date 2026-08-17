import React, { StrictMode, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FoodieHub Global Error Catch:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F9F9F4',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            border: '1px solid #E2E2D5',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: '#e6f3d8',
              color: '#397700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: '32px',
            }}>
              🍽️
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1B1C17', margin: '0 0 8px 0' }}>
              FoodieHub Workspace Recovery
            </h1>
            <p style={{ fontSize: '13px', color: '#76786B', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              A temporary issue occurred while loading this view.
            </p>
            {this.state.error?.message && (
              <div style={{
                backgroundColor: '#FFF0F0',
                color: '#BA1A1A',
                border: '1px solid #FFDAD6',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '11px',
                fontFamily: 'monospace',
                marginBottom: '20px',
                textAlign: 'left',
                wordBreak: 'break-word',
                maxHeight: '120px',
                overflowY: 'auto',
              }}>
                <strong>Error:</strong> {this.state.error.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '14px',
                  backgroundColor: '#397700',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Reload App
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '12px 16px',
                  borderRadius: '14px',
                  backgroundColor: '#F0F1EA',
                  color: '#46483E',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.update();
    }).catch((error) => {
      console.warn('FoodieHub offline support could not be enabled.', error);
    });
  });
}
