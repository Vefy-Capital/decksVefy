export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="login-shell">
      <form className="login-panel" action="/api/login" method="post">
        <a className="brand-mark" href="/" aria-label="Vefy">
          <span className="kV">V</span><span className="ke">e</span><span className="kf">f</span><span className="ky">y</span>
        </a>
        <div>
          <p className="eyebrow">Private access</p>
          <h1>Deck vault</h1>
        </div>
        <label>
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error ? <p className="login-error">Password incorrecto.</p> : null}
        <button className="primary-button" type="submit">Entrar</button>
      </form>
    </main>
  );
}
