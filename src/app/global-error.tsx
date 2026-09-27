'use client'

// Last-resort boundary for errors thrown in the root layout itself. It fully
// replaces the layout, so it must render its own <html>/<body> and cannot rely
// on globals.css being present — hence the inline styles using the brand's
// dark palette so it still looks intentional.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#0b1220',
          color: '#e5e9f0',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, opacity: 0.7, margin: '0 0 24px', lineHeight: 1.5 }}>
            A critical error stopped UNI MART from loading. Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              background: 'linear-gradient(90deg,#10b981,#06b6d4)',
              color: '#04231b',
              border: 0,
              borderRadius: 999,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error?.digest && (
            <p style={{ marginTop: 16, fontSize: 11, opacity: 0.5 }}>Reference: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  )
}
