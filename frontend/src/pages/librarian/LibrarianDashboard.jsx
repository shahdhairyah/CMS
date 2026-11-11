import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  BookOpen, LibraryIcon, WarningIcon, FeeIcon, RefreshIcon,
  CheckIcon, CalendarIcon, UsersIcon, ArrowRight, ClockIcon,
  ShieldIcon, PlusIcon, SearchIcon
} from '../../utils/icons';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { libraryAPI } from '../../services/api';

export default function LibrarianDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [overdueIssues, setOverdueIssues] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsRes, issuesRes] = await Promise.allSettled([
        libraryAPI.getStatistics(),
        libraryAPI.getAllIssues({ page_size: 20 }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
        setStats(statsRes.value.data);
      }
      if (issuesRes.status === 'fulfilled' && issuesRes.value?.success) {
        const data = issuesRes.value.data;
        const list = Array.isArray(data) ? data : (data.issues || []);
        setRecentIssues(list.slice(0, 7));
        setOverdueIssues(
          list.filter((i) => i.status === 'issued' && Number(i.days_overdue) > 0).slice(0, 5)
        );
      }
    } catch (err) {
      setError(err?.message || 'Failed to load librarian dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading Central Library Hub..." />;

  const librarianName = user?.profile?.first_name
    ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
    : 'Librarian';

  const totalInv = Number(stats?.total_inventory || 0);
  const activeLoans = Number(stats?.active_loans || 0);
  const availBooks = Number(stats?.available_books || 0);
  const overdueCount = Number(stats?.overdue_loans || 0);
  const circulationRate = totalInv > 0 ? Math.round((activeLoans / totalInv) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent/25 via-surface-raised to-surface border border-accent/20 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge badge-accent text-[11px] font-semibold px-2.5 py-0.5 inline-flex items-center gap-1.5 shadow-sm">
                <LibraryIcon size={12} /> CVM University Library System
              </span>
              <span className="badge badge-success text-[10px] px-2 py-0.5">Desk Online</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {librarianName}
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
              Track live circulation, process checkout and returns by student Name, Email, or Roll Number, and collect overdue fines seamlessly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/librarian/library"
              className="btn btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 shadow-lg hover:shadow-accent/20 transition-all font-semibold"
            >
              <LibraryIcon size={15} />
              <span>Open Circulation Desk</span>
            </Link>
            <button
              onClick={loadDashboard}
              className="btn btn-secondary text-xs p-2.5 hover:text-white"
              title="Refresh Analytics"
            >
              <RefreshIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadDashboard} className="text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Titles */}
        <div className="card p-5 relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">Catalogue Titles</p>
              <h3 className="text-2xl font-bold text-white mt-1.5">{stats?.total_titles || 0}</h3>
              <p className="text-[11px] text-muted mt-1">{totalInv} Total Volumes</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-light group-hover:scale-105 transition-transform">
              <BookOpen size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border/50 flex items-center justify-between text-[11px] text-muted">
            <span>Shelf Stock</span>
            <span className="text-success font-semibold">{availBooks} copies free</span>
          </div>
        </div>

        {/* Active Circulations */}
        <div className="card p-5 relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">Active Book Loans</p>
              <h3 className="text-2xl font-bold text-white mt-1.5">{activeLoans}</h3>
              <p className="text-[11px] text-muted mt-1">{circulationRate}% circulation rate</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <UsersIcon size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border/50 flex items-center justify-between text-[11px] text-muted">
            <span>In Student Hands</span>
            <span className="text-white font-medium">{activeLoans} books checked out</span>
          </div>
        </div>

        {/* Overdue Loans */}
        <div className="card p-5 relative overflow-hidden group hover:border-danger/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">Overdue Returns</p>
              <h3 className={`text-2xl font-bold mt-1.5 ${overdueCount > 0 ? 'text-danger' : 'text-success'}`}>
                {overdueCount}
              </h3>
              <p className="text-[11px] text-muted mt-1">Requires student recall</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
              overdueCount > 0 ? 'bg-danger/10 border border-danger/20 text-danger' : 'bg-success/10 border border-success/20 text-success'
            }`}>
              <WarningIcon size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border/50 flex items-center justify-between text-[11px] text-muted">
            <span>Return compliance</span>
            <span className={overdueCount > 0 ? 'text-danger font-semibold' : 'text-success font-semibold'}>
              {overdueCount > 0 ? `${overdueCount} late notices` : '100% On Time'}
            </span>
          </div>
        </div>

        {/* Fine Balances */}
        <div className="card p-5 relative overflow-hidden group hover:border-warning/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">Uncollected Fines</p>
              <h3 className="text-2xl font-bold text-warning font-mono mt-1.5">
                {formatCurrency(stats?.pending_fines || 0)}
              </h3>
              <p className="text-[11px] text-muted mt-1">₹5.00 daily accrual rate</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning group-hover:scale-105 transition-transform">
              <FeeIcon size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border/50 flex items-center justify-between text-[11px] text-muted">
            <span>Total Collected</span>
            <span className="text-success font-mono font-medium">{formatCurrency(stats?.collected_fines || 0)}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Activity & Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Circulation Ledger */}
        <div className="card lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Live Circulation Ledger</h2>
              <p className="text-xs text-muted mt-0.5">Recent checkouts, borrower credentials, and return dates</p>
            </div>
            <Link
              to="/librarian/library"
              className="text-xs text-accent-light hover:text-white font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>View Complete Ledger</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {recentIssues.length === 0 ? (
            <div className="text-center py-12 text-muted text-xs">
              No recent library transactions recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                    <th className="text-left py-2.5 pr-3">Borrower Student</th>
                    <th className="text-left py-2.5 pr-3">Book Title</th>
                    <th className="text-left py-2.5 pr-3">Due Date</th>
                    <th className="text-center py-2.5">Loan Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {recentIssues.map((loan) => {
                    const isLate = loan.status === 'issued' && Number(loan.days_overdue) > 0;
                    return (
                      <tr key={loan.id} className="hover:bg-surface-hover/30 transition-colors">
                        <td className="py-3 pr-3">
                          <p className="text-white text-xs font-semibold">
                            {loan.first_name} {loan.last_name}
                          </p>
                          <span className="badge badge-accent text-[10px] font-mono mt-0.5">
                            {loan.roll_number}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <p className="text-white text-xs max-w-[220px] truncate font-medium">{loan.book_title}</p>
                          <span className="text-[11px] text-muted truncate block">{loan.book_author}</span>
                        </td>
                        <td className="py-3 pr-3 text-xs">
                          <span className={isLate ? 'text-danger font-semibold' : 'text-muted-light'}>
                            {formatDate(loan.due_date)}
                          </span>
                          {isLate && (
                            <span className="block text-[10px] text-danger font-mono">
                              +{loan.days_overdue}d overdue
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {isLate ? (
                            <span className="badge badge-danger text-[10px] inline-flex items-center gap-1">
                              <WarningIcon size={10} /> Overdue
                            </span>
                          ) : loan.status === 'issued' ? (
                            <span className="badge badge-success text-[10px] inline-flex items-center gap-1">
                              <CheckIcon size={10} /> Active
                            </span>
                          ) : loan.status === 'fine_paid' ? (
                            <span className="badge badge-accent text-[10px]">Fine Paid</span>
                          ) : (
                            <span className="badge badge-muted text-[10px]">Returned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Desk Shortcuts & Priority Actions */}
        <div className="space-y-6">
          {/* Quick Desk Controls */}
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-white">Desk Operations</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/librarian/library"
                className="p-3.5 rounded-xl bg-surface-raised border border-surface-border hover:border-accent/40 text-center transition-all group flex flex-col items-center justify-center hover:bg-surface-hover/30"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent-light group-hover:scale-110 transition-transform mb-2">
                  <LibraryIcon size={20} />
                </div>
                <span className="text-xs font-semibold text-white">Issue / Return</span>
                <span className="text-[10px] text-muted mt-0.5">Circulation</span>
              </Link>

              <Link
                to="/librarian/library"
                className="p-3.5 rounded-xl bg-surface-raised border border-surface-border hover:border-accent/40 text-center transition-all group flex flex-col items-center justify-center hover:bg-surface-hover/30"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-2">
                  <BookOpen size={20} />
                </div>
                <span className="text-xs font-semibold text-white">Catalog</span>
                <span className="text-[10px] text-muted mt-0.5">Manage Titles</span>
              </Link>
            </div>
          </div>

          {/* Urgent Overdue Recall List */}
          <div className="card border-warning/30 bg-warning/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                <h2 className="text-sm font-semibold text-white">Overdue Recall List</h2>
              </div>
              <span className="badge badge-warning text-[10px]">
                {overdueIssues.length} Pending
              </span>
            </div>

            {overdueIssues.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">
                All currently active book loans are within return date.
              </p>
            ) : (
              <div className="space-y-2">
                {overdueIssues.map((due) => (
                  <div
                    key={due.id}
                    className="p-3 rounded-xl bg-surface-raised border border-surface-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{due.book_title}</p>
                      <p className="text-[11px] text-muted mt-0.5">
                        {due.first_name} {due.last_name} · <span className="text-accent-light font-mono">{due.roll_number}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-danger font-mono font-bold text-xs block">
                        +{due.days_overdue}d
                      </span>
                      <span className="text-[10px] text-warning font-mono">
                        {formatCurrency(due.effective_fine || due.days_overdue * 5)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
