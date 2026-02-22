import * as React from 'react';
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
      const language = localStorage.getItem('vocalize_language') || 'tr';

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
    if (hasError && (severity === 'CRITICAL' || (hasError && !severity))) {
      return (
        <>
          <ErrorToast
            errorCode={errorCode || 'ERR_RECOVERING'}
            severity={severity || 'CRITICAL'}
            language={language || 'tr'}
            autoReload={severity === 'CRITICAL'}
            reloadDelay={5000}
          />
          {/* STOP RENDERING CHILDREN to prevent infinite error loops */}
          <div className="fixed inset-0 bg-slate-900 z-[9000] flex items-center justify-center opacity-90 backdrop-blur-sm">
            <div className="text-center p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl animate-in zoom-in duration-300 max-w-md mx-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h2 className="text-white font-bold mb-2 text-xl">Bir Sorun Oluştu</h2>
              <p className="text-slate-400 text-sm mb-6">
                Uygulama beklenmedik bir hatayla karşılaştı. Otomatik olarak kurtarmaya çalışıyoruz.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors w-full"
              >
                Sayfayı Yenile
              </button>
            </div>
          </div>
        </>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default GlobalErrorBoundary;
