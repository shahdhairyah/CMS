import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { StudentIcon, FacultyIcon, UsersIcon, LibraryIcon } from '../../utils/icons';
import { adminAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getDashboard();
      if (!res.success) throw new Error(res.message || 'Unable to load dashboard');
      setData(res.data);
    } catch (err) { setError(err.message || 'Unable to load dashboard'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  if (loading) return <LoadingSpinner text="Loading dashboard..." />;
  if (error) return <div role="alert" className="card space-y-4"><p>{error}</p><button className="btn-primary" onClick={load}>Retry</button></div>;
  if (!data) return null;

  return <div className="space-y-8">
    <PageHeader title="Admin Dashboard" subtitle="College administration overview and management." />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard icon={<StudentIcon size={22} />} label="Total Students" value={data.total_students ?? 0} color="primary" />
      <StatCard icon={<FacultyIcon size={22} />} label="Total Faculty" value={data.total_faculty ?? 0} color="info" />
      <StatCard icon={<UsersIcon size={22} />} label="Total Users" value={data.total_users ?? 0} color="success" />
      <StatCard icon={<LibraryIcon size={22} />} label="Active Library Loans" value={data.library_stats?.active_loans ?? 0} color="warning" />
    </div>
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">Quick Actions</h2>
      <div className="flex flex-wrap gap-3">{[
        ['Students', '/admin/students'], ['Faculty', '/admin/faculty'], ['Departments', '/admin/departments'],
        ['Notices', '/admin/notices'], ['Fees', '/admin/fees'], ['Reports', '/admin/reports'], ['Settings & Backups', '/admin/settings']
      ].map(([label, to]) => <Link key={to} to={to} className="btn-secondary">{label}</Link>)}</div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card space-y-4"><h2 className="text-lg font-semibold">Students by Department</h2>
        {(data.students_by_department || []).map(dept => <div key={dept.department_id} className="flex justify-between gap-4 border-b border-surface-border py-3"><span>{dept.department}</span><strong>{dept.count}</strong></div>)}
        {!data.students_by_department?.length && <p className="text-muted">No departments found.</p>}
      </div>
      <div className="card space-y-4"><h2 className="text-lg font-semibold">Recent Payments</h2>
        {(data.recent_payments || []).map(payment => <div key={payment.id} className="border-b border-surface-border py-3"><div className="flex justify-between gap-4"><span>{payment.first_name} {payment.last_name}</span><strong>{formatCurrency(payment.amount)}</strong></div><p className="text-sm text-muted">{payment.fee_type} · {payment.status} · {formatDate(payment.paid_at)}</p></div>)}
        {!data.recent_payments?.length && <p className="text-muted">No payments found.</p>}
      </div>
    </div>
  </div>;
}
