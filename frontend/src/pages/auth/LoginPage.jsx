import React, { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { PageEntrance } from '../../components/ui/PageEntrance';
import { useRole } from '../../hooks/useRole';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isDemoMode, currentRole, roleConfig } = useRole();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  if (isAuthenticated && !isDemoMode) return <Navigate to={roleConfig?.route || '/dashboard/customer'} replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    const result = await login({ email, password });
    submitting.current = false;
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    navigate(result.data.user.roleConfig?.route || ({
      manager: '/dashboard/manager', host: '/dashboard/host',
      floor_staff: '/dashboard/floor-staff', customer: '/dashboard/customer',
    }[result.data.user.role] || '/dashboard/customer'), { replace: true });
  };

  return (
    <PageEntrance className="auth-page min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-6 left-6 z-20"><Link to="/" className="auth-back inline-flex items-center gap-2 text-xs font-semibold transition-colors px-3 py-1.5">← <span>Back to Home</span></Link></div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="text-center mb-8">
          <div className="inline-block mb-3"><Logo size="lg" theme="light" withLink={false} /></div>
          <p className="auth-eyebrow mb-2">A calmer view of a busy room</p>
          <h1 className="auth-heading text-2xl tracking-tight">Sign in to Occupie</h1>
          <p className="text-xs text-slate-400 mt-2">Your account opens the workspace assigned to your role.</p>
        </div>
        <div className="auth-card rounded-2xl p-6 sm:p-8">
          {error && <p role="alert" className="mb-4 rounded border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm text-slate-200">Email address<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded border border-stone-600 bg-stone-950 px-3 py-2 text-white" /></label>
            <label className="block text-sm text-slate-200">Password<input required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded border border-stone-600 bg-stone-950 px-3 py-2 text-white" /></label>
            <div className="text-right"><Link className="text-sm text-amber-200 underline" to="/auth/forgot-password">Forgot password?</Link></div>
            <button disabled={loading} className="gold-action w-full" type="submit">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="mt-6 border-t border-stone-700 pt-5 text-center text-sm text-stone-300">New to Occupie? <Link to="/auth/register" className="text-amber-200 underline">Create a customer account</Link></p>
          {isDemoMode && <Link to="/auth/demo-roles">Open demo role preview</Link>}
        </div>
      </div>
    </PageEntrance>
  );
}

export default LoginPage;
