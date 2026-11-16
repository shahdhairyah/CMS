import { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { departmentAPI } from '../../services/api';

const emptyForm = { name: '', code: '', description: '' };

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);

  const load = async () => {
    try {
      const res = await departmentAPI.getAll();
      if (!res.success) throw new Error(res.message || 'Unable to load departments');
      setDepartments(res.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, name: form.name.trim(), code: form.code.trim() };
      if (!payload.name || !payload.code) throw new Error('Name and code are required');
      const res = editing ? await departmentAPI.update(editing, payload) : await departmentAPI.create(payload);
      if (!res.success) throw new Error(res.message || 'Unable to save department');
      setForm(null);
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  const remove = async (department) => {
    if (!window.confirm(`Delete ${department.name}? Departments with linked records may not be deleted.`)) return;
    setSaving(true);
    setError('');
    try {
      const res = await departmentAPI.delete(department.id);
      if (!res.success) throw new Error(res.message || 'Unable to delete department');
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <PageHeader title="Departments" subtitle="Manage college departments" action={<button className="btn-primary" onClick={() => { setEditing(null); setForm({ ...emptyForm }); }}>Add Department</button>} />
    {error && <div role="alert" className="card text-danger">{error}</div>}
    {form && <form onSubmit={save} className="card space-y-4">
      <h2 className="text-lg font-semibold">{editing ? 'Edit Department' : 'New Department'}</h2>
      <label className="block">Name<input required maxLength={100} className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label className="block">Code<input required maxLength={20} className="input-field" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></label>
      <label className="block">Description<textarea className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <div className="flex gap-3"><button disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button><button type="button" disabled={saving} className="btn-secondary" onClick={() => setForm(null)}>Cancel</button></div>
    </form>}
    {loading ? <LoadingSpinner /> : <div className="card overflow-x-auto">
      {departments.length === 0 ? <p>No departments found.</p> : <table className="w-full text-left text-sm">
        <thead><tr><th className="p-3">Code</th><th className="p-3">Name</th><th className="p-3">Head of Department</th><th className="p-3">Actions</th></tr></thead>
        <tbody>{departments.map(dept => <tr key={dept.id} className="border-t border-surface-border">
          <td className="p-3">{dept.code}</td><td className="p-3">{dept.name}</td><td className="p-3">{dept.hod_name || 'Unassigned'}</td>
          <td className="p-3"><div className="flex gap-2"><button disabled={saving} className="btn-secondary" onClick={() => { setEditing(dept.id); setForm({ name: dept.name, code: dept.code, description: dept.description || '' }); }}>Edit</button><button disabled={saving} className="btn-secondary text-danger" onClick={() => remove(dept)}>Delete</button></div></td>
        </tr>)}</tbody>
      </table>}
    </div>}
  </div>;
}
