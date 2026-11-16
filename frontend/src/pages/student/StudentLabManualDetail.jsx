import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { BookOpen, DownloadIcon, UploadIcon, ArrowLeft, CheckIcon, XIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { labManualAPI } from '../../services/api';

export default function StudentLabManualDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [manual, setManual] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [manualsRes, subsRes] = await Promise.allSettled([
        labManualAPI.getAll().catch(() => ({ success: false, data: [] })),
        labManualAPI.getStudentSubmissions().catch(() => ({ success: false, data: [] })),
      ]);

      const allManuals = manualsRes.status === 'fulfilled' ? (manualsRes.value.data || []) : [];
      const mySubmissions = subsRes.status === 'fulfilled' ? (subsRes.value.data || []) : [];

      const found = allManuals.find((m) => String(m.id) === String(id));
      if (found) {
        setManual(found);
      } else {
        setError('Lab manual not found');
      }

      const mySub = mySubmissions.find((s) => String(s.lab_manual_id) === String(id));
      setSubmission(mySub || null);
    } catch (err) {
      setError(err.message || 'Failed to load lab manual');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    try {
      setSubmitting(true);
      setError('');
      const formData = new FormData();
      formData.append('lab_file', file);
      const res = await labManualAPI.submit(id, formData);
      if (res.success) {
        setFile(null);
        fetchData();
      } else {
        setError(res.message || 'Submission failed');
      }
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading lab manual..." />;

  if (!manual) {
    return (
      <div className="space-y-8">
        <PageHeader title="Lab Manual" subtitle="Details not found" />
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error || 'Lab manual not found.'}</div>
      </div>
    );
  }

  const dueDate = manual.due_date || manual.deadline;
  const isOverdue = new Date(dueDate) < new Date();

  return (
    <div className="space-y-8">
      <PageHeader
        title={manual.title}
        subtitle={`${manual.subject_name || manual.subject}`}
        action={
          <button
            onClick={() => navigate('/student/lab-manuals')}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted-light hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft size={16} />
            Back to List
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-base font-semibold text-white mb-3">Description</h3>
            <p className="text-sm text-muted-light leading-relaxed">{manual.description || 'No description provided.'}</p>
          </div>

          {manual.instructions && (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-3">Instructions</h3>
              <div className="text-sm text-muted-light leading-relaxed whitespace-pre-wrap">{manual.instructions}</div>
            </div>
          )}

          {submission && submission.marks !== null ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                  <h3 className="text-base font-semibold text-white">Lab Manual Evaluation & Signature</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                  {(submission.status || 'accepted').charAt(0).toUpperCase() + (submission.status || 'accepted').slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-surface-overlay rounded-xl border border-surface-border/50">
                <div>
                  <p className="text-xs text-muted mb-1">Marks</p>
                  <p className="text-xl font-bold text-success">{submission.marks} / {manual.max_marks || 100}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Teacher Auto-Sign Date</p>
                  <p className="text-sm font-semibold text-white">
                    {submission.signed_at ? formatDate(submission.signed_at) : (submission.submitted_at ? formatDate(submission.submitted_at) : 'Signed')}
                  </p>
                </div>
                {submission.reviewed_by_name && (
                  <div className="col-span-2 text-xs text-muted">
                    Signed by: <span className="text-muted-light font-medium">{submission.reviewed_by_name}</span>
                  </div>
                )}
                {submission.feedback && (
                  <div className="col-span-2 pt-2 border-t border-surface-border text-xs">
                    <p className="text-muted mb-0.5">Teacher Feedback:</p>
                    <p className="text-muted-light">{submission.feedback}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="w-12 h-12 rounded-full bg-accent/10 text-accent-light flex items-center justify-center mx-auto mb-3">
                <BookOpen size={24} />
              </div>
              <h3 className="text-base font-semibold text-white">Manual Evaluation by Faculty</h3>
              <p className="text-xs text-muted mt-2 max-w-md mx-auto">
                No upload is required by the student. The lab instructor creates experiments and records grades directly. As soon as your teacher enters your marks, the verified mark and autosigned date will appear here.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Lab Manual Info</h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted">Subject</p>
                <p className="text-sm text-muted-light">{manual.subject_name || manual.subject}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Due Date</p>
                <p className={`text-sm font-medium ${isOverdue ? 'text-danger' : 'text-warning'}`}>
                  {formatDate(dueDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Max Marks</p>
                <p className="text-sm text-muted-light">{manual.max_marks || 100}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Status</p>
                <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(submission?.status || 'pending')}`}>
                  {submission ? submission.status.charAt(0).toUpperCase() + submission.status.slice(1) : 'Not Submitted'}
                </span>
              </div>
            </div>
          </div>

          {submission && submission.marks !== null && (
            <div className="card">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Score</h4>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{submission.marks}</p>
                <p className="text-xs text-muted mt-1">out of {manual.max_marks || 100}</p>
                <div className="mt-3 h-2 bg-surface-overlay rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(submission.marks / (manual.max_marks || 100)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
