import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/ErrorLogger';

/**
 * ComponentErrorBoundary
 * 
 * Wraps specific components to isolate errors.
 * Instead of crashing the whole app, just this part will show a friendly error message.
 */
class ComponentErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error but indicate it was caught by a component boundary
        logError(error, {
            component: this.props.name || 'Unknown Component',
            action: 'component_render_partial',
            additionalData: {
                componentStack: errorInfo.componentStack,
                isPartial: true
            }
        });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback or default UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const isTeal = this.props.variant === 'teal';
            const iconColor = isTeal ? 'text-teal-400' : 'text-orange-400';
            const iconBg = isTeal ? 'bg-teal-500/10' : 'bg-orange-500/10';
            const buttonColor = isTeal ? 'text-teal-400' : 'text-orange-400';
            const buttonBorder = isTeal ? 'hover:border-teal-500/30' : 'hover:border-orange-500/30';
            const defaultMessage = isTeal ? 'Bu bölüm geliştiriliyor' : 'Bu alanda geçici bir sorun var';
            const defaultSubtext = isTeal ? 'En kısa sürede aktif edilecektir.' : 'Teknik ekibimiz durumdan haberdar edildi ve ilgileniyor.';

            return (
                <div className="h-full w-full min-h-[200px] flex flex-col items-center justify-center p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl text-center animate-in fade-in duration-300">
                    <div className={`${iconBg} p-3 rounded-full mb-3`}>
                        <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
                    </div>
                    <h3 className="text-slate-200 font-semibold mb-1">
                        {this.props.message || defaultMessage}
                    </h3>
                    <p className="text-slate-400 text-xs max-w-[250px] mb-4">
                        {this.props.subtext || defaultSubtext}
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={this.handleRetry}
                        className={`bg-slate-700/40 hover:bg-slate-700/60 ${buttonColor} border border-slate-600/50 ${buttonBorder} transition-all font-medium`}
                    >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Tekrar Dene
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ComponentErrorBoundary;
