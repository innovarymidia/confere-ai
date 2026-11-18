import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f3f3f7] flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#b9bbc6] rounded-[12px] p-6 sm:p-8 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-[12px] bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#000000]">
                Ocorreu uma instabilidade inesperada
              </h2>
              <p className="text-xs text-[#60646c] mt-1 leading-relaxed">
                Não foi possível carregar esta visualização. Seus dados continuam seguros.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-[8px] bg-[#000000] hover:bg-[#15191e] text-white text-xs font-semibold uppercase tracking-[-0.01em] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recarregar Página</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
