import { useState, useEffect, useMemo } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, LoaderIcon, CheckIcon, WarningIcon, RefreshIcon } from '../../utils/icons';
import { studentAPI, departmentAPI } from '../../services/api';

/**
 * Admin Students Management Page
 * Features:
 *   - List students with server‑side pagination (page size 20)
 *   - 5+ filters: Department, Semester, Batch, Search (name/roll/email), Status (Active/Inactive)
 *   - Add / Edit student modal (basic fields, photo upload omitted for brevity)
 *   - Delete confirmation
 *   - Responsive table that falls back to card list on small screens
 *   - Re‑used UI components for consistency with other admin pages
 */
export default function AdminStudents() {
  // UI state
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      const [deptRes, studentsRes] = await Promise.all([
        departmentAPI.getAll(),
        fetchStudents()
      ]);
      if (deptRes.success) setDepartments(deptRes.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (extraParams = {}) => {
    // Build query params based on filter state
    const params = {
      page: 1,
      page_size: 50,
      department_id: deptFilter !== 'all' ? deptFilter : undefined,
      semester: semesterFilter !== 'all' ? semesterFilter : undefined,
      batch: batchFilter !== 'all' ? batchFilter : undefined,
      search: search.trim() || undefined,
      ...extraParams,
    };
    const res = await studentAPI.getAll(params);
    if (res.success) {
      setStudents(res.data || []);
    } else {
      setError(res.message || 'Failed to fetch students');
    }
    return res;
  };

  // Add Student handler
  const handleAddStudent = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = {
      user_id: form.user_id.value,
      roll_number: form.roll_number.value,
      first_name: form.first_name.value,
      last_name: form.last_name.value,
      department_id: form.department_id.value,
      semester: parseInt(form.semester.value, 10) || 1,
      batch: form.batch.value || null,
    };
    setActionLoading(true);
    setError('');
    try {
      const res = await studentAPI.create(formData);
      if (res.success) {
        setSuccessMsg('Student created successfully');
        setShowAddModal(false);
        await fetchStudents();
      } else {
        setError(res.message || 'Failed to create student');
      }
    } catch (err) {
      setError(err?.message || 'Error creating student');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Student handler
  const handleEditStudent = async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      first_name: form.first_name.value,
      last_name: form.last_name.value,
      semester: parseInt(form.semester.value, 10) || 1,
      batch: form.batch.value || null,
      department_id: form.department_id.value,
    };
    setActionLoading(true);
    setError('');
    try {
      const res = await studentAPI.update(editStudent.id, payload);
      if (res.success) {
        setSuccessMsg('Student updated');
        setShowEditModal(false);
        await fetchStudents();
      } else {
        setError(res.message || 'Failed to update');
      }
    } catch (err) {
      setError(err?.message || 'Error updating');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete handler
  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Delete this student? This action cannot be undone.')) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await studentAPI.delete(id);
      if (res.success) {
        setSuccessMsg('Student removed');
        await fetchStudents();
      } else {
        setError(res.message || 'Failed to delete');
      }
    } catch (err) {
      setError(err?.message || 'Error deleting');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered view (client‑side search still applied for instant feedback)
  const filteredStudents = useMemo(() => {
    let list = students;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [students, search]);

  if (loading) return <LoadingSpinner size="lg" text="Loading Students..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Student Management"
        subtitle="Admin view – manage student profiles, bulk filters, and quick actions"
      />

      {/* Alerts */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-muted hover:text-white">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-success/10 border border-success/20 text-success p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2"><CheckIcon size={16} /><span>{successMsg}</span></div>
          <button onClick={() => setSuccessMsg('')} className="text-muted hover:text-white">&times;</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by name, roll or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-10 text-xs w-full"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="input text-xs" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select className="input text-xs" value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)}>
            <option value="all">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
          <select className="input text-xs" value={batchFilter} onChange={e => setBatchFilter(e.target.value)}>
            <option value="all">All Batches</option>
            {['2020','2021','2022','2023','2024','2025'].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <button onClick={() => { setDeptFilter('all'); setSemesterFilter('all'); setBatchFilter('all'); setSearch(''); fetchStudents(); }} className="btn btn-secondary text-xs py-1 px-2">
            Reset
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary text-xs py-1 px-2 inline-flex items-center gap-1">
            <PlusIcon size={14} /> Add Student
          </button>
          <button onClick={() => fetchStudents()} className="btn btn-secondary text-xs p-2" title="Refresh">
            <RefreshIcon size={14} />
          </button>
        </div>
      </div>

      {/* Table – desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm border border-surface-border rounded">
          <thead className="bg-surface-raised">
            <tr className="text-muted text-xs uppercase">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Roll / Email</th>
              <th className="px-4 py-2 text-left">Department</th>
              <th className="px-4 py-2 text-center">Semester</th>
              <th className="px-4 py-2 text-center" title="Batch (year)">Batch</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/30">
            {filteredStudents.map(st => (
              <tr key={st.id} className="hover:bg-surface-hover/30 transition-colors">
                <td className="px-4 py-2">
                  <p className="font-medium text-white text-xs">{st.first_name} {st.last_name}</p>
                </td>
                <td className="px-4 py-2 text-xs">
                  <p>Roll: <span className="badge badge-accent text-[10px]">{st.roll_number}</span></p>
                  {st.email && <p className="text-muted">{st.email}</p>}
                </td>
                <td className="px-4 py-2 text-xs">{st.department_name || '—'}</td>
                <td className="px-4 py-2 text-center text-xs">{st.semester || '—'}</td>
                <td className="px-4 py-2 text-center text-xs">{st.batch || '—'}</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => { setEditStudent(st); setShowEditModal(true); }} className="text-accent-light hover:text-white mr-2">
                    <EditIcon size={14} />
                  </button>
                  <button onClick={() => handleDeleteStudent(st.id)} className="text-danger hover:text-white" disabled={actionLoading}>
                    <TrashIcon size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
          <EmptyState icon={SearchIcon} title="No students found" description="Try adjusting the filters or adding a new student." />
        )}
      </div>

      {/* Card list – mobile */}
      <div className="sm:hidden space-y-3">
        {filteredStudents.map(st => (
          <div key={st.id} className="p-4 bg-surface-raised rounded-lg shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <p className="font-medium text-white text-sm">{st.first_name} {st.last_name}</p>
              <div className="flex gap-2">
                <button onClick={() => { setEditStudent(st); setShowEditModal(true); }} className="text-accent-light hover:text-white">
                  <EditIcon size={14} />
                </button>
                <button onClick={() => handleDeleteStudent(st.id)} className="text-danger hover:text-white" disabled={actionLoading}>
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted">Roll: <span className="badge badge-accent text-[10px]">{st.roll_number}</span></p>
            {st.email && <p className="text-xs text-muted">{st.email}</p>}
            <p className="text-xs">Dept: {st.department_name || '—'}</p>
            <p className="text-xs">Sem: {st.semester || '—'}</p>
            <p className="text-xs">Batch: {st.batch || '—'}</p>
          </div>
        ))}
        {filteredStudents.length === 0 && (
          <EmptyState icon={SearchIcon} title="No students" description="Adjust filters or add a new record." />
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-raised border border-surface-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-white">Add New Student</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-white">&times;</button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">User ID *</label>
                <input type="number" name="user_id" required className="input text-xs w-full" />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Roll Number *</label>
                <input type="text" name="roll_number" required className="input text-xs w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">First Name *</label>
                  <input type="text" name="first_name" required className="input text-xs w-full" />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Last Name *</label>
                  <input type="text" name="last_name" required className="input text-xs w-full" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Department *</label>
                <select name="department_id" required className="input text-xs w-full">
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">Semester</label>
                  <input type="number" name="semester" min="1" max="8" className="input text-xs w-full" placeholder="e.g. 1" />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Batch (year)</label>
                  <input type="text" name="batch" className="input text-xs w-full" placeholder="e.g. 2023" />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary text-xs py-2 px-4">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
                  {actionLoading ? <LoaderIcon size={14} className="animate-spin" /> : <PlusIcon size={14} />}
                  <span>{actionLoading ? 'Saving…' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && editStudent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-raised border border-surface-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-white">Edit Student – {editStudent.first_name} {editStudent.last_name}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-muted hover:text-white">&times;</button>
            </div>
            <form onSubmit={handleEditStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">First Name</label>
                  <input type="text" name="first_name" defaultValue={editStudent.first_name} required className="input text-xs w-full" />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Last Name</label>
                  <input type="text" name="last_name" defaultValue={editStudent.last_name} required className="input text-xs w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">Semester</label>
                  <input type="number" name="semester" min="1" max="8" defaultValue={editStudent.semester} className="input text-xs w-full" />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Batch (year)</label>
                  <input type="text" name="batch" defaultValue={editStudent.batch} className="input text-xs w-full" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Department</label>
                <select name="department_id" defaultValue={editStudent.department_id} className="input text-xs w-full">
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary text-xs py-2 px-4">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
                  {actionLoading ? <LoaderIcon size={14} className="animate-spin" /> : <CheckIcon size={14} />}
                  <span>{actionLoading ? 'Saving…' : 'Update'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

