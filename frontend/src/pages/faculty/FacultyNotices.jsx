import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { NoticeIcon, PlusIcon, CalendarIcon, XIcon } from '../../utils/icons';
import { formatDate } from '../../utils/helpers';
import { noticeAPI } from '../../services/api';

export default function FacultyNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'college', target_audience: 'student' });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await noticeAPI.getAll();
      if (res.success) {
        setNotices(res.data || []);
      } else {
        setError(res.message || 'Failed to load notices');
      }
    } catch (err) {
      setError(err.message || 'Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    try {
      setCreating(true);
      setError('');
      const res = await noticeAPI.create({
        ...form,
        author_id: user?.profile?.id,
        author_name: `${user?.profile?.first_name || ''} ${user?.profile?.last_name || ''}`.trim(),
      });
      if (res.success) {
        setShowCreate(false);
        setForm({ title: '', content: '', type: 'college', target_audience: 'student' });
        fetchNotices();
      } else {
        setError(res.message || 'Failed to create notice');
      }
    } catch (err) {
      setError(err.message || 'Failed to create notice');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return;
    try {
      setError('');
      const res = await noticeAPI.delete(id);
      if (res.success) {
        fetchNotices();
      } else {
        setError(res.message || 'Failed to delete');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading notices..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notices"
        subtitle="Create and manage announcements"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <PlusIcon size={16} />
            Create Notice
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {showCreate && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-5">New Notice</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input required maxLength={255} type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Notice title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                  <option value="college">College</option>
                  <option value="department">Department</option>
                  <option value="exam">Exam</option>
                  <option value="event">Event</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="label">Target Audience</label>
                <select value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} className="input-field">
                  {user?.role === 'admin' && <option value="all">Everyone</option>}
                  <option value="student">Students</option>
                  <option value="faculty">Faculty</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Content</label>
              <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} className="input-field resize-none" placeholder="Write notice content..." />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowCreate(false); setError(''); }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Publishing...' : 'Publish Notice'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">Notice Board</h3>

        {notices.length === 0 ? (
          <EmptyState title="No Notices" description="No notices are available." />
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <NoticeIcon size={16} className="text-accent-light flex-shrink-0" />
                    <p className="font-medium text-sm text-muted-light">{notice.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      notice.type === 'college'
                        ? 'bg-accent/10 text-accent-light'
                        : notice.type === 'department'
                        ? 'bg-info/10 text-info'
                        : 'bg-surface-hover text-muted'
                    }`}>
                      {notice.type}
                    </span>
                    {user?.role === 'admin' && <button
                      aria-label="Delete notice"
                      onClick={() => handleDelete(notice.id)}
                      className="p-1 text-muted-dark hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <XIcon size={14} />
                    </button>}
                  </div>
                </div>
                <p className="text-xs text-muted line-clamp-2">{notice.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-dark">
                  <span className="flex items-center gap-1">
                    <CalendarIcon size={12} />
                    {formatDate(notice.published_at || notice.created_at)}
                  </span>
                  {notice.target_audience && <span>Target: {notice.target_audience}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
