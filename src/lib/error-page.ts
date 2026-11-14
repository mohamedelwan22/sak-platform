/**
 * Catastrophic-error HTML shell rendered outside React. Self-contained:
 * resolves the SAK100 theme preference from the `sak100_theme` cookie before
 * paint (system follows `prefers-color-scheme`), mirroring the app's
 * light/dark design tokens so the page never flashes the wrong theme.
 */
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script>(function(){try{var m=document.cookie.match(/(?:^|; )sak100_theme=([^;]*)/);var v=m?decodeURIComponent(m[1]):null;if(!v){try{v=window.localStorage.getItem('sak100_theme')}catch(e){}}var d=v==='dark'||((v==='system'||!v)&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',!!d)}catch(e){}})();</script>
    <style>
      :root {
        --bg: #F5F7FB; --surface: #FFFFFF; --text: #1E293B; --muted: #64748B;
        --border: #E2E8F0; --brand: #C9A84C; --brand-ink: #1C1A14; --btn: #111827; --btn-text: #FFFFFF;
        color-scheme: light;
      }
      :root.dark {
        --bg: #0A0E1A; --surface: #0F1629; --text: #ECE9E0; --muted: #A3A9BC;
        --border: #2A3045; --brand: #C9A84C; --brand-ink: #0A0E1A; --btn: #C9A84C; --btn-text: #0A0E1A;
        color-scheme: dark;
      }
      body { font: 15px/1.5 "Noto Sans Arabic", system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; transition: background 0.25s ease; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; background: var(--surface); border: 1px solid var(--border); border-radius: 1.25rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: var(--text); }
      p { color: var(--muted); margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.625rem 1rem; border-radius: 0.625rem; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: filter 0.15s ease; }
      a:focus-visible, button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
      .primary { background: var(--btn); color: var(--btn-text); border-color: var(--btn); }
      .primary:hover { filter: brightness(1.12); }
      .secondary { background: transparent; color: var(--text); border-color: var(--border); }
      .secondary:hover { border-color: var(--brand); color: var(--brand); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
