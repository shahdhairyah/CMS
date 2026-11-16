import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AssignmentIcon, DownloadIcon, UploadIcon, ArrowLeft, XIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { assignmentAPI } from '../../services/api';

export default function StudentAssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await assignmentAPI.getAll({ student_id: profile?.id });
      if (res.success) {
        const found = (res.data || []).find(a => String(a.id) === String(id));
        if (found) {
          setAssignment(found);
        } else {
          setError('Assignment not found');
        }
      } else {
        setError(res.message || 'Failed to load assignment');
      }
    } catch (err) {
      setError(err.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !assignment) return;
    try {
      setSubmitting(true);
      setError('');
      const formData = new FormData();
      formData.append('assignment_file', file);
      const res = await assignmentAPI.submit(assignment.id, formData);
      if (res.success) {
        setFile(null);
        fetchAssignment();
      } else {
        setError(res.message || 'Submission failed');
      }
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading assignment..." />;
  if (error && !assignment) {
    return (
      <div className="space-y-8">
        <PageHeader title="Assignment" subtitle="Details not available" />
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
        <button onClick={() => navigate('/student/assignments')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Assignments
        </button>
      </div>
    );
  }

  const sub = assignment?.submission;
  const deadline = assignment?.deadline ? new Date(assignment.deadline) : null;
  const isOverdue = deadline && deadline < new Date();

  return (
    <div className="space-y-8">
      <PageHeader
        title={assignment?.title || 'Assignment'}
        subtitle={`${assignment?.subject_name || ''} ${assignment?.subject_code ? `(${assignment.subject_code})` : ''}`}
        action={
          <button
            onClick={() => navigate('/student/assignments')}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted-light hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><XIcon size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {assignment?.description && (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-3">Description</h3>
              <p className="text-sm text-muted-light leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
            </div>
          )}

          {assignment?.attachments && (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-3">Attachment</h3>
              <a href={assignment.attachments} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-accent-light hover:text-accent">
                <DownloadIcon size={16} />
                Download Assignment File
              </a>
            </div>
          )}

          {sub && sub.marks !== null ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                  <h3 className="text-base font-semibold text-white">Evaluation & Signature Status</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                  {(sub.status || 'accepted').charAt(0).toUpperCase() + (sub.status || 'accepted').slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-surface-overlay rounded-xl border border-surface-border/50">
                <div>
                  <p className="text-xs text-muted mb-1">Marks Obtained</p>
                  <p className="text-xl font-bold text-success">{sub.marks} / {assignment.max_marks || 100}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Teacher Auto-Sign Date</p>
                  <p className="text-sm font-semibold text-white">
                    {sub.signed_at ? formatDate(sub.signed_at) : (sub.submitted_at ? formatDate(sub.submitted_at) : 'Signed')}
                  </p>
                </div>
                {sub.reviewed_by_name && (
                  <div className="col-span-2 text-xs text-muted">
                    Signed by: <span className="text-muted-light font-medium">{sub.reviewed_by_name}</span>
                  </div>
                )}
                {sub.feedback && (
                  <div className="col-span-2 pt-2 border-t border-surface-border text-xs">
                    <span className="text-muted block">Feedback:</span>
                    <span className="text-muted-light">{sub.feedback}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="w-12 h-12 rounded-full bg-warning/10 text-warning flex items-center justify-center mx-auto mb-3">
                <AssignmentIcon size={24} />
              </div>
              <h3 className="text-base font-semibold text-white">Teacher Evaluation Pending</h3>
              <p className="text-xs text-muted mt-2 max-w-md mx-auto">
                No student upload is required. Your course faculty enters your assessment marks directly. Once entered, marks and the official autosigned validation date will be shown here.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Assignment Info</h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted">Subject</p>
                <p className="text-sm text-muted-light">{assignment?.subject_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Subject Code</p>
                <p className="text-sm text-muted-light">{assignment?.subject_code || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Faculty</p>
                <p className="text-sm text-muted-light">{assignment?.faculty_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Deadline</p>
                <p className={`text-sm font-medium ${isOverdue ? 'text-danger' : 'text-warning'}`}>
                  {formatDate(assignment?.deadline)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Max Marks</p>
                <p className="text-sm text-muted-light">{assignment?.max_marks || 100}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
