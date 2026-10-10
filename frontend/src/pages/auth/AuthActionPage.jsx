import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { PageEntrance } from '../../components/ui/PageEntrance';
import { apiService } from '../../services/api';

export function AuthActionPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    setMessage('');

    const result = await apiService.auth.register({ name, email, password });

    submitting.current = false;
    setLoading(false);
    if (result.success) setMessage(result.data.message);
    else setError(result.error);
  };

  return (
    <PageEntrance className="auth-page min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <Link to="/" className="inline-block mb-4"><Logo size="lg" theme="light" withLink={false} /></Link>
          <p className="auth-eyebrow mb-2">Occupie account</p>
          <h1 className="auth-heading text-3xl">Create your account</h1>
          <p className="mt-2 text-sm text-stone-300">Registration creates a customer account. Restaurant staff roles are provisioned by an administrator.</p>
        </header>
        <div className="auth-card rounded-xl p-6 sm:p-8">
          {error && <p role="alert" className="mb-4 rounded border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
          {message && <p role="status" className="mb-4 rounded border border-amber-400/30 bg-amber-950/20 p-3 text-sm text-amber-100">{message}</p>}
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm text-stone-200">Full name<input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 block w-full rounded border border-stone-600 bg-stone-950 px-3 py-2 text-white" /></label>
            <label className="block text-sm text-stone-200">Email address<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded border border-stone-600 bg-stone-950 px-3 py-2 text-white" /></label>
            <label className="block text-sm text-stone-200">Password<input required minLength={12} maxLength={128} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded border border-stone-600 bg-stone-950 px-3 py-2 text-white" /><span className="mt-1 block text-xs text-stone-400">12–128 characters</span></label>
            <button disabled={loading} className="gold-action w-full" type="submit">{loading ? 'Creating account…' : 'Create account'}</button>
          </form>
          <p className="mt-6 border-t border-stone-700 pt-5 text-center text-sm text-stone-300"><Link to="/auth/login" className="text-amber-200 underline">Return to sign in</Link></p>
        </div>
      </div>
    </PageEntrance>
  );
}

export default AuthActionPage;
