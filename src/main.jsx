import { StrictMode, Component, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'

// Resolved at build time: the public board build never contains the launcher, the games or their answers.
// eslint-disable-next-line react-refresh/only-export-components
const Root = import.meta.env.VITE_TARGET === 'board'
  ? lazy(() => import('./board/BoardApp'))
  : lazy(() => import('./App.jsx'))

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div style={{color: 'red', padding: '20px', background: 'white', height: '100vh', fontFamily: 'monospace', zIndex: 99999, position: 'fixed', top:0, left:0, width: '100vw'}}>
        <h1>JS ERROR</h1>
        <pre>{this.state.error?.toString()}</pre>
        <pre>{this.state.error?.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={null}>
        <Root />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
)

