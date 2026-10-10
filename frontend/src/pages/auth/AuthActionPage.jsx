import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { PageEntrance } from '../../components/ui/PageEntrance';
import { apiService } from '../../services/api';

const copy = {
  '/auth/register': ['Create your account', 'Registration creates a customer account you can use immediately. Restaurant staff roles are provisioned by an administrator.'],
  '/auth/verify': ['Verify your email', 'Confirm your email address to activate your account.'],
  '/auth/forgot-password': ['Reset your password', 'Enter your account email to receive the available password-reset instructions.'],
  '/auth/reset-password': ['Choose a new password', 'Use a new password between 12 and 128 characters.'],
};

export function AuthActionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const kind = location.pathname;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const token = new URLSearchParams(location.search).get('token') || '';
  const [heading, description] = copy[kind] || copy['/auth/register'];

  useEffect(() => {
    if (kind !== '/auth/verify') return;
    if (!token) { setError('This verification link is missing its token.'); return; }
    let active = true;
    setLoading(true);
    apiService.auth.verify(token).then((result) => {
      if (!active) return;
      setLoading(false);
      if (result.success) setMessage(result.data.message);
      else setError(result.error);
    });
    return () => { active = false; };
  }, [kind, token]);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    setMessage('');
    setDevelopmentResetUrl('');
    let result;
    if (kind === '/auth/register') {
      result = await apiService.auth.register({ name, email, password });
      if (result.success) setMessage(result.data.message);
    } else if (kind === '/auth/forgot-password') {
      result = await apiService.auth.forgotPassword(email);
      if (result.success) {
        setMessage(result.data.message);
        setDevelopmentResetUrl(result.data.developmentResetUrl || '');
      }
    } else {
      result = await apiService.auth.resetPassword(token, password);
      if (result.success) {
        setMessage(result.data.message);
        window.setTimeout(() => navigate('/auth/login', { replace: true }), 1400);
      }
    }
    submitting.current = false;
    setLoading(false);
    if (result && !result.success) setError(result.error);
  };

  return (
    <PageEntrance className="auth-page min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <Link to="/" className="inline-block mb-4"><Logo size="lg" theme="light" withLink={false} /></Link>
          <p className="auth-eyebrow mb-2">Occupie account security</p>
          <h1 className="auth-heading text-3xl">{heading}</h1>
          <p className="mt-2 text-sm text-stone-300">{description}</p>
        </header>
        <div className="auth-card rounded-xl p-6 sm:p-8">
          {error && <p role="alert" className="mb-4 rounded border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
          {message && <p role="status" className="mb-4 rounded border border-amber-400/30 bg-amber-950/20 p-3 text-sm text-amber-100">{message}</p>}
          {developmentResetUrl && <p className="mb-4 text-sm"><a className="text-amber-200 underline" href={developmentResetUrl}>Open development password reset link</a></p>}
          {kind !== '/auth/verify' && (
            <form onSubmit={submit} className="space-y-4">
              {kind === '/auth/register' && <label className="block text-sm text-stone-200">Full name<input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 block w-full rounded border border-stone-600 bg-stone-950 px-3 py-2 text-white" /></label>}
              {kind !== '/auth/reset-password' && <label className="block text-sm text-stone-200">Email address<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded border border-stone-600 bg-stone-950 px-3 py-2 text-white" /></label>}
              {(kind === '/auth/register' || kind === '/auth/reset-password') && <label className="block text-sm text-stone-200">{kind === '/auth/register' ? 'Password' : 'New password'}<input required minLength={12} maxLength={128} autoComplete={kind === '/auth/register' ? 'new-password' : 'new-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded border border-stone-600 bg-stone-950 px-3 py-2 text-white" /><span className="mt-1 block text-xs text-stone-400">12–128 characters</span></label>}
              <button disabled={loading || (kind === '/auth/reset-password' && !token)} className="gold-action w-full" type="submit">{loading ? 'Please wait…' : kind === '/auth/register' ? 'Create account' : kind === '/auth/forgot-password' ? 'Send reset instructions' : 'Update password'}</button>
            </form>
          )}
          {kind === '/auth/verify' && loading && <p role="status" className="text-sm text-stone-300">Checking verification link…</p>}
          <p className="mt-6 border-t border-stone-700 pt-5 text-center text-sm text-stone-300"><Link to="/auth/login" className="text-amber-200 underline">Return to sign in</Link></p>
        </div>
      </div>
    </PageEntrance>
  );
}

export default AuthActionPage;
