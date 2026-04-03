import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null }

/**
 * Render hatası olunca boş beyaz ekran yerine mesaj gösterir (geliştirme ve prod).
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AppErrorBoundary]', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#fafafa',
            color: '#18181b',
            boxSizing: 'border-box',
          }}
        >
          <h1 style={{ fontSize: 18, margin: '0 0 12px' }}>
            Sayfa yüklenirken bir hata oluştu
          </h1>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#52525b' }}>
            Ayrıntı aşağıda. Tarayıcı konsolunda (F12) da kayıt vardır. Sorun devam ederse
            sayfayı yenileyin veya <code>npm run dev</code> ile yerel sunucuyu kullandığınızdan
            emin olun (HTML dosyasını doğrudan açmayın).
          </p>
          <pre
            style={{
              margin: 0,
              padding: 16,
              fontSize: 12,
              overflow: 'auto',
              background: '#18181b',
              color: '#f4f4f5',
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{
              marginTop: 16,
              padding: '10px 16px',
              fontSize: 14,
              cursor: 'pointer',
              borderRadius: 8,
              border: '1px solid #d4d4d8',
              background: '#fff',
            }}
            onClick={() => this.setState({ error: null })}
          >
            Tekrar dene
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
