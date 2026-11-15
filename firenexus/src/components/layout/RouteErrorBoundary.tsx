import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[RouteErrorBoundary] Error in route "${this.props.routeName || 'unknown'}":`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-fire/10 border border-fire/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,113,62,0.2)]">
            <AlertTriangle className="w-7 h-7 text-fire" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Module Display Error
          </h2>
          <p className="text-text-secondary text-sm max-w-md mb-6">
            An isolated runtime error occurred in {this.props.routeName ? `the ${this.props.routeName} module` : 'this view'}. Other sections of FIRENEXUS remain fully operational.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan/15 text-cyan border border-cyan/30 hover:bg-cyan/25 transition-all text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Retry View
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border hover:border-cyan/40 text-text-primary transition-all text-sm font-medium"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
