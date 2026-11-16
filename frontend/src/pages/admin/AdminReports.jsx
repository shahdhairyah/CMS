import { useState, useEffect, useMemo } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  ReportIcon, DownloadIcon, SearchIcon, FilterIcon, RefreshIcon,
  BookOpen, UsersIcon, FeeIcon, AttendanceIcon, ExamIcon,
  FacultyIcon, LibraryIcon, CheckIcon, WarningIcon, DepartmentIcon
} from '../../utils/icons';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { adminAPI, departmentAPI } from '../../services/api';

export default function AdminReports() {
  const [reportType, setReportType] = useState('students');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [deptFilter, setDeptFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report tabs configuration
  const reportTabs = [
    { id: 'students', label: 'Enrollment & Students', icon: UsersIcon, description: 'Student roll list, department distribution, and admission demographics' },
    { id: 'attendance', label: 'Attendance & Defaulters', icon: AttendanceIcon, description: 'Classroom attendance percentages, session counts, and detention alerts' },
    { id: 'fees', label: 'Fee Collections & Dues', icon: FeeIcon, description: 'Invoice breakdown, online collections, payment modes, and pending balances' },
    { id: 'exams', label: 'Exam Performance & CGPA', icon: ExamIcon, description: 'Semester SGPA/CGPA standings, credits earned, and pass/remedial status' },
    { id: 'faculty', label: 'Faculty & Workload', icon: FacultyIcon, description: 'Staffing directory, assigned subjects, weekly timetable hours, and coursework' },
    { id: 'library', label: 'Library Circulation', icon: LibraryIcon, description: 'Book lending ledger, overdue loans, fine assessments, and category usage' },
  ];

  // Fetch initial summary & departments once
  useEffect(() => {
    loadSummary();
    loadDepartments();
  }, []);

  // Fetch report data on tab or filter change
  useEffect(() => {
    loadReportData();
  }, [reportType, deptFilter, semesterFilter, statusFilter, startDate, endDate]);

  const loadSummary = async () => {
    try {
      const res = await adminAPI.getReportSummary();
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      // silent
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentAPI.getAll();
      if (res.success) {
        setDepartments(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      // silent
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        type: reportType,
        department_id: deptFilter !== 'all' ? deptFilter : undefined,
        semester: semesterFilter !== 'all' ? semesterFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      const res = await adminAPI.getReports(params);
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : []);
      } else {
        setError(res.message || 'Failed to generate report');
        setData([]);
      }
    } catch (err) {
      setError(err?.message || 'Error occurred while loading report data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    loadReportData();
  };

  const handleResetFilters = () => {
    setDeptFilter('all');
    setSemesterFilter('all');
    setStatusFilter('all');
    setSearch('');
    setStartDate('');
    setEndDate('');
  };

  // Filter in-memory for instant search if typing
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val || '').toLowerCase().includes(q)
      )
    );
  }, [data, search]);

  // Export to CSV
  const exportCSV = () => {
    if (!filteredData.length) return;
    const headers = Object.keys(filteredData[0]);
    const csvRows = [
      headers.map((h) => `"${h.replace(/_/g, ' ').toUpperCase()}"`).join(','),
      ...filteredData.map((row) =>
        headers
          .map((h) => {
            const val = row[h] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ADIT_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  // Contextual Status filter options
  const statusOptions = useMemo(() => {
    switch (reportType) {
      case 'students':
        return [
          { value: 'all', label: 'All Statuses' },
          { value: 'active', label: 'Active Students' },
          { value: 'inactive', label: 'Inactive / Suspended' },
        ];
      case 'attendance':
        return [
          { value: 'all', label: 'All Attendance' },
          { value: 'eligible', label: 'Eligible (≥ 75%)' },
          { value: 'defaulter', label: 'Defaulters (< 75%)' },
        ];
      case 'fees':
        return [
          { value: 'all', label: 'All Payments' },
          { value: 'completed', label: 'Completed' },
          { value: 'pending', label: 'Pending Dues' },
          { value: 'failed', label: 'Failed' },
        ];
      case 'exams':
        return [
          { value: 'all', label: 'All Results' },
          { value: 'pass', label: 'Passed' },
          { value: 'fail', label: 'Remedial / Failed' },
        ];
      case 'library':
        return [
          { value: 'all', label: 'All Loans' },
          { value: 'issued', label: 'Currently Issued' },
          { value: 'overdue', label: 'Overdue Fines' },
          { value: 'returned', label: 'Returned Copies' },
        ];
      default:
        return [{ value: 'all', label: 'All Statuses' }];
    }
  }, [reportType]);

  const activeTabMeta = reportTabs.find((t) => t.id === reportType) || reportTabs[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <PageHeader
        title="Institutional Analytics & Reports"
        subtitle="Comprehensive administrative intelligence across enrollments, academic progress, fee collections, faculty teaching, and circulation audits."
        action={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                loadSummary();
                loadReportData();
              }}
              disabled={loading}
              className="btn btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3"
              title="Refresh report data"
            >
              <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!filteredData.length}
              className="btn btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3"
              title="Print formatted document"
            >
              <span>Print View</span>
            </button>
            <button
              onClick={exportCSV}
              disabled={!filteredData.length}
              className="btn btn-primary inline-flex items-center gap-2 text-xs py-2 px-4 shadow-glow-sm"
              title="Download as CSV spreadsheet"
            >
              <DownloadIcon size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="card p-4 border border-surface-border bg-surface-raised flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Enrollment</span>
            <UsersIcon size={16} className="text-accent" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-white">{summary ? summary.total_students : '--'}</div>
            <div className="text-[11px] text-muted mt-0.5">{summary ? `${summary.total_departments} Departments` : 'Loading...'}</div>
          </div>
        </div>

        <div className="card p-4 border border-surface-border bg-surface-raised flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Campus Attendance</span>
            <AttendanceIcon size={16} className="text-info" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-white">{summary ? `${summary.average_attendance}%` : '--'}</div>
            <div className="text-[11px] text-danger mt-0.5 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
              <span>{summary ? `${summary.defaulters_count} Defaulters (<75%)` : ''}</span>
            </div>
          </div>
        </div>

        <div className="card p-4 border border-surface-border bg-surface-raised flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Fees Collected</span>
            <FeeIcon size={16} className="text-success" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-white truncate" title={summary ? formatCurrency(summary.fee_collected) : ''}>
              {summary ? formatCurrency(summary.fee_collected) : '--'}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {summary ? `${summary.successful_transactions} Paid • ${summary.pending_transactions} Pending` : ''}
            </div>
          </div>
        </div>

        <div className="card p-4 border border-surface-border bg-surface-raised flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Exam Pass Rate</span>
            <ExamIcon size={16} className="text-accent-light" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-white">{summary ? `${summary.exam_pass_rate}%` : '--'}</div>
            <div className="text-[11px] text-muted mt-0.5">{summary ? `Avg CGPA: ${summary.avg_cgpa} / 10.0` : ''}</div>
          </div>
        </div>

        <div className="card p-4 border border-surface-border bg-surface-raised flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Faculty & Library</span>
            <FacultyIcon size={16} className="text-warning" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-white">{summary ? `${summary.total_faculty} Faculty` : '--'}</div>
            <div className="text-[11px] text-muted mt-0.5">{summary ? `${summary.books_issued} Active Book Loans` : ''}</div>
          </div>
        </div>
      </div>

      {/* Report Module Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-surface-border">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setReportType(tab.id);
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-accent text-white shadow-glow-sm'
                  : 'text-muted hover:text-muted-light hover:bg-surface-hover'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 space-y-3.5 bg-surface-raised border border-surface-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FilterIcon size={15} className="text-accent" />
              <span>Filter Report Parameters</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">{activeTabMeta.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="text-xs text-muted hover:text-white px-2.5 py-1.5 rounded-md hover:bg-surface-hover transition-colors"
            >
              Reset Filters
            </button>
            <span className="badge badge-primary text-[10px] font-semibold">
              {filteredData.length} records matching
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
          {/* Department Filter */}
          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="input-field text-xs py-2 w-full"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter (Only for student/attendance/fees/exams) */}
          {['students', 'attendance', 'fees', 'exams'].includes(reportType) && (
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Semester</label>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="input-field text-xs py-2 w-full"
              >
                <option value="all">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-xs py-2 w-full"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range (For attendance & fees) */}
          {['attendance', 'fees'].includes(reportType) && (
            <>
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field text-xs py-2 w-full"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field text-xs py-2 w-full"
                />
              </div>
            </>
          )}

          {/* Search Field */}
          <div className={['attendance', 'fees'].includes(reportType) ? 'sm:col-span-2 md:col-span-4 lg:col-span-5' : 'sm:col-span-2'}>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Search Keywords</label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, roll number, email, or transaction ID..."
                className="input-field text-xs py-2 pl-8 pr-16 w-full"
              />
              <SearchIcon size={14} className="absolute left-2.5 top-2.5 text-muted-dark" />
              <button
                type="submit"
                className="absolute right-1.5 top-1 px-2.5 py-1 bg-surface-border text-muted-light rounded text-[10px] font-semibold hover:bg-surface-hover"
              >
                Filter
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger p-4 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <WarningIcon size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-muted hover:text-white">&times;</button>
        </div>
      )}

      {/* Main Report Data Table */}
      <div className="card p-0 overflow-hidden border border-surface-border bg-surface-raised">
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{activeTabMeta.label} Ledger</span>
            <span className="text-xs text-muted">({filteredData.length} records)</span>
          </div>
          <span className="text-xs text-muted-dark">Report generated live from MySQL database</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" text={`Compiling ${activeTabMeta.label} report...`} />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center">
            <EmptyState
              title="No records found"
              description="No data matched the selected department, semester, or search criteria. Try relaxing your filters."
              icon={ReportIcon}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* STUDENTS TABLE */}
            {reportType === 'students' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-overlay text-muted uppercase tracking-wider font-semibold border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-muted-light">
                  {filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-white">{row.roll_number}</td>
                      <td className="py-3 px-4 font-semibold text-white">{row.student_name}</td>
                      <td className="py-3 px-4">
                        <span className="badge badge-primary text-[10px]">{row.department_code || row.department_name}</span>
                      </td>
                      <td className="py-3 px-4">Semester {row.semester}</td>
                      <td className="py-3 px-4 font-mono text-muted">{row.batch || '-'}</td>
                      <td className="py-3 px-4 text-muted truncate max-w-[180px]">{row.email}</td>
                      <td className="py-3 px-4 text-muted">{row.phone || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-danger'} text-[10px]`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ATTENDANCE TABLE */}
            {reportType === 'attendance' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-overlay text-muted uppercase tracking-wider font-semibold border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Total Sessions</th>
                    <th className="py-3 px-4">Attended</th>
                    <th className="py-3 px-4">Attendance %</th>
                    <th className="py-3 px-4 text-right">Eligibility Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-muted-light">
                  {filteredData.map((row) => {
                    const pct = parseFloat(row.attendance_percentage || 0);
                    const isDefaulter = pct < 75;
                    return (
                      <tr key={row.student_id} className={`hover:bg-surface-hover/50 transition-colors ${isDefaulter ? 'bg-danger/5' : ''}`}>
                        <td className="py-3 px-4 font-mono font-medium text-white">{row.roll_number}</td>
                        <td className="py-3 px-4 font-semibold text-white">{row.student_name}</td>
                        <td className="py-3 px-4">{row.department_name}</td>
                        <td className="py-3 px-4">Sem {row.semester}</td>
                        <td className="py-3 px-4 font-mono">{row.total_sessions} lectures</td>
                        <td className="py-3 px-4 font-mono text-white font-medium">{row.attended_sessions}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold ${isDefaulter ? 'text-danger' : 'text-success'}`}>
                              {row.attendance_percentage}%
                            </span>
                            <div className="w-16 bg-surface-overlay h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${isDefaulter ? 'bg-danger' : 'bg-success'}`}
                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`badge ${isDefaulter ? 'badge-danger' : 'badge-success'} text-[10px]`}>
                            {row.eligibility_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* FEES TABLE */}
            {reportType === 'fees' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-overlay text-muted uppercase tracking-wider font-semibold border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Fee Head</th>
                    <th className="py-3 px-4">Total Fee</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Balance Due</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-muted-light">
                  {filteredData.map((row) => (
                    <tr key={row.payment_id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-white">{row.roll_number}</td>
                      <td className="py-3 px-4 font-semibold text-white">{row.student_name}</td>
                      <td className="py-3 px-4">{row.department_name}</td>
                      <td className="py-3 px-4">{row.fee_type} (Sem {row.semester})</td>
                      <td className="py-3 px-4 font-mono">{formatCurrency(row.total_fee)}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-success">{formatCurrency(row.paid_amount)}</td>
                      <td className="py-3 px-4 font-mono font-medium text-danger">
                        {parseFloat(row.balance_amount) > 0 ? formatCurrency(row.balance_amount) : '₹0'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted truncate max-w-[140px]" title={row.transaction_ref}>
                        {row.transaction_ref}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`badge ${
                          row.status === 'completed' ? 'badge-success' : row.status === 'pending' ? 'badge-warning' : 'badge-danger'
                        } text-[10px]`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* EXAMS TABLE */}
            {reportType === 'exams' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-overlay text-muted uppercase tracking-wider font-semibold border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Credits</th>
                    <th className="py-3 px-4">SGPA</th>
                    <th className="py-3 px-4">Cumulative CGPA</th>
                    <th className="py-3 px-4 text-right">Result Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-muted-light">
                  {filteredData.map((row) => (
                    <tr key={row.result_id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-white">{row.roll_number}</td>
                      <td className="py-3 px-4 font-semibold text-white">{row.student_name}</td>
                      <td className="py-3 px-4">{row.department_name}</td>
                      <td className="py-3 px-4">Semester {row.semester}</td>
                      <td className="py-3 px-4 font-mono">{row.total_credits}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-white">{row.sgpa}</td>
                      <td className="py-3 px-4 font-mono font-bold text-accent-light text-sm">{row.cgpa}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`badge ${row.status === 'pass' ? 'badge-success' : 'badge-danger'} text-[10px]`}>
                          {row.status === 'pass' ? 'PASSED' : 'REMEDIAL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* FACULTY TABLE */}
            {reportType === 'faculty' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-overlay text-muted uppercase tracking-wider font-semibold border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Faculty ID</th>
                    <th className="py-3 px-4">Faculty Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Qualification</th>
                    <th className="py-3 px-4">Subjects Handled</th>
                    <th className="py-3 px-4">Weekly Slots</th>
                    <th className="py-3 px-4 text-right">Assignments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-muted-light">
                  {filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-white">{row.employee_id}</td>
                      <td className="py-3 px-4 font-semibold text-white">{row.faculty_name}</td>
                      <td className="py-3 px-4">{row.department_name}</td>
                      <td className="py-3 px-4 text-muted-light">{row.designation}</td>
                      <td className="py-3 px-4 text-muted">{row.qualification} ({row.experience_years} yrs exp)</td>
                      <td className="py-3 px-4 font-mono font-semibold text-accent-light">{row.subjects_assigned} subjects</td>
                      <td className="py-3 px-4 font-mono">{row.weekly_timetable_slots} hours/wk</td>
                      <td className="py-3 px-4 text-right font-mono">{row.assignments_created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* LIBRARY TABLE */}
            {reportType === 'library' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-overlay text-muted uppercase tracking-wider font-semibold border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">ISBN</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Borrower Roll No</th>
                    <th className="py-3 px-4">Borrower Name</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Fine</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-muted-light">
                  {filteredData.map((row) => (
                    <tr key={row.issue_id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white max-w-[200px] truncate" title={row.book_title}>
                        {row.book_title}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted">{row.isbn}</td>
                      <td className="py-3 px-4">{row.category}</td>
                      <td className="py-3 px-4 font-mono font-medium text-white">{row.roll_number}</td>
                      <td className="py-3 px-4 text-muted-light">{row.student_name}</td>
                      <td className="py-3 px-4 text-muted">{formatDate(row.issue_date)}</td>
                      <td className="py-3 px-4 text-muted">{formatDate(row.due_date)}</td>
                      <td className="py-3 px-4 font-mono text-danger font-medium">
                        {parseFloat(row.fine_amount) > 0 ? formatCurrency(row.fine_amount) : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`badge ${
                          row.status === 'issued' ? 'badge-primary' : row.status === 'overdue' ? 'badge-danger' : 'badge-success'
                        } text-[10px]`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

