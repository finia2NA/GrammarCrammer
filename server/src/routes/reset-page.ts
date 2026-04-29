import { Router } from 'express';

export const resetPageRouter = Router();

const GRAMMAR_WORDS = [
  '文法', 'Grammatik', 'Grammaire', 'Gramática', 'Грамматика',
  '语法', 'قواعد', 'व्याकरण', 'Grammatica', '문법', 'Gramatika', 'Dil Bilgisi',
];

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const BG_ITEMS = Array.from({ length: 60 }, (_, i) => {
  const col = i % 5;
  const row = Math.floor(i / 5);
  const a = seededRandom(i * 7 + 1);
  const b = seededRandom(i * 7 + 2);
  const c = seededRandom(i * 7 + 3);
  const word = GRAMMAR_WORDS[i % GRAMMAR_WORDS.length];
  const left = (col / 5) * 100 + a * 14;
  const top = (row / 12) * 100 + b * 7;
  const rot = (c - 0.5) * 30;
  const opacity = 0.06 + a * 0.06;
  const size = 11 + Math.round(a * 9);
  return `<span style="position:absolute;left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;transform:rotate(${rot.toFixed(1)}deg);opacity:${opacity.toFixed(2)};font-size:${size}px;font-weight:500">${word}</span>`;
}).join('\n      ');

resetPageRouter.get('/reset-password', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password — GrammarCrammer</title>
  <style>
    :root {
      --bg: #FDF0E0;
      --surface: #FFFAF4;
      --border: #E8C99A;
      --fg: #1C1410;
      --fg-secondary: #4A3728;
      --fg-muted: #7A6050;
      --fg-subtle: #A8917E;
      --input-bg: #F5D9B0;
      --primary: #E8720C;
      --primary-hover: #BF5A06;
      --primary-fg: #FDF0E0;
      --error: #C83228;
      --bg-word-color: #1C1410;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #141517;
        --surface: #1B1D21;
        --border: #2B2F36;
        --fg: #F3EBDD;
        --fg-secondary: #D4C9B5;
        --fg-muted: #A59A88;
        --fg-subtle: #7B7365;
        --input-bg: #1F2125;
        --primary: #F07818;
        --primary-hover: #C86010;
        --primary-fg: #141517;
        --error: #E85848;
        --bg-word-color: #F3EBDD;
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--fg);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }
    .bg-words {
      position: fixed;
      inset: 0;
      pointer-events: none;
      color: var(--bg-word-color);
      z-index: 0;
    }
    .card {
      position: relative;
      z-index: 1;
      background: var(--surface);
      border-radius: 24px;
      padding: 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    }
    @media (prefers-color-scheme: dark) {
      .card { box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: var(--fg); }
    .subtitle { color: var(--fg-secondary); font-size: 14px; line-height: 1.5; margin-bottom: 28px; }
    label { display: block; font-size: 13px; font-weight: 500; color: var(--fg-muted); margin-bottom: 6px; }
    input {
      width: 100%;
      padding: 12px 16px;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--fg);
      font-size: 14px;
      outline: none;
      margin-bottom: 16px;
    }
    input::placeholder { color: var(--fg-muted); }
    input:focus { border-color: var(--primary); }
    button {
      width: 100%;
      padding: 14px;
      background: var(--primary);
      color: var(--primary-fg);
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: background 0.15s;
    }
    button:hover { background: var(--primary-hover); }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .error { color: var(--error); font-size: 13px; margin-top: 8px; }
    .success { text-align: center; }
    .success h1 { color: var(--primary); margin-bottom: 12px; }
    .success p { color: var(--fg-secondary); line-height: 1.6; }
    .rules { color: var(--fg-subtle); font-size: 12px; margin-top: 4px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="bg-words">
      ${BG_ITEMS}
  </div>

  <div class="card" id="form-card">
    <h1>Reset your password</h1>
    <p class="subtitle">Enter your new password below.</p>
    <form id="reset-form" onsubmit="return handleSubmit(event)">
      <label for="password">New password</label>
      <input type="password" id="password" placeholder="At least 8 characters" required>
      <label for="confirm">Confirm password</label>
      <input type="password" id="confirm" placeholder="Re-enter your password" required>
      <p class="rules">Must be at least 8 characters with at least one letter and one number.</p>
      <button type="submit" id="submit-btn">Reset Password</button>
      <p class="error" id="error"></p>
    </form>
  </div>

  <div class="card success" id="success-card" style="display:none;">
    <h1>Password reset!</h1>
    <p>Your password has been updated. Open the GrammarCrammer app to sign in with your new password.</p>
  </div>

  <script>
    async function handleSubmit(e) {
      e.preventDefault();
      var pw = document.getElementById('password').value;
      var confirm = document.getElementById('confirm').value;
      var errorEl = document.getElementById('error');
      var btn = document.getElementById('submit-btn');

      errorEl.textContent = '';

      if (pw !== confirm) { errorEl.textContent = 'Passwords do not match.'; return false; }
      if (pw.length < 8) { errorEl.textContent = 'Password must be at least 8 characters.'; return false; }
      if (!/[a-zA-Z]/.test(pw) || !/\\d/.test(pw)) { errorEl.textContent = 'Password must contain at least one letter and one number.'; return false; }

      var params = new URLSearchParams(window.location.search);
      var token = params.get('token');
      if (!token) { errorEl.textContent = 'Missing reset token. Please use the link from your email.'; return false; }

      btn.disabled = true;
      btn.textContent = 'Resetting\\u2026';

      try {
        var res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, newPassword: pw })
        });
        var data = await res.json();
        if (!res.ok) {
          errorEl.textContent = data.error?.message || 'Something went wrong.';
          btn.disabled = false;
          btn.textContent = 'Reset Password';
          return false;
        }
        document.getElementById('form-card').style.display = 'none';
        document.getElementById('success-card').style.display = 'block';
      } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Reset Password';
      }
      return false;
    }
  </script>
</body>
</html>`);
});
