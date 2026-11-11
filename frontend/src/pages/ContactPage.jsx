import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailIcon, PhoneIcon, MapPinIcon, ArrowRight, CheckIcon, ShieldIcon } from '../utils/icons';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    subject: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-base text-white relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-info/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Bar */}
      <header className="relative z-10 border-b border-surface-border/60 bg-base/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/CVM.webp"
              alt="CVM University"
              className="w-9 h-9 rounded-xl object-contain bg-white ring-1 ring-accent/30 p-0.5"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <img
              src="/adit.webp"
              alt="ADIT"
              className="w-9 h-9 rounded-xl object-contain bg-white ring-1 ring-accent/30 p-0.5"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="leading-tight">
              <span className="font-bold text-white text-base">ADIT CMS</span>
              <p className="text-[10px] text-muted hidden sm:block">A.D. Patel Institute of Technology</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs font-medium text-muted hover:text-white px-3 py-1.5 transition-colors">
              Home
            </Link>
            <Link to="/login" className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
              Sign In <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10 sm:py-14 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-[11px] font-semibold uppercase tracking-wider mb-3">
            <ShieldIcon size={12} /> Helpdesk & Administration
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Get in Touch with <span className="gradient-text">ADIT CMS Support</span>
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Have questions about student admissions, account provisioning, fee payments, or technical support? Our administration office is here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Information & Office Details */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card border-surface-border/70 p-6">
              <h2 className="text-base font-semibold text-white mb-4">Contact Information</h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPinIcon size={18} className="text-accent-light" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted mb-0.5">Campus Address</p>
                    <p className="text-white font-medium leading-snug">
                      A.D. Patel Institute of Technology<br />
                      New Vallabh Vidyanagar, Post Box: 52,<br />
                      Anand - 388121, Gujarat, India
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <PhoneIcon size={18} className="text-info" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted mb-0.5">Phone Inquiries</p>
                    <p className="text-white font-medium">+91 2692 233680 / 233681</p>
                    <p className="text-xs text-muted">Mon - Sat: 9:00 AM - 5:00 PM</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MailIcon size={18} className="text-success" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted mb-0.5">Email Support</p>
                    <p className="text-white font-medium">principal@adit.ac.in</p>
                    <p className="text-xs text-muted">admin@adit.ac.in</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Registration Guide */}
            <div className="card border-surface-border/70 p-6 bg-gradient-to-br from-surface to-surface-raised">
              <h3 className="text-sm font-semibold text-white mb-2">Need a CMS Account?</h3>
              <p className="text-xs text-muted leading-relaxed mb-3">
                Students and faculty members are provisioned by the department administrator. Please carry your college admission letter or ID proof to the administration block.
              </p>
              <Link to="/login" className="text-xs font-semibold text-accent-light hover:text-accent flex items-center gap-1.5 transition-colors">
                Already registered? Sign in here <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Contact / Support Message Form */}
          <div className="lg:col-span-7">
            <div className="relative p-[1.5px] rounded-3xl overflow-hidden shadow-glow-lg">
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#6366f1,#06b6d4,#f59e0b,#6366f1)] opacity-30 animate-spin-slow pointer-events-none" />
              <div className="relative rounded-3xl bg-surface-raised p-6 sm:p-8">
                {submitted ? (
                  <div className="py-12 text-center animate-scale-in">
                    <div className="w-14 h-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
                      <CheckIcon size={28} className="text-success" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Message Received</h3>
                    <p className="text-sm text-muted max-w-sm mx-auto mb-6">
                      Thank you for contacting ADIT support. Our department administrator will review your query and get back to you shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="btn-secondary text-xs px-5 py-2.5"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-white mb-1">Send a Message</h2>
                    <p className="text-xs text-muted mb-6">Fill in the form below and the administration team will respond to your email.</p>

                    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Full Name</label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Rahul Sharma"
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label className="label">Email Address</label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your.email@example.com"
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label">I am a</label>
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="input-field bg-surface-overlay"
                          >
                            <option value="student">Student / Prospective Student</option>
                            <option value="faculty">Faculty / Staff Member</option>
                            <option value="parent">Parent / Guardian</option>
                            <option value="other">Other Inquiry</option>
                          </select>
                        </div>

                        <div>
                          <label className="label">Subject</label>
                          <input
                            type="text"
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            placeholder="e.g. Account activation / Fees"
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Message / Details</label>
                        <textarea
                          rows={4}
                          required
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Describe your inquiry or issue..."
                          className="input-field resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-accent text-white py-3 rounded-xl font-semibold text-sm
                          hover:bg-accent-hover active:scale-[0.99]
                          transition-all duration-200 shadow-sm hover:shadow-glow-sm
                          flex items-center justify-center gap-2 mt-2"
                      >
                        Submit Inquiry <ArrowRight size={15} />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-border/50 py-5 text-center text-xs text-muted">
        <p>© {new Date().getFullYear()} A.D. Patel Institute of Technology (ADIT) • CVM University</p>
      </footer>
    </div>
  );
}
