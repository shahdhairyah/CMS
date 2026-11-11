import { Link } from 'react-router-dom';
import { ArrowRight, ShieldIcon, MailIcon, PhoneIcon } from '../../utils/icons';

export default function RegisterPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-base p-4 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-info/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Single Card - Compact, Zero Scroll */}
      <div className="w-full max-w-md relative z-10">
        <div className="relative p-[1.5px] rounded-3xl overflow-hidden shadow-glow-lg">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#6366f1,#06b6d4,#f59e0b,#6366f1)] opacity-35 animate-spin-slow pointer-events-none" />

          <div className="relative rounded-3xl bg-surface-raised p-6 sm:p-7 flex flex-col justify-between text-center">
            {/* Header with Logos */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <img
                src="/CVM.webp"
                alt="CVM University"
                className="w-10 h-10 rounded-xl object-contain bg-white ring-1 ring-accent/30 p-0.5"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <img
                src="/adit.webp"
                alt="ADIT"
                className="w-10 h-10 rounded-xl object-contain bg-white ring-1 ring-accent/30 p-0.5"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 border border-warning/20 text-warning text-[11px] font-semibold uppercase tracking-wider mx-auto mb-3">
              <ShieldIcon size={12} /> Registration Closed
            </span>

            <h1 className="text-xl font-bold text-white tracking-tight mb-2">
              Registration Not Allowed
            </h1>

            <p className="text-xs text-muted leading-relaxed mb-5 max-w-xs mx-auto">
              Student self-registration is disabled. All student accounts are created directly by the college administration.
            </p>

            {/* Instruction Notice Card */}
            <div className="bg-surface-overlay/80 rounded-2xl border border-surface-border p-4 mb-4 text-left">
              <h2 className="text-xs font-semibold text-accent-light mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-light" />
                Please Contact Administration
              </h2>
              <p className="text-xs text-muted leading-relaxed mb-3">
                To activate your student account, please contact the college admin office or your department coordinator with your enrollment details.
              </p>
              
              <div className="space-y-2 pt-2 border-t border-surface-border/50 text-[11px] text-muted-light">
                <div className="flex items-center gap-2">
                  <MailIcon size={13} className="text-accent-light flex-shrink-0" />
                  <span className="font-mono text-white/90">admin@adit.ac.in</span>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon size={13} className="text-info flex-shrink-0" />
                  <span>+91 2692 233680</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Link
                to="/contact"
                className="w-full bg-accent text-white py-2.5 rounded-xl font-semibold text-xs
                  hover:bg-accent-hover active:scale-[0.99]
                  transition-all duration-200 shadow-sm hover:shadow-glow-sm
                  flex items-center justify-center gap-1.5"
              >
                Contact Admin Support
                <ArrowRight size={14} />
              </Link>

              <Link
                to="/login"
                className="w-full bg-surface-overlay hover:bg-surface-hover text-muted-light hover:text-white py-2.5 rounded-xl font-medium text-xs border border-surface-border transition-all flex items-center justify-center"
              >
                Already have an account? Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
