import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { AssignmentIcon, EyeIcon, DownloadIcon, UploadIcon, PlusIcon, XIcon, ClockIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { assignmentAPI } from '../../services/api';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await assignmentAPI.getAll().catch(() => ({ success: true, data: [] }));
      if (res && res.success !== false) {
        setAssignments(res.data || res || []);
      } else {
        setAssignments([]);
      }
    } catch (err) {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !selected) return;
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await assignmentAPI.submit(selected.id, formData);
      if (res.success) {
        setSelected(null);
        setFile(null);
        fetchAssignments();
      } else {
        setError(res.message || 'Submission failed');
      }
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading assignments..." />;

  return (
    <div className="space-y-8">
      <PageHeader title="Assignments" subtitle="View and submit your assignments" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="card">
        {assignments.length === 0 ? (
          <EmptyState
            icon={<AssignmentIcon size={28} />}
            title="No Assignments"
            description="No assignments have been posted yet."
          />
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const submission = assignment.submission;
              const status = submission?.status || 'pending';
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AssignmentIcon size={16} className="text-accent-light flex-shrink-0" />
                      <p className="font-medium text-sm text-muted-light truncate">{assignment.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{assignment.subject_name || assignment.subject}</span>
                      <span className="text-muted-dark">Deadline: {formatDate(assignment.deadline)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {submission?.marks !== null && submission?.marks !== undefined && (
                      <span className="text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded">
                        {submission.marks}/{assignment.max_marks || 100}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {submission?.marks !== null ? 'Evaluated' : 'Pending'}
                    </span>
                    <button
                      onClick={() => setSelected(assignment)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent-light rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors"
                    >
                      <EyeIcon size={14} />
                      View
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setSelected(null); setFile(null); }}>
          <div className="bg-surface-raised rounded-xl border border-surface-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selected.title}</h3>
                    <p className="text-xs text-muted mt-1">{selected.subject_name || selected.subject}</p>
                  </div>
                  <button onClick={() => { setSelected(null); setFile(null); }} className="text-muted-dark hover:text-muted-light transition-colors">
                    <XIcon size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-surface-overlay rounded-xl mb-4 text-sm">
                  <div><span className="text-muted">Max Marks</span><p className="text-white font-medium">{selected.max_marks || 100}</p></div>
                  <div><span className="text-muted">Deadline</span><p className={`font-medium ${new Date(selected.deadline) < new Date() ? 'text-danger' : 'text-warning'}`}>{formatDate(selected.deadline)}</p></div>
                </div>

                {selected.description && (
                  <p className="text-sm text-muted-light mb-4 leading-relaxed">{selected.description}</p>
                )}

                {selected.file_url && (
                  <a href={selected.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-accent-light hover:text-accent mb-4">
                    <DownloadIcon size={16} />
                    Download Attachment
                  </a>
                )}

                {selected.submission && selected.submission.marks !== null ? (
                  <div className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 mb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                        <p className="text-sm font-semibold text-white">Evaluated & Signed</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selected.submission.status)}`}>
                        {selected.submission.status.charAt(0).toUpperCase() + selected.submission.status.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 bg-surface-raised rounded-lg text-xs">
                      <div>
                        <span className="text-muted block">Marks Awarded</span>
                        <span className="text-base font-bold text-success">
                          {selected.submission.marks} / {selected.max_marks || 100}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block">Autosigned Date</span>
                        <span className="text-xs font-semibold text-white">
                          {selected.submission.signed_at ? formatDate(selected.submission.signed_at) : (selected.submission.submitted_at ? formatDate(selected.submission.submitted_at) : 'Signed')}
                        </span>
                      </div>
                      {selected.submission.reviewed_by_name && (
                        <div className="col-span-2 text-muted">
                          Signed by Faculty: <span className="text-muted-light font-medium">{selected.submission.reviewed_by_name}</span>
                        </div>
                      )}
                    </div>

                    {selected.submission.feedback && (
                      <div className="pt-2 border-t border-surface-border text-xs">
                        <span className="text-muted">Teacher Feedback:</span>
                        <p className="text-muted-light mt-0.5">{selected.submission.feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 mb-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center mx-auto mb-2">
                      <ClockIcon size={20} />
                    </div>
                    <p className="text-sm font-medium text-white">Pending Faculty Evaluation</p>
                    <p className="text-xs text-muted mt-1">
                      Your teacher creates the assignment and enters the marks directly. Once evaluated, marks and the autosigned verification date will appear here automatically.
                    </p>
                  </div>
                )}
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
