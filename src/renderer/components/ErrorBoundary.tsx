import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const { fallbackTitle = 'Something went wrong' } = this.props;

      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#131722] p-4">
          <div className="max-w-md w-full bg-[#1e222d] rounded-lg border border-[#2a2e39] shadow-lg overflow-hidden">
            <div className="bg-[#ef5350]/20 border-b border-[#ef5350]/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg 
                  className="w-5 h-5 text-[#ef5350]" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
                <h3 className="text-[#ef5350] font-semibold text-sm">
                  {fallbackTitle}
                </h3>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="text-[#d1d4dc] text-sm">
                <p className="font-medium mb-1">Error:</p>
                <code className="block bg-[#131722] rounded p-2 text-xs text-[#ef5350] break-all">
                  {error?.message || 'Unknown error'}
                </code>
              </div>

              {errorInfo?.componentStack && (
                <details className="text-[#787b86] text-xs">
                  <summary className="cursor-pointer hover:text-[#d1d4dc] transition-colors">
                    Component Stack
                  </summary>
                  <pre className="mt-2 bg-[#131722] rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {error?.stack && (
                <details className="text-[#787b86] text-xs">
                  <summary className="cursor-pointer hover:text-[#d1d4dc] transition-colors">
                    Full Stack Trace
                  </summary>
                  <pre className="mt-2 bg-[#131722] rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {error.stack}
                  </pre>
                </details>
              )}

              <button
                onClick={this.handleRetry}
                className="w-full mt-2 px-4 py-2 bg-[#2962ff] hover:bg-[#2962ff]/80 text-white text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#2962ff]/50"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
