'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';

const SOCIALS: [string, string][] = [['Google', 'G'], ['Apple', ''], ['Facebook', 'f']];

export function AuthModal() {
  const s = useStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('alex.morgan@example.com');
  const [pw, setPw] = useState('demo1234');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (s.auth.open) {
      setMode(s.auth.mode);
      if (s.auth.mode === 'signup') {
        setName(''); setEmail(''); setPw('');
      } else {
        setEmail('alex.morgan@example.com'); setPw('demo1234');
      }
    }
  }, [s.auth.open, s.auth.mode]);

  if (!s.auth.open) return null;
  const isUp = mode === 'signup';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isUp) await s.signUp(name, email);
      else await s.signIn(email);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="drawer-scrim" style={{ display: 'grid', placeItems: 'center', padding: 16 }} onClick={s.closeAuth}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={s.closeAuth} aria-label="Close"><Icon name="x" size={18} /></button>
        <div className="auth-brand"><span className="brand-mark" style={{ background: 'var(--brand)' }} /><span className="brand-name" style={{ color: 'var(--ink)' }}>{s.storeName}</span></div>
        <div className="auth-tabs">
          <button className={!isUp ? 'on' : ''} onClick={() => setMode('signin')}>Sign In</button>
          <button className={isUp ? 'on' : ''} onClick={() => setMode('signup')}>Sign Up</button>
        </div>
        <p className="auth-sub">{isUp ? 'Create your account in seconds — your cart is saved.' : 'Welcome back. Sign in to continue.'}</p>
        <form onSubmit={submit} className="col gap-12">
          {isUp && (
            <div>
              <label className="field-label">Full name</label>
              <input className="input" placeholder="Jane Appleseed" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="field-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <div className="flex between center">
              <label className="field-label">Password</label>
              {!isUp && <a href="#" className="link-acc" onClick={(e) => { e.preventDefault(); s.toast('Password reset link sent (demo)'); }}>Forgot?</a>}
            </div>
            <input className="input" type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy} style={{ marginTop: 4 }}>
            {busy ? 'Please wait…' : isUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
        {!isUp && <div className="auth-hint">Demo: any email &amp; password works — defaults are pre-filled.</div>}
        <div className="auth-divider"><span>or continue with</span></div>
        <div className="social-row">
          {SOCIALS.map(([nm, g]) => (
            <button key={nm} className="social-btn" onClick={() => void s.signIn()}><b>{g || nm[0]}</b> {nm}</button>
          ))}
        </div>
        <div className="auth-foot">
          {isUp ? (
            <span>Already have an account? <a href="#" className="link-acc" onClick={(e) => { e.preventDefault(); setMode('signin'); }}>Sign in</a></span>
          ) : (
            <span>New to {s.storeName}? <a href="#" className="link-acc" onClick={(e) => { e.preventDefault(); setMode('signup'); }}>Create an account</a></span>
          )}
          <button className="link-btn" style={{ color: 'var(--muted)' }} onClick={s.closeAuth}>Continue as guest →</button>
        </div>
      </div>
    </div>
  );
}
