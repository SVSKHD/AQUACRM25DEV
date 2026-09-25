import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  resetKey: string;
};

type State = {
  hasError: boolean;
  message: string;
};

export default class CrmPanelErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected CRM error",
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("CRM panel render error", error, info);
  }

  componentDidUpdate(previousProps: Props) {
    if (
      this.state.hasError &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false, message: "" });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl dark:border-rose-500/20 dark:bg-slate-950">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-500">
          This CRM panel hit an error
        </p>
        <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
          The rest of the CRM is still available.
        </h2>
        <p className="mt-3 break-words text-sm leading-6 text-slate-600 dark:text-white/60">
          {this.state.message}
        </p>
        <button
          type="button"
          onClick={() => this.setState({ hasError: false, message: "" })}
          className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700 dark:bg-white dark:text-slate-950"
        >
          Retry this panel
        </button>
      </div>
    );
  }
}
