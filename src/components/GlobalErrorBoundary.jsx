import React from 'react';
import { logError } from '@/lib/ErrorLogger';
import ErrorToast from '@/components/ErrorToast';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorInfo: null,
      errorCode: null,
      severity: null,
      showToast: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    console.error("⚠️ Uygulama Hatası:", error);
    this.setState({ errorInfo });

    // Recursion protection: Check if error occurred within the ErrorBoundary itself or associated components
    // If we are already showing an error and another one comes in, it might be a loop.
    if (this.state.hasError) {
      console.warn("⚠️ Recursive error detected in GlobalErrorBoundary. Halting error processing.");
      return;
    }

    try {
      // Log error and get error code + severity
      const result = await logError(error, {
        component: errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown',
        action: 'component_render',
        additionalData: {
          componentStack: errorInfo.componentStack
        }
      });

      const { errorCode, severity, shouldNotifyUser } = result;

      // Get user's language preference
      const language = localStorage.getItem('vocalize_lang') || 'tr';

      this.setState({
        errorCode,
        severity,
        showToast: shouldNotifyUser,
        language
      });

    } catch (err) {
      console.error("Failed to process error:", err);
      // Fallback: show generic error toast
      this.setState({
        errorCode: 'ERR_000',
        severity: 'CRITICAL',
        showToast: true,
        language: 'tr'
      });
    }
  }

  handleRetry = () => {
    // Reset error state and try to recover
    this.setState({
      hasError: false,
      errorInfo: null,
      errorCode: null,
      severity: null,
      showToast: false
    });
  };

  handleCloseToast = () => {
    this.setState({ showToast: false });

    // If it was a minor error, just hide toast and continue
    if (this.state.severity === 'MINOR') {
      this.setState({
        hasError: false,
        errorInfo: null,
        errorCode: null,
        severity: null
      });
    }
  };

  render() {
    const { hasError, showToast, errorCode, severity, language } = this.state;

    // For MINOR errors, don't disrupt the UI at all
    if (hasError && severity === 'MINOR') {
      // Just show toast briefly, then continue rendering children
      return (
        <>
          {showToast && (
            <ErrorToast
              errorCode={errorCode}
              severity={severity}
              language={language}
              onClose={this.handleCloseToast}
            />
          )}
          {this.props.children}
        </>
      );
    }

    // For RECOVERABLE errors, show toast with retry option
    if (hasError && severity === 'RECOVERABLE') {
      return (
        <>
          {showToast && (
            <ErrorToast
              errorCode={errorCode}
              severity={severity}
              language={language}
              onRetry={this.handleRetry}
              onClose={this.handleCloseToast}
            />
          )}
          {this.props.children}
        </>
      );
    }

    // For CRITICAL errors, show toast with auto-reload
    if (hasError && severity === 'CRITICAL') {
      return (
        <>
          <ErrorToast
            errorCode={errorCode}
            severity={severity}
            language={language}
            autoReload={true}
            reloadDelay={5000}
          />
          {/* Still render children in background, but toast will reload page */}
          <div className="opacity-50 pointer-events-none">
            {this.props.children}
          </div>
        </>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default GlobalErrorBoundary;
