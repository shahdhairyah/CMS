import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { LockIcon, EyeIcon, EyeOffIcon, CheckIcon, ArrowLeft, ShieldIcon } from '../../utils/icons';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        setVerifying(true);
        const res = await authAPI.verifyResetToken(token);
        if (res && res.success) {
          setTokenValid(true);
          setEmail(res.data?.email || '');
        } else {
          setTokenValid(false);
        }
      } catch (err) {
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.resetPassword({ token, password });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(res.message || 'Invalid token. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Invalid token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-30" />
        <div className="absolute inset-0 bg-grid" />
        <div className="text-center relative z-10">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Verifying link...</p>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-30" />
        <div className="absolute inset-0 bg-grid" />
        <div className="w-full max-w-md relative z-10">
          {/* Header Logos */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <img
              src="/CVM.webp"
              alt="CVM University"
              className="w-11 h-11 rounded-xl object-contain bg-white ring-1 ring-accent/30 shadow-glow-sm"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="text-center leading-tight">
              <p className="text-lg font-bold text-white">A.D. Institute of Technology</p>
              <p className="text-xs text-muted">Affiliated to CVM University, Anand</p>
            </div>
            <img
              src="/adit.webp"
              alt="ADIT"
              className="w-11 h-11 rounded-xl object-contain bg-white ring-1 ring-accent/30 shadow-glow-sm"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          <div className="relative p-[1.5px] rounded-3xl overflow-hidden shadow-glow-lg">
            <div className="relative rounded-3xl bg-surface-raised p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto mb-5">
                <LockIcon size={32} className="text-danger" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Invalid or Changed Token</h2>
              <p className="text-muted text-sm mb-6 leading-relaxed">
                Invalid token. Please try again or request a new reset link.
              </p>
              <div className="space-y-3">
                <Link
                  to="/forgot-password"
                  className="w-full bg-accent text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-accent-hover transition-all flex items-center justify-center gap-2"
                >
                  Request New Reset Link
                </Link>
                <Link
                  to="/login"
                  className="w-full bg-surface-overlay text-muted-light hover:text-white py-2.5 rounded-xl font-medium text-sm border border-surface-border transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} /> Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-30" />
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-info/10 rounded-full blur-3xl animate-pulse-slow" />

      <div className="w-full max-w-md relative z-10">
        {/* Both logos with college name */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <img
            src="/CVM.webp"
            alt="CVM University"
            className="w-11 h-11 rounded-xl object-contain bg-white ring-1 ring-accent/30 shadow-glow-sm animate-float"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="text-center leading-tight">
            <p className="text-lg font-bold text-white">A.D. Institute of Technology</p>
            <p className="text-xs text-muted">Affiliated to CVM University, Anand</p>
          </div>
          <img
            src="/adit.webp"
            alt="ADIT"
            className="w-11 h-11 rounded-xl object-contain bg-white ring-1 ring-accent/30 shadow-glow-sm animate-float-slow"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* Gradient border card */}
        <div className="relative p-[1.5px] rounded-3xl overflow-hidden shadow-glow-lg">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#6366f1,#06b6d4,#f59e0b,#6366f1)] opacity-40 animate-spin-slow" />
          <div className="relative rounded-3xl bg-surface-raised p-8">
            {success ? (
              <div className="text-center animate-scale-in">
                <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-5">
                  <CheckIcon size={32} className="text-success" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Password Reset!</h2>
                <p className="text-muted text-sm mb-6">Your password has been updated. Redirecting to login...</p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-accent text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-accent-hover transition-all duration-200"
                >
                  <ArrowLeft size={16} />
                  Go to Login
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-[11px] font-semibold uppercase tracking-widest mb-4">
                    <ShieldIcon size={12} /> Reset Password
                  </span>
                  <h2 className="text-2xl font-bold text-white mb-2">Create New Password</h2>
                  {email ? (
                    <p className="text-xs text-muted">
                      Resetting password for: <strong className="text-white font-medium">{email}</strong>
                    </p>
                  ) : (
                    <p className="text-muted text-sm">Enter your new password below to reset your account credentials.</p>
                  )}
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2 animate-slide-down">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="label">New Password</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dark">
                        <LockIcon size={18} />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field pl-11 pr-11"
                        placeholder="Min 8 characters"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-dark hover:text-muted"
                      >
                        {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">Confirm New Password</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dark">
                        <LockIcon size={18} />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field pl-11"
                        placeholder="Re-enter password"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent text-white py-3 rounded-xl font-semibold text-sm
                      hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50
                      transition-all duration-200 shadow-sm hover:shadow-glow-sm"
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>

                <div className="text-center mt-6">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
