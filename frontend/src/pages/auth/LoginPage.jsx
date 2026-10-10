import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/common/Logo';
import { useRole } from '../../hooks/useRole';
import { ROLES, ROLE_CONFIGS } from '../../lib/constants';
import { ArrowLeft, Lock, Mail, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { loginAsRole } = useRole();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please provide a valid email format (e.g. user@domain.com).';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    // Phase 1: Simulate authentication validation, default to Manager dashboard
    setTimeout(() => {
      setIsLoading(false);
      loginAsRole(ROLES.MANAGER);
      navigate('/dashboard/manager');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-occupie-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-occupie-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top back navigation */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-occupie-navy-900/80 px-3 py-1.5 rounded-xl border border-occupie-navy-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="text-center mb-8">
          <div className="inline-block mb-3">
            <Logo size="lg" theme="light" withLink={false} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Sign in to Occupie
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Smarter Table Allocation, Shorter Waits, Happier Dining.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-occupie-navy-900/90 backdrop-blur-xl border border-occupie-navy-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Phase 1 Disclaimer Notice */}
          <div className="mb-6 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Phase 1 UI Notice:</strong> Enter any valid credentials to sign in, or click{' '}
              <Link to="/auth/demo-roles" className="underline font-bold text-amber-200 hover:text-white">
                Demo Role Selector
              </Link>{' '}
              to directly inspect any of the four dashboards.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work or Personal Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@restaurant.com"
              startIcon={Mail}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              startIcon={Lock}
              showPasswordToggle={true}
              error={errors.password}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="accent"
                className="w-full text-sm font-bold"
                size="lg"
                isLoading={isLoading}
              >
                Sign In to Dashboard
              </Button>
            </div>
          </form>

          {/* Quick Demo Access Button */}
          <div className="mt-6 pt-6 border-t border-occupie-navy-800 text-center space-y-3">
            <p className="text-xs text-slate-400">
              Need to test Host, Floor Staff, or Customer view?
            </p>
            <Button
              variant="secondary"
              size="md"
              className="w-full text-xs font-semibold"
              onClick={() => navigate('/auth/demo-roles')}
              icon={UserCheck}
            >
              Open Role-Selection Sandbox
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
