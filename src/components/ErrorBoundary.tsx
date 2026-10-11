import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { freeUpLocalStorageSpace } from '../utils/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    if (error?.message?.toLowerCase().includes('quota') || error?.message?.toLowerCase().includes('storage')) {
      freeUpLocalStorageSpace();
    }
  }

  private handleReset = () => {
    freeUpLocalStorageSpace();
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold font-serif text-slate-900">Ocorreu uma pequena instabilidade</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                A aplicação recuperou o estado seguro. Você pode recarregar a página para continuar de onde parou.
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-900 hover:bg-rose-950 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
