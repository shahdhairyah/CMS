import { useState, useEffect, useMemo } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  SettingsIcon, SaveIcon, RefreshIcon, CheckIcon, WarningIcon,
  LoaderIcon, ShieldIcon, ActivityIcon, BookOpen, LibraryIcon,
  FeeIcon, UsersIcon, ClockIcon, MailIcon, PhoneIcon,
  MapPinIcon, SearchIcon, DownloadIcon, ChevronLeft, ChevronRight,
  DepartmentIcon, LockIcon
} from '../../utils/icons';
import { formatDateTime } from '../../utils/helpers';
import { adminAPI } from '../../services/api';

const DEFAULT_SETTINGS = {
  college_name: 'A.D. Institute of Technology (ADIT)',
  college_code: 'ADIT-001',
  principal_name: 'Dr. Vishal N. Singh',
  college_email: 'principal@adit.ac.in',
  college_phone: '+91-2692-233680',
  college_website: 'https://www.adit.ac.in',
  college_address: 'ADIT Campus, New Vallabh Vidyanagar, Anand, Gujarat - 388121',
  academic_year: '2026-27',
  current_semester_type: 'Even Semester',
  min_attendance_percentage: '75',
  passing_marks_percentage: '40',
  grading_system: '10-Point CGPA Scale',
  library_fine_per_day: '5',
  max_books_issue: '3',
  book_issue_duration_days: '14',
  razorpay_key_id: 'rzp_test_aditcms2026',
  currency_symbol: '₹',
  fee_due_days_grace: '15',
  enable_online_payment: '1',
  enable_student_registrations: '1',
  maintenance_mode: '0',
  session_timeout_minutes: '60',
  system_timezone: 'Asia/Kolkata',
  portal_notice_banner: 'Welcome to ADIT Academic Portal. Academic Term 2026-27 is now in progress.',
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('institute');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_SETTINGS);
  const [systemInfo, setSystemInfo] = useState(null);
  const [backups, setBackups] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(15);
  const [auditSearch, setAuditSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const [settingsRes, infoRes, backupsRes, auditRes] = await Promise.allSettled([
        adminAPI.getSettings(),
        adminAPI.getSystemInfo(),
        adminAPI.getBackups(),
        adminAPI.getAuditLogs({ page: 1, page_size: auditPageSize }),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.success) {
        const loaded = { ...DEFAULT_SETTINGS, ...settingsRes.value.data };
        setSettings(loaded);
        setOriginalSettings(loaded);
      } else {
        // fallback to defaults if database row missing
        setSettings(DEFAULT_SETTINGS);
        setOriginalSettings(DEFAULT_SETTINGS);
      }

      if (infoRes.status === 'fulfilled' && infoRes.value?.success) {
        setSystemInfo(infoRes.value.data);
      }

      if (backupsRes.status === 'fulfilled' && backupsRes.value?.success) {
        setBackups(Array.isArray(backupsRes.value.data) ? backupsRes.value.data : []);
      }

      if (auditRes.status === 'fulfilled' && auditRes.value?.success) {
        setAuditLogs(auditRes.value.data?.data || auditRes.value.data || []);
        setAuditTotal(auditRes.value.data?.total || (auditRes.value.data?.length ?? 0));
      }
    } catch (err) {
      setError(err?.message || 'Failed to initialize settings');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = useMemo(() => {
    return Object.keys(settings).some((key) => settings[key] !== originalSettings[key]);
  }, [settings, originalSettings]);

  const changedCount = useMemo(() => {
    return Object.keys(settings).filter((key) => settings[key] !== originalSettings[key]).length;
  }, [settings, originalSettings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? '1' : '0') : value,
    }));
  };

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key] === '1' ? '0' : '1',
    }));
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setSuccessMsg('Changes discarded');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      // Validate email if present
      if (settings.college_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.college_email)) {
        throw new Error('Please enter a valid institution email address');
      }

      // Validate numeric fields
      const minAtt = parseInt(settings.min_attendance_percentage, 10);
      if (isNaN(minAtt) || minAtt < 0 || minAtt > 100) {
        throw new Error('Minimum Attendance Percentage must be between 0 and 100');
      }

      const passMarks = parseInt(settings.passing_marks_percentage, 10);
      if (isNaN(passMarks) || passMarks < 0 || passMarks > 100) {
        throw new Error('Passing Marks Percentage must be between 0 and 100');
      }

      const res = await adminAPI.updateSettings(settings);
      if (res.success) {
        setOriginalSettings(settings);
        setSuccessMsg(res.message || 'System settings saved and applied to database');
        // Refresh audit logs in background
        fetchAuditLogs(auditPage);
      } else {
        setError(res.message || 'Failed to save settings');
      }
    } catch (err) {
      setError(err?.message || 'Error occurred while saving settings');
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await adminAPI.backup();
      if (res.success) {
        setSuccessMsg(`Database backup generated successfully: ${res.data?.filename || 'Backup created'}`);
        // Refresh backups list
        const bRes = await adminAPI.getBackups();
        if (bRes.success) setBackups(bRes.data || []);
      } else {
        setError(res.message || 'Database backup failed');
      }
    } catch (err) {
      setError(err?.message || 'Backup execution encountered an error');
    } finally {
      setBackupLoading(false);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    try {
      const res = await adminAPI.getAuditLogs({ page, page_size: auditPageSize });
      if (res.success) {
        setAuditLogs(res.data?.data || res.data || []);
        setAuditTotal(res.data?.total || 0);
        setAuditPage(page);
      }
    } catch (err) {
      // silent
    }
  };

  const filteredAuditLogs = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const q = auditSearch.toLowerCase();
    return auditLogs.filter(
      (log) =>
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.user_email && log.user_email.toLowerCase().includes(q)) ||
        (log.table_name && log.table_name.toLowerCase().includes(q)) ||
        (log.ip_address && log.ip_address.includes(q))
    );
  }, [auditLogs, auditSearch]);

  const tabs = [
    { id: 'institute', label: 'Institute Profile', icon: DepartmentIcon, badge: null },
    { id: 'academic', label: 'Academic Policy', icon: BookOpen, badge: null },
    { id: 'library', label: 'Library Rules', icon: LibraryIcon, badge: null },
    { id: 'finance', label: 'Fees & Payments', icon: FeeIcon, badge: null },
    { id: 'security', label: 'System & Security', icon: ShieldIcon, badge: settings.maintenance_mode === '1' ? 'Alert' : null },
    { id: 'backups', label: 'Backups & DB', icon: SaveIcon, badge: backups.length || null },
    { id: 'audit', label: 'Audit Trail & Health', icon: ActivityIcon, badge: null },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading enterprise system settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <PageHeader
        title="System & Institute Settings"
        subtitle="Configure institution credentials, academic rules, circulation policies, security toggles, and database management."
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={loading || saving}
              className="btn btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3.5"
              title="Refresh from server"
            >
              <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`btn ${hasChanges ? 'btn-primary shadow-glow-sm' : 'btn-secondary opacity-60'} inline-flex items-center gap-2 text-xs py-2 px-5`}
            >
              {saving ? <LoaderIcon size={14} className="animate-spin" /> : <SaveIcon size={14} />}
              <span>{saving ? 'Saving Changes...' : 'Save All Settings'}</span>
            </button>
          </div>
        }
      />

      {/* Floating Unsaved Changes Warning Banner */}
      {hasChanges && (
        <div className="sticky top-4 z-30 bg-surface-raised border border-accent/40 rounded-xl p-3.5 shadow-elevated flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
            <div className="text-xs">
              <span className="font-semibold text-white">Unsaved modifications:</span>{' '}
              <span className="text-muted-light">{changedCount} setting{changedCount > 1 ? 's' : ''} altered. Remember to save to update live college policy.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="btn btn-ghost text-xs py-1.5 px-3 text-muted hover:text-white"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary text-xs py-1.5 px-4 shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Now'}
            </button>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger p-4 rounded-xl flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <WarningIcon size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-muted hover:text-white text-lg">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-success/10 border border-success/30 text-success p-4 rounded-xl flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckIcon size={18} className="flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-muted hover:text-white text-lg">&times;</button>
        </div>
      )}

      {/* Maintenance Mode Warning Badge */}
      {settings.maintenance_mode === '1' && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-3.5 text-warning text-sm">
          <WarningIcon size={20} className="flex-shrink-0 animate-bounce" />
          <div className="flex-1">
            <span className="font-semibold text-white">Maintenance Mode is Active:</span>{' '}
            Students and faculty will see a system maintenance alert when attempting access. Admin users retain full operational access.
          </div>
        </div>
      )}

      {/* Top Quick Status Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 border border-surface-border bg-surface-raised flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Institution</span>
            <DepartmentIcon size={16} className="text-accent" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white truncate" title={settings.college_name}>{settings.college_name}</div>
            <div className="text-xs text-muted mt-0.5">Code: {settings.college_code} • {settings.academic_year}</div>
          </div>
        </div>

        <div className="card p-4 border border-surface-border bg-surface-raised flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Academic Term</span>
            <BookOpen size={16} className="text-info" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white">{settings.current_semester_type}</div>
            <div className="text-xs text-muted mt-0.5">Min Attendance: <span className="text-accent-light font-semibold">{settings.min_attendance_percentage}%</span></div>
          </div>
        </div>

        <div className="card p-4 border border-surface-border bg-surface-raised flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Portal Security</span>
            <ShieldIcon size={16} className={settings.maintenance_mode === '1' ? 'text-warning' : 'text-success'} />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${settings.maintenance_mode === '1' ? 'bg-warning' : 'bg-success'}`} />
              <span className="text-lg font-bold text-white">{settings.maintenance_mode === '1' ? 'Maintenance' : 'Live Online'}</span>
            </div>
            <div className="text-xs text-muted mt-0.5">Registrations: {settings.enable_student_registrations === '1' ? 'Open' : 'Restricted'}</div>
          </div>
        </div>

        <div className="card p-4 border border-surface-border bg-surface-raised flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Server Status</span>
            <ActivityIcon size={16} className="text-accent" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white font-mono">{systemInfo ? `PHP ${systemInfo.php_version?.split('-')[0]}` : 'Active'}</div>
            <div className="text-xs text-muted mt-0.5 truncate">{systemInfo ? systemInfo.mysql_version : 'MySQL Database Connected'}</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-surface-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-accent text-white shadow-glow-sm'
                  : 'text-muted hover:text-muted-light hover:bg-surface-hover'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-surface-border text-muted-light'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {/* 1. Institute Profile Tab */}
      {activeTab === 'institute' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <h3 className="text-base font-semibold text-white">General Institution Information</h3>
                  <p className="text-xs text-muted mt-0.5">Primary identity and contact information displayed across student and faculty portals.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">College / University Name</label>
                  <input
                    type="text"
                    name="college_name"
                    value={settings.college_name}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g. A.D. Institute of Technology"
                  />
                  <p className="text-[11px] text-muted-dark mt-1">Full legal institute title printed on certificates, fee receipts, and official transcripts.</p>
                </div>

                <div>
                  <label className="label">College Identification Code</label>
                  <input
                    type="text"
                    name="college_code"
                    value={settings.college_code}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g. ADIT-001"
                  />
                </div>

                <div>
                  <label className="label">Principal / Director Name</label>
                  <input
                    type="text"
                    name="principal_name"
                    value={settings.principal_name}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g. Dr. Vishal N. Singh"
                  />
                </div>

                <div>
                  <label className="label">Official Contact Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      name="college_email"
                      value={settings.college_email}
                      onChange={handleChange}
                      className="input-field pl-9"
                      placeholder="principal@adit.ac.in"
                    />
                    <MailIcon size={15} className="absolute left-3 top-3.5 text-muted-dark" />
                  </div>
                </div>

                <div>
                  <label className="label">Official Phone Helpline</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="college_phone"
                      value={settings.college_phone}
                      onChange={handleChange}
                      className="input-field pl-9"
                      placeholder="+91-2692-233680"
                    />
                    <PhoneIcon size={15} className="absolute left-3 top-3.5 text-muted-dark" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Official Website URL</label>
                  <input
                    type="url"
                    name="college_website"
                    value={settings.college_website}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="https://www.adit.ac.in"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Campus Postal Address</label>
                  <textarea
                    rows={3}
                    name="college_address"
                    value={settings.college_address}
                    onChange={handleChange}
                    className="input-field resize-none"
                    placeholder="Full campus location address"
                  />
                </div>
              </div>
            </div>

            {/* Global Notice Banner */}
            <div className="card space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white">Campus Portal Broadcast Notice</h3>
                <p className="text-xs text-muted mt-0.5">Top-level banner message broadcasted across all Student, Faculty, and HOD dashboards.</p>
              </div>
              <div>
                <textarea
                  rows={2}
                  name="portal_notice_banner"
                  value={settings.portal_notice_banner}
                  onChange={handleChange}
                  className="input-field resize-none"
                  placeholder="e.g. Welcome to ADIT Academic Portal. Academic Term 2026-27 is now in progress."
                />
              </div>
              {settings.portal_notice_banner && (
                <div className="p-3 bg-surface-overlay border border-surface-border rounded-lg text-xs flex items-center gap-2.5 text-muted-light">
                  <span className="badge badge-primary text-[10px]">Preview</span>
                  <span className="truncate">{settings.portal_notice_banner}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Institution Card Preview */}
          <div className="space-y-6">
            <div className="card space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Institution Identity Card</h4>
              <div className="p-5 rounded-xl bg-gradient-to-br from-surface-overlay to-surface-raised border border-surface-border text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                  <DepartmentIcon size={32} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">{settings.college_name || 'College Name'}</h4>
                  <p className="text-xs text-accent-light mt-0.5">{settings.college_code || 'CODE'}</p>
                </div>
                <div className="text-xs text-muted space-y-1 pt-2 border-t border-surface-border">
                  <p><span className="text-muted-dark">Principal:</span> {settings.principal_name || 'Dr. Principal'}</p>
                  <p><span className="text-muted-dark">Email:</span> {settings.college_email || 'email@domain.com'}</p>
                  <p><span className="text-muted-dark">Phone:</span> {settings.college_phone || '-'}</p>
                </div>
                <div className="pt-2">
                  <span className="badge badge-success text-[11px]">Affiliated & Accredited</span>
                </div>
              </div>
            </div>

            <div className="card space-y-3 bg-surface-raised border border-surface-border">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Quick Actions</h4>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="w-full btn btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
              >
                <SaveIcon size={14} />
                <span>Save Profile Changes</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanges}
                className="w-full btn btn-secondary text-xs py-2 flex items-center justify-center gap-2"
              >
                <span>Discard Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Academic Policy Tab */}
      {activeTab === 'academic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card space-y-5">
              <div className="pb-3 border-b border-surface-border">
                <h3 className="text-base font-semibold text-white">Academic Calendar & Grading Policy</h3>
                <p className="text-xs text-muted mt-0.5">Control the active academic cycle, passing benchmarks, and attendance eligibility criteria.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label">Current Academic Year</label>
                  <input
                    type="text"
                    name="academic_year"
                    value={settings.academic_year}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="2026-27"
                  />
                  <p className="text-[11px] text-muted-dark mt-1">Default year linked to syllabus, examinations, and fee schedules.</p>
                </div>

                <div>
                  <label className="label">Active Semester Session</label>
                  <select
                    name="current_semester_type"
                    value={settings.current_semester_type}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="Odd Semester">Odd Semester (Sem 1, 3, 5, 7)</option>
                    <option value="Even Semester">Even Semester (Sem 2, 4, 6, 8)</option>
                    <option value="Annual">Annual / Both Semesters</option>
                  </select>
                </div>

                <div>
                  <label className="label">Minimum Attendance Required (%)</label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      name="min_attendance_percentage"
                      value={settings.min_attendance_percentage}
                      onChange={handleChange}
                      className="input-field font-semibold"
                    />
                    <div className="w-full bg-surface-overlay h-2 rounded-full overflow-hidden border border-surface-border">
                      <div
                        className={`h-full transition-all ${
                          parseInt(settings.min_attendance_percentage, 10) >= 75 ? 'bg-success' : 'bg-warning'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, parseInt(settings.min_attendance_percentage, 10) || 0))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-dark">Mandatory GTU / Institute minimum for exam hall ticket eligibility (standard: 75%).</p>
                  </div>
                </div>

                <div>
                  <label className="label">Minimum Passing Marks (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="passing_marks_percentage"
                    value={settings.passing_marks_percentage}
                    onChange={handleChange}
                    className="input-field font-semibold"
                  />
                  <p className="text-[11px] text-muted-dark mt-1">Aggregate threshold required in mid-term and external examinations (standard: 40%).</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Evaluation & Grading System</label>
                  <input
                    type="text"
                    name="grading_system"
                    value={settings.grading_system}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="10-Point CGPA Scale"
                  />
                  <p className="text-[11px] text-muted-dark mt-1">Evaluation standard reported on result cards and marksheet generators.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Policy Guidelines */}
          <div className="space-y-6">
            <div className="card space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Policy Compliance Summary</h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-overlay border border-surface-border">
                  <span className="text-muted">Attendance Rule</span>
                  <span className="font-semibold text-white">≥ {settings.min_attendance_percentage}% required</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-overlay border border-surface-border">
                  <span className="text-muted">Passing Standard</span>
                  <span className="font-semibold text-white">≥ {settings.passing_marks_percentage}% required</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-overlay border border-surface-border">
                  <span className="text-muted">Evaluation Standard</span>
                  <span className="font-semibold text-accent-light">{settings.grading_system}</span>
                </div>
              </div>
            </div>

            <div className="card p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-2 text-xs text-muted-light">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <CheckIcon size={14} className="text-accent" />
                <span>Automatic Enforcement</span>
              </div>
              <p>Faculty and HOD attendance dashboards will flag students below <strong className="text-white">{settings.min_attendance_percentage}%</strong> as &quot;Defaulters&quot; with remedial alerts.</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Library Rules Tab */}
      {activeTab === 'library' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card space-y-5">
              <div className="pb-3 border-b border-surface-border">
                <h3 className="text-base font-semibold text-white">Library Circulation & Lending Policies</h3>
                <p className="text-xs text-muted mt-0.5">Determine book checkout limits, loan period windows, and daily overdue fine calculations.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label">Max Books Allowed per Student</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    name="max_books_issue"
                    value={settings.max_books_issue}
                    onChange={handleChange}
                    className="input-field font-semibold"
                  />
                  <p className="text-[11px] text-muted-dark mt-1">Librarian issue module will block additional book checkouts once limit is reached.</p>
                </div>

                <div>
                  <label className="label">Lending Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    name="book_issue_duration_days"
                    value={settings.book_issue_duration_days}
                    onChange={handleChange}
                    className="input-field font-semibold"
                  />
                  <p className="text-[11px] text-muted-dark mt-1">Standard period before an issued copy is marked overdue (typically 14 days).</p>
                </div>

                <div>
                  <label className="label">Overdue Fine per Day ({settings.currency_symbol})</label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    name="library_fine_per_day"
                    value={settings.library_fine_per_day}
                    onChange={handleChange}
                    className="input-field font-semibold"
                  />
                  <p className="text-[11px] text-muted-dark mt-1">Daily penalty fee accrued for each day past the scheduled return date.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card space-y-3">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Circulation Preview</h4>
              <div className="p-4 rounded-xl bg-surface-overlay border border-surface-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Max Issue Quota:</span>
                  <span className="font-semibold text-white">{settings.max_books_issue} books</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Return Window:</span>
                  <span className="font-semibold text-white">{settings.book_issue_duration_days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Daily Overdue Rate:</span>
                  <span className="font-semibold text-danger">{settings.currency_symbol} {settings.library_fine_per_day} / day</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Fees & Payments Tab */}
      {activeTab === 'finance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card space-y-5">
              <div className="pb-3 border-b border-surface-border">
                <h3 className="text-base font-semibold text-white">Payment Gateway & Fee Collection Policy</h3>
                <p className="text-xs text-muted mt-0.5">Integrate online payment gateways and define grace windows for college fee receipts.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label">Currency Symbol</label>
                  <input
                    type="text"
                    name="currency_symbol"
                    value={settings.currency_symbol}
                    onChange={handleChange}
                    className="input-field font-semibold"
                    placeholder="₹"
                  />
                  <p className="text-[11px] text-muted-dark mt-1">Displayed in fee structures, receipts, and finance charts.</p>
                </div>

                <div>
                  <label className="label">Fee Due Grace Period (Days)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    name="fee_due_days_grace"
                    value={settings.fee_due_days_grace}
                    onChange={handleChange}
                    className="input-field font-semibold"
                  />
                  <p className="text-[11px] text-muted-dark mt-1">Days allowed past invoice generation before overdue flags appear.</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Razorpay / Payment Gateway Key ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="razorpay_key_id"
                      value={settings.razorpay_key_id}
                      onChange={handleChange}
                      className="input-field font-mono text-xs pl-9"
                      placeholder="rzp_live_xxxxxxxxxxxx or rzp_test_xxxxxxxxxxxx"
                    />
                    <LockIcon size={15} className="absolute left-3 top-3.5 text-muted-dark" />
                  </div>
                  <p className="text-[11px] text-muted-dark mt-1">Public client key used to initialize Razorpay / Cashfree checkout SDK.</p>
                </div>

                {/* Online Payment Toggle */}
                <div className="sm:col-span-2 pt-2">
                  <div className="p-4 rounded-xl bg-surface-overlay border border-surface-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Enable Online Student Fee Payment</div>
                      <p className="text-xs text-muted mt-0.5">Allow students to pay semester and exam fees directly via debit card, UPI, or net banking.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle('enable_online_payment')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        settings.enable_online_payment === '1' ? 'bg-success' : 'bg-surface-border'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.enable_online_payment === '1' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card space-y-3">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Gateway Status</h4>
              <div className="p-4 rounded-xl bg-surface-overlay border border-surface-border space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Online Payments:</span>
                  <span className={`badge ${settings.enable_online_payment === '1' ? 'badge-success' : 'badge-danger'}`}>
                    {settings.enable_online_payment === '1' ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Active Key ID:</span>
                  <span className="font-mono text-[11px] text-muted-light truncate max-w-[150px]">
                    {settings.razorpay_key_id ? `${settings.razorpay_key_id.substring(0, 10)}...` : 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. System & Security Tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card space-y-5">
              <div className="pb-3 border-b border-surface-border">
                <h3 className="text-base font-semibold text-white">System Access & Security Controls</h3>
                <p className="text-xs text-muted mt-0.5">Manage user onboarding, emergency maintenance windows, and session timeout thresholds.</p>
              </div>

              <div className="space-y-4">
                {/* Maintenance Mode Toggle */}
                <div className={`p-4 rounded-xl border transition-colors flex items-center justify-between ${
                  settings.maintenance_mode === '1' ? 'bg-warning/10 border-warning/30' : 'bg-surface-overlay border-surface-border'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Emergency Maintenance Mode</span>
                      {settings.maintenance_mode === '1' && <span className="badge badge-warning text-[10px]">Active</span>}
                    </div>
                    <p className="text-xs text-muted mt-0.5">When active, only administrators can sign in. Students and faculty are blocked with a maintenance notice.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('maintenance_mode')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      settings.maintenance_mode === '1' ? 'bg-warning' : 'bg-surface-border'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.maintenance_mode === '1' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Self-Registration Toggle */}
                <div className="p-4 rounded-xl bg-surface-overlay border border-surface-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Allow Public Student Self-Registration</div>
                    <p className="text-xs text-muted mt-0.5">When enabled, the public <code>/register</code> page accepts new student account enrollments.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('enable_student_registrations')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      settings.enable_student_registrations === '1' ? 'bg-success' : 'bg-surface-border'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.enable_student_registrations === '1' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="label">Session Timeout (Minutes)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        name="session_timeout_minutes"
                        value={settings.session_timeout_minutes}
                        onChange={handleChange}
                        className="input-field font-semibold pl-9"
                      />
                      <ClockIcon size={15} className="absolute left-3 top-3.5 text-muted-dark" />
                    </div>
                    <p className="text-[11px] text-muted-dark mt-1">Inactivity period before token requires re-authentication (recommended: 60m).</p>
                  </div>

                  <div>
                    <label className="label">System Timezone</label>
                    <input
                      type="text"
                      name="system_timezone"
                      value={settings.system_timezone}
                      onChange={handleChange}
                      className="input-field font-mono text-xs"
                      placeholder="Asia/Kolkata"
                    />
                    <p className="text-[11px] text-muted-dark mt-1">Default timezone applied to logs and attendance time records.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card space-y-3">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Access Checklist</h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-muted-light">
                  <CheckIcon size={14} className="text-success" />
                  <span>JWT Tokens with HTTP Authorization Header</span>
                </div>
                <div className="flex items-center gap-2 text-muted-light">
                  <CheckIcon size={14} className="text-success" />
                  <span>Role-based Route Guards (RBAC)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-light">
                  <CheckIcon size={14} className="text-success" />
                  <span>Automated Audit Logging on DB Changes</span>
                </div>
                <div className="flex items-center gap-2 text-muted-light">
                  <CheckIcon size={14} className="text-success" />
                  <span>Password Reset Tokens with 1-Hour Expiry</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Backups & Database Tab */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
              <div>
                <h3 className="text-base font-semibold text-white">System Backups & Database Snapshots</h3>
                <p className="text-xs text-muted mt-0.5">Create and review full SQL database snapshots for disaster recovery.</p>
              </div>
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={backupLoading}
                className="btn btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-4 shadow-glow-sm"
              >
                {backupLoading ? <LoaderIcon size={14} className="animate-spin" /> : <SaveIcon size={14} />}
                <span>{backupLoading ? 'Dumping Database...' : 'Create Backup Snapshot Now'}</span>
              </button>
            </div>

            {/* Backups Table */}
            {backups.length === 0 ? (
              <div className="py-12 text-center">
                <EmptyState
                  title="No system backups found"
                  description="Click 'Create Backup Snapshot Now' above to generate an initial database dump."
                  icon={SaveIcon}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-overlay text-muted uppercase tracking-wider border-b border-surface-border font-semibold">
                    <tr>
                      <th className="py-3 px-4">Backup Filename</th>
                      <th className="py-3 px-4">File Size</th>
                      <th className="py-3 px-4">Created At</th>
                      <th className="py-3 px-4">Initiator</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-muted-light">
                    {backups.map((b) => (
                      <tr key={b.id} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-white flex items-center gap-2">
                          <SaveIcon size={14} className="text-accent flex-shrink-0" />
                          <span className="truncate max-w-[280px]">{b.filename}</span>
                        </td>
                        <td className="py-3.5 px-4">{formatBytes(b.size)}</td>
                        <td className="py-3.5 px-4 text-muted">{formatDateTime(b.created_at)}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-muted-light">{b.created_by_email || 'System Admin'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="badge badge-success text-[10px]">Verified Dump</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Audit Trail & System Health Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Server Environment Health Cards */}
          {systemInfo && (
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-muted">Server & Runtime Environment Diagnostics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="p-3 bg-surface-overlay border border-surface-border rounded-lg">
                  <div className="text-muted text-[10px] uppercase font-semibold">PHP Version</div>
                  <div className="text-sm font-bold text-white mt-1 font-mono">{systemInfo.php_version}</div>
                </div>
                <div className="p-3 bg-surface-overlay border border-surface-border rounded-lg">
                  <div className="text-muted text-[10px] uppercase font-semibold">Database Engine</div>
                  <div className="text-sm font-bold text-white mt-1 font-mono truncate">{systemInfo.mysql_version}</div>
                </div>
                <div className="p-3 bg-surface-overlay border border-surface-border rounded-lg">
                  <div className="text-muted text-[10px] uppercase font-semibold">Memory Limit</div>
                  <div className="text-sm font-bold text-accent-light mt-1 font-mono">{systemInfo.memory_limit}</div>
                </div>
                <div className="p-3 bg-surface-overlay border border-surface-border rounded-lg">
                  <div className="text-muted text-[10px] uppercase font-semibold">Max Upload Size</div>
                  <div className="text-sm font-bold text-white mt-1 font-mono">{systemInfo.upload_max_filesize}</div>
                </div>
                <div className="p-3 bg-surface-overlay border border-surface-border rounded-lg">
                  <div className="text-muted text-[10px] uppercase font-semibold">Max Exec Time</div>
                  <div className="text-sm font-bold text-white mt-1 font-mono">{systemInfo.max_execution_time}</div>
                </div>
                <div className="p-3 bg-surface-overlay border border-surface-border rounded-lg">
                  <div className="text-muted text-[10px] uppercase font-semibold">Server Timezone</div>
                  <div className="text-sm font-bold text-white mt-1 font-mono">{systemInfo.timezone}</div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs Table */}
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-base font-semibold text-white">System Audit Trail</h3>
                <p className="text-xs text-muted mt-0.5">Track administrator modifications, security updates, and automated system actions.</p>
              </div>

              {/* Search Audit Logs */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Filter logs by action / email..."
                  className="input-field text-xs py-2 pl-8"
                />
                <SearchIcon size={14} className="absolute left-2.5 top-2.5 text-muted-dark" />
              </div>
            </div>

            {filteredAuditLogs.length === 0 ? (
              <div className="py-10 text-center">
                <EmptyState
                  title="No audit events found"
                  description="No log records matched your query."
                  icon={ActivityIcon}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-overlay text-muted uppercase tracking-wider border-b border-surface-border font-semibold">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target Entity</th>
                      <th className="py-3 px-4">User Account</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-muted-light">
                    {filteredAuditLogs.map((log) => {
                      const action = (log.action || '').toUpperCase();
                      const isUpdate = action.includes('UPDATE');
                      const isCreate = action.includes('CREATE') || action.includes('ADD');
                      const isDelete = action.includes('DELETE');
                      const isAttendance = action.includes('ATTENDANCE');

                      const badgeClass = isUpdate
                        ? 'badge-primary'
                        : isCreate
                        ? 'badge-success'
                        : isDelete
                        ? 'badge-danger'
                        : isAttendance
                        ? 'badge-warning'
                        : 'badge-info';

                      return (
                        <tr key={log.id} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className={`badge ${badgeClass} text-[10px]`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-white">
                            {log.table_name || 'system'}
                            {log.record_id ? ` #${log.record_id}` : ''}
                          </td>
                          <td className="py-3 px-4 text-muted-light">
                            {log.user_email || 'System'}
                          </td>
                          <td className="py-3 px-4 font-mono text-muted text-[11px]">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="py-3 px-4 text-right text-muted">
                            {formatDateTime(log.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {auditTotal > auditPageSize && (
              <div className="flex items-center justify-between pt-3 border-t border-surface-border text-xs text-muted">
                <span>Total Events: {auditTotal}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchAuditLogs(Math.max(1, auditPage - 1))}
                    disabled={auditPage <= 1}
                    className="btn btn-secondary text-xs py-1 px-2.5 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>Page {auditPage} of {Math.ceil(auditTotal / auditPageSize)}</span>
                  <button
                    onClick={() => fetchAuditLogs(auditPage + 1)}
                    disabled={auditPage >= Math.ceil(auditTotal / auditPageSize)}
                    className="btn btn-secondary text-xs py-1 px-2.5 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
