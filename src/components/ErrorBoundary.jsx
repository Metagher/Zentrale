import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('App-Fehler:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-red-900 bg-zinc-900 p-5">
            <div className="font-semibold text-red-400 mb-2">Es ist ein Fehler aufgetreten</div>
            <div className="text-xs text-zinc-300 whitespace-pre-wrap mb-3">
              {this.state.error?.message || String(this.state.error)}
            </div>
            <button
              className="text-sm font-medium text-white rounded-lg px-4 py-2"
              style={{ backgroundColor: '#dc2626' }}
              onClick={() => this.setState({ error: null })}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
