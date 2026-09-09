import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Onverwerkte fout in component:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6 bg-card border border-accent/30 p-8 rounded-sm shadow-xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl text-gradient-gold">
                Er ging even iets mis
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                De pagina kon niet correct worden geladen. Probeer de pagina te herladen.
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xs text-sm hover:brightness-110 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Pagina herladen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
