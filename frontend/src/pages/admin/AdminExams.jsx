import { useState, useEffect, useMemo, useRef } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  ExamIcon, MarksIcon, ResultIcon, TimetableIcon, PlusIcon,
  EditIcon, TrashIcon, DownloadIcon, SearchIcon, FilterIcon,
  RefreshIcon, CheckIcon, XIcon, SaveIcon, CalendarIcon,
  UsersIcon, ClockIcon, WarningIcon, BookOpen, DepartmentIcon,
  ArrowRight, EyeIcon
} from '../../utils/icons';
import { formatDate } from '../../utils/helpers';
import { examAPI } from '../../services/api';

export default function AdminExams() {
  const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'unit_tests' | 'external_marks' | 'results'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Overview stats & metadata
  const [stats, setStats] = useState(null);
  const [metadata, setMetadata] = useState({ departments: [], semesters: [], subjects: [], students: [] });

  // Tab 1: Schedules Data & Filters
  const [schedules, setSchedules] = useState([]);
  const [schedSemesterFilter, setSchedSemesterFilter] = useState('all');
  const [schedTypeFilter, setSchedTypeFilter] = useState('all');
  const [schedStatusFilter, setSchedStatusFilter] = useState('all');
  const [schedSearch, setSchedSearch] = useState('');

  // Tab 2: Unit Tests Data & Filters
  const [unitTests, setUnitTests] = useState([]);
  const [utDeptFilter, setUtDeptFilter] = useState('all');
  const [utSemesterFilter, setUtSemesterFilter] = useState('all');
  const [utSubjectFilter, setUtSubjectFilter] = useState('all');
  const [utTestNumFilter, setUtTestNumFilter] = useState('all');
  const [utSearch, setUtSearch] = useState('');

  // Tab 3: External Marks Data & Filters
  const [externalMarks, setExternalMarks] = useState([]);
  const [extDeptFilter, setExtDeptFilter] = useState('all');
  const [extSemesterFilter, setExtSemesterFilter] = useState('all');
  const [extSubjectFilter, setExtSubjectFilter] = useState('all');
  const [extSearch, setExtSearch] = useState('');

  // Tab 4: Results & Grade Cards Data & Filters
  const [results, setResults] = useState([]);
  const [resSemesterFilter, setResSemesterFilter] = useState('all');
  const [resDeptFilter, setResDeptFilter] = useState('all');
  const [resStatusFilter, setResStatusFilter] = useState('all');
  const [resSearch, setResSearch] = useState('');

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    exam_type: 'mid_sem',
    semester_id: '',
    subject_id: '',
    exam_date: '',
    start_time: '10:00',
    end_time: '13:00',
    room_number: 'Main Exam Hall 1',
    max_marks: 70,
    passing_marks: 28,
    status: 'scheduled',
    instructions: ''
  });

  // Unit Test Modal
  const [utModalOpen, setUtModalOpen] = useState(false);
  const [utBatchMode, setUtBatchMode] = useState(true);
  const [utForm, setUtForm] = useState({
    subject_id: '',
    semester_id: '',
    test_number: 1,
    max_marks: 30,
    student_id: '',
    marks_obtained: ''
  });
  const [batchUtRows, setBatchUtRows] = useState([]);

  // External Marks Modal
  const [extModalOpen, setExtModalOpen] = useState(false);
  const [extBatchMode, setExtBatchMode] = useState(true);
  const [extForm, setExtForm] = useState({
    subject_id: '',
    semester_id: '',
    max_marks: 100,
    student_id: '',
    marks_obtained: ''
  });
  const [batchExtRows, setBatchExtRows] = useState([]);

  // Grade Card Modal
  const [gradeCardModalOpen, setGradeCardModalOpen] = useState(false);
  const [selectedStudentGradeCard, setSelectedStudentGradeCard] = useState(null);
  const [loadingGradeCard, setLoadingGradeCard] = useState(false);

  // Publish Results Modal
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishSemesterId, setPublishSemesterId] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, id, title }
  const [savingAction, setSavingAction] = useState(false);

  const gradeCardPrintRef = useRef(null);

  // Auto clear alerts
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Initial load
  useEffect(() => {
    loadMetadata();
    loadStats();
  }, []);

  // Tab data loader
  useEffect(() => {
    if (activeTab === 'schedules') {
      loadSchedules();
    } else if (activeTab === 'unit_tests') {
      loadUnitTests();
    } else if (activeTab === 'external_marks') {
      loadExternalMarks();
    } else if (activeTab === 'results') {
      loadResults();
    }
  }, [
    activeTab,
    schedSemesterFilter, schedTypeFilter, schedStatusFilter,
    utDeptFilter, utSemesterFilter, utSubjectFilter, utTestNumFilter,
    extDeptFilter, extSemesterFilter, extSubjectFilter,
    resSemesterFilter, resDeptFilter, resStatusFilter
  ]);

  const loadStats = async () => {
    try {
      const res = await examAPI.getStats();
      if (res && res.success) {
        setStats(res.data);
      }
    } catch (e) {
      // silent
    }
  };

  const loadMetadata = async () => {
    try {
      const res = await examAPI.getMetadata();
      if (res && res.success) {
        setMetadata(res.data || { departments: [], semesters: [], subjects: [], students: [] });
      }
    } catch (e) {
      // silent
    }
  };

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (schedSemesterFilter !== 'all') params.semester_id = schedSemesterFilter;
      if (schedTypeFilter !== 'all') params.exam_type = schedTypeFilter;
      if (schedStatusFilter !== 'all') params.status = schedStatusFilter;

      const res = await examAPI.getSchedules(params);
      if (res && res.success) {
        setSchedules(Array.isArray(res.data) ? res.data : []);
      } else {
        setSchedules([]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load exam schedules');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUnitTests = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (utDeptFilter !== 'all') params.department_id = utDeptFilter;
      if (utSemesterFilter !== 'all') params.semester_id = utSemesterFilter;
      if (utSubjectFilter !== 'all') params.subject_id = utSubjectFilter;
      if (utTestNumFilter !== 'all') params.test_number = utTestNumFilter;

      const res = await examAPI.getUnitTests(params);
      if (res && res.success) {
        setUnitTests(Array.isArray(res.data) ? res.data : []);
      } else {
        setUnitTests([]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load unit test marks');
      setUnitTests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExternalMarks = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (extDeptFilter !== 'all') params.department_id = extDeptFilter;
      if (extSemesterFilter !== 'all') params.semester_id = extSemesterFilter;
      if (extSubjectFilter !== 'all') params.subject_id = extSubjectFilter;

      const res = await examAPI.getExternalMarksList(params);
      if (res && res.success) {
        setExternalMarks(Array.isArray(res.data) ? res.data : []);
      } else {
        setExternalMarks([]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load external marks');
      setExternalMarks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (resSemesterFilter !== 'all') params.semester_id = resSemesterFilter;
      if (resDeptFilter !== 'all') params.department_id = resDeptFilter;
      if (resStatusFilter !== 'all') params.status = resStatusFilter;

      const res = await examAPI.getResults(params);
      if (res && res.success) {
        setResults(Array.isArray(res.data) ? res.data : []);
      } else {
        setResults([]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // FILTERED LISTS
  // ----------------------------------------------------
  const filteredSchedules = useMemo(() => {
    return schedules.filter(item => {
      if (!schedSearch.trim()) return true;
      const q = schedSearch.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.subject_name?.toLowerCase().includes(q) ||
        item.subject_code?.toLowerCase().includes(q) ||
        item.room_number?.toLowerCase().includes(q)
      );
    });
  }, [schedules, schedSearch]);

  const filteredUnitTests = useMemo(() => {
    return unitTests.filter(item => {
      if (!utSearch.trim()) return true;
      const q = utSearch.toLowerCase();
      return (
        item.first_name?.toLowerCase().includes(q) ||
        item.last_name?.toLowerCase().includes(q) ||
        item.roll_number?.toLowerCase().includes(q) ||
        item.subject_name?.toLowerCase().includes(q) ||
        item.subject_code?.toLowerCase().includes(q)
      );
    });
  }, [unitTests, utSearch]);

  const filteredExternalMarks = useMemo(() => {
    return externalMarks.filter(item => {
      if (!extSearch.trim()) return true;
      const q = extSearch.toLowerCase();
      return (
        item.first_name?.toLowerCase().includes(q) ||
        item.last_name?.toLowerCase().includes(q) ||
        item.roll_number?.toLowerCase().includes(q) ||
        item.subject_name?.toLowerCase().includes(q) ||
        item.subject_code?.toLowerCase().includes(q)
      );
    });
  }, [externalMarks, extSearch]);

  const filteredResults = useMemo(() => {
    return results.filter(item => {
      if (!resSearch.trim()) return true;
      const q = resSearch.toLowerCase();
      return (
        item.first_name?.toLowerCase().includes(q) ||
        item.last_name?.toLowerCase().includes(q) ||
        item.roll_number?.toLowerCase().includes(q) ||
        item.department_name?.toLowerCase().includes(q) ||
        item.course_name?.toLowerCase().includes(q)
      );
    });
  }, [results, resSearch]);

  // ----------------------------------------------------
  // SCHEDULE HANDLERS
  // ----------------------------------------------------
  const openCreateScheduleModal = () => {
    const defaultSem = metadata.semesters[0]?.id || '';
    const filteredSubs = metadata.subjects.filter(s => String(s.semester_id) === String(defaultSem));
    setEditingSchedule(null);
    setScheduleForm({
      title: '',
      exam_type: 'mid_sem',
      semester_id: defaultSem,
      subject_id: filteredSubs[0]?.id || '',
      exam_date: new Date().toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '13:00',
      room_number: 'Exam Hall A-101',
      max_marks: 70,
      passing_marks: 28,
      status: 'scheduled',
      instructions: 'Carry valid college ID card. Electronic devices are strictly prohibited.'
    });
    setScheduleModalOpen(true);
  };

  const openEditScheduleModal = (item) => {
    setEditingSchedule(item);
    setScheduleForm({
      title: item.title || '',
      exam_type: item.exam_type || 'mid_sem',
      semester_id: item.semester_id || '',
      subject_id: item.subject_id || '',
      exam_date: item.exam_date || '',
      start_time: item.start_time?.substring(0, 5) || '10:00',
      end_time: item.end_time?.substring(0, 5) || '13:00',
      room_number: item.room_number || 'Exam Hall A-101',
      max_marks: item.max_marks || 70,
      passing_marks: item.passing_marks || 28,
      status: item.status || 'scheduled',
      instructions: item.instructions || ''
    });
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.title || !scheduleForm.semester_id || !scheduleForm.subject_id || !scheduleForm.exam_date) {
      alert('Please fill in all mandatory fields');
      return;
    }

    try {
      setSavingAction(true);
      if (editingSchedule) {
        await examAPI.updateSchedule(editingSchedule.id, scheduleForm);
        setSuccessMsg('Exam schedule updated successfully');
      } else {
        await examAPI.createSchedule(scheduleForm);
        setSuccessMsg('New exam schedule created successfully');
      }
      setScheduleModalOpen(false);
      loadSchedules();
      loadStats();
    } catch (err) {
      alert(err?.message || 'Failed to save exam schedule');
    } finally {
      setSavingAction(false);
    }
  };

  // ----------------------------------------------------
  // UNIT TEST MARKS HANDLERS
  // ----------------------------------------------------
  const openUnitTestsModal = () => {
    const defaultSem = metadata.semesters[0]?.id || '';
    const filteredSubs = metadata.subjects.filter(s => String(s.semester_id) === String(defaultSem));
    const subId = filteredSubs[0]?.id || '';

    setUtForm({
      subject_id: subId,
      semester_id: defaultSem,
      test_number: 1,
      max_marks: 30,
      student_id: '',
      marks_obtained: ''
    });

    prepareBatchUtStudents(defaultSem, subId, 1, 30);
    setUtModalOpen(true);
  };

  const prepareBatchUtStudents = (semId, subId, testNum, maxMarks) => {
    const semStudents = metadata.students.filter(st => {
      if (!semId) return true;
      const semObj = metadata.semesters.find(s => String(s.id) === String(semId));
      if (!semObj) return true;
      return String(st.semester) === String(semObj.semester_number);
    });

    // Check existing marks for prefilling
    const rows = semStudents.map(st => {
      const match = unitTests.find(u =>
        String(u.student_id) === String(st.id) &&
        String(u.subject_id) === String(subId) &&
        Number(u.test_number) === Number(testNum)
      );
      return {
        student_id: st.id,
        roll_number: st.roll_number,
        name: `${st.first_name} ${st.last_name}`,
        marks_obtained: match ? match.marks_obtained : '',
        max_marks: maxMarks
      };
    });
    setBatchUtRows(rows);
  };

  const handleUtSemesterChange = (semId) => {
    const filteredSubs = metadata.subjects.filter(s => String(s.semester_id) === String(semId));
    const newSubId = filteredSubs[0]?.id || '';
    setUtForm(prev => ({ ...prev, semester_id: semId, subject_id: newSubId }));
    prepareBatchUtStudents(semId, newSubId, utForm.test_number, utForm.max_marks);
  };

  const handleUtSubjectChange = (subId) => {
    setUtForm(prev => ({ ...prev, subject_id: subId }));
    prepareBatchUtStudents(utForm.semester_id, subId, utForm.test_number, utForm.max_marks);
  };

  const handleSaveUnitTests = async (e) => {
    e.preventDefault();
    if (!utForm.subject_id) {
      alert('Please select a subject');
      return;
    }

    try {
      setSavingAction(true);
      if (utBatchMode) {
        const marksToSave = batchUtRows
          .filter(r => r.marks_obtained !== '' && r.marks_obtained !== null)
          .map(r => ({
            student_id: r.student_id,
            subject_id: utForm.subject_id,
            test_number: Number(utForm.test_number),
            marks_obtained: Number(r.marks_obtained),
            max_marks: Number(utForm.max_marks || 30)
          }));

        if (marksToSave.length === 0) {
          alert('Please enter marks for at least one student');
          setSavingAction(false);
          return;
        }

        await examAPI.enterInternalMarks({ marks: marksToSave });
        setSuccessMsg(`Successfully saved unit test marks for ${marksToSave.length} students`);
      } else {
        if (!utForm.student_id || utForm.marks_obtained === '') {
          alert('Please select a student and enter marks');
          setSavingAction(false);
          return;
        }
        await examAPI.enterInternalMarks({
          student_id: utForm.student_id,
          subject_id: utForm.subject_id,
          test_number: Number(utForm.test_number),
          marks_obtained: Number(utForm.marks_obtained),
          max_marks: Number(utForm.max_marks || 30)
        });
        setSuccessMsg('Unit test mark recorded successfully');
      }

      setUtModalOpen(false);
      loadUnitTests();
      loadStats();
    } catch (err) {
      alert(err?.message || 'Failed to save unit test marks');
    } finally {
      setSavingAction(false);
    }
  };

  // ----------------------------------------------------
  // EXTERNAL MARKS HANDLERS
  // ----------------------------------------------------
  const openExternalMarksModal = () => {
    const defaultSem = metadata.semesters[0]?.id || '';
    const filteredSubs = metadata.subjects.filter(s => String(s.semester_id) === String(defaultSem));
    const subId = filteredSubs[0]?.id || '';

    setExtForm({
      subject_id: subId,
      semester_id: defaultSem,
      max_marks: 100,
      student_id: '',
      marks_obtained: ''
    });

    prepareBatchExtStudents(defaultSem, subId, 100);
    setExtModalOpen(true);
  };

  const prepareBatchExtStudents = (semId, subId, maxMarks) => {
    const semStudents = metadata.students.filter(st => {
      if (!semId) return true;
      const semObj = metadata.semesters.find(s => String(s.id) === String(semId));
      if (!semObj) return true;
      return String(st.semester) === String(semObj.semester_number);
    });

    const rows = semStudents.map(st => {
      const match = externalMarks.find(em =>
        String(em.student_id) === String(st.id) &&
        String(em.subject_id) === String(subId)
      );
      return {
        student_id: st.id,
        roll_number: st.roll_number,
        name: `${st.first_name} ${st.last_name}`,
        marks_obtained: match ? match.marks_obtained : '',
        max_marks: maxMarks
      };
    });
    setBatchExtRows(rows);
  };

  const handleExtSemesterChange = (semId) => {
    const filteredSubs = metadata.subjects.filter(s => String(s.semester_id) === String(semId));
    const newSubId = filteredSubs[0]?.id || '';
    setExtForm(prev => ({ ...prev, semester_id: semId, subject_id: newSubId }));
    prepareBatchExtStudents(semId, newSubId, extForm.max_marks);
  };

  const handleExtSubjectChange = (subId) => {
    setExtForm(prev => ({ ...prev, subject_id: subId }));
    prepareBatchExtStudents(extForm.semester_id, subId, extForm.max_marks);
  };

  const handleSaveExternalMarks = async (e) => {
    e.preventDefault();
    if (!extForm.subject_id) {
      alert('Please select a subject');
      return;
    }

    try {
      setSavingAction(true);
      if (extBatchMode) {
        const marksToSave = batchExtRows
          .filter(r => r.marks_obtained !== '' && r.marks_obtained !== null)
          .map(r => ({
            student_id: r.student_id,
            subject_id: extForm.subject_id,
            marks_obtained: Number(r.marks_obtained),
            max_marks: Number(extForm.max_marks || 100)
          }));

        if (marksToSave.length === 0) {
          alert('Please enter external marks for at least one student');
          setSavingAction(false);
          return;
        }

        await examAPI.enterExternalMarks({ marks: marksToSave });
        setSuccessMsg(`Successfully saved external marks for ${marksToSave.length} students`);
      } else {
        if (!extForm.student_id || extForm.marks_obtained === '') {
          alert('Please select a student and enter marks');
          setSavingAction(false);
          return;
        }
        await examAPI.enterExternalMarks({
          student_id: extForm.student_id,
          subject_id: extForm.subject_id,
          marks_obtained: Number(extForm.marks_obtained),
          max_marks: Number(extForm.max_marks || 100)
        });
        setSuccessMsg('External mark recorded successfully');
      }

      setExtModalOpen(false);
      loadExternalMarks();
      loadStats();
    } catch (err) {
      alert(err?.message || 'Failed to save external marks');
    } finally {
      setSavingAction(false);
    }
  };

  // ----------------------------------------------------
  // GRADE CARD & RESULTS HANDLERS
  // ----------------------------------------------------
  const handleOpenGradeCard = async (studentId, semesterId) => {
    try {
      setLoadingGradeCard(true);
      setGradeCardModalOpen(true);
      const res = await examAPI.getGradeCard(studentId, { semester_id: semesterId });
      if (res && res.success) {
        setSelectedStudentGradeCard(res.data);
      } else {
        alert(res?.message || 'Failed to retrieve grade card details');
        setGradeCardModalOpen(false);
      }
    } catch (err) {
      alert(err?.message || 'Error loading student grade card');
      setGradeCardModalOpen(false);
    } finally {
      setLoadingGradeCard(false);
    }
  };

  const handleCalculateSingleResult = async (studentId, semesterId) => {
    try {
      setSavingAction(true);
      const res = await examAPI.calculateResult({ student_id: studentId, semester_id: semesterId });
      if (res && res.success) {
        setSuccessMsg(`Result recalculated: SGPA ${res.data?.sgpa || '-'}, CGPA ${res.data?.cgpa || '-'}`);
        loadResults();
        loadStats();
      }
    } catch (err) {
      alert(err?.message || 'Failed to recalculate result');
    } finally {
      setSavingAction(false);
    }
  };

  const handlePublishResultsSubmit = async (e) => {
    e.preventDefault();
    if (!publishSemesterId) {
      alert('Please select a semester to publish');
      return;
    }
    try {
      setPublishing(true);
      const res = await examAPI.publishResults({ semester_id: publishSemesterId });
      if (res && res.success) {
        setSuccessMsg(`Results published! Processed ${res.data?.processed || 0} students and published ${res.data?.published || 0} records.`);
        setPublishModalOpen(false);
        loadResults();
        loadStats();
      }
    } catch (err) {
      alert(err?.message || 'Failed to publish results');
    } finally {
      setPublishing(false);
    }
  };

  // ----------------------------------------------------
  // DELETE HANDLERS
  // ----------------------------------------------------
  const executeDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setSavingAction(true);
      if (deleteConfirm.type === 'schedule') {
        await examAPI.deleteSchedule(deleteConfirm.id);
        setSuccessMsg('Exam schedule deleted');
        loadSchedules();
      } else if (deleteConfirm.type === 'unit_test') {
        await examAPI.deleteInternalMarks(deleteConfirm.id);
        setSuccessMsg('Unit test entry deleted');
        loadUnitTests();
      } else if (deleteConfirm.type === 'external_mark') {
        await examAPI.deleteExternalMarks(deleteConfirm.id);
        setSuccessMsg('External mark entry deleted');
        loadExternalMarks();
      }
      setDeleteConfirm(null);
      loadStats();
    } catch (err) {
      alert(err?.message || 'Failed to delete entry');
    } finally {
      setSavingAction(false);
    }
  };

  // ----------------------------------------------------
  // CSV EXPORTERS
  // ----------------------------------------------------
  const exportCsv = (filename, headers, rows) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${String(field ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSchedulesCsv = () => {
    const headers = ['Title', 'Exam Type', 'Semester', 'Course', 'Subject Code', 'Subject Name', 'Date', 'Start Time', 'End Time', 'Hall', 'Max Marks', 'Passing Marks', 'Status'];
    const rows = filteredSchedules.map(s => [
      s.title, s.exam_type, s.semester_number, s.course_name, s.subject_code, s.subject_name,
      s.exam_date, s.start_time, s.end_time, s.room_number, s.max_marks, s.passing_marks, s.status
    ]);
    exportCsv('exam_schedules', headers, rows);
  };

  const exportUnitTestsCsv = () => {
    const headers = ['Roll Number', 'Student Name', 'Subject Code', 'Subject Name', 'Department', 'Semester', 'Test Number', 'Marks Obtained', 'Max Marks', 'Percentage'];
    const rows = filteredUnitTests.map(u => [
      u.roll_number, `${u.first_name} ${u.last_name}`, u.subject_code, u.subject_name, u.department_name, u.semester_number,
      u.test_number, u.marks_obtained, u.max_marks,
      u.max_marks > 0 ? ((u.marks_obtained / u.max_marks) * 100).toFixed(1) + '%' : '0%'
    ]);
    exportCsv('unit_tests_internal_marks', headers, rows);
  };

  const exportExternalMarksCsv = () => {
    const headers = ['Roll Number', 'Student Name', 'Subject Code', 'Subject Name', 'Department', 'Semester', 'Marks Obtained', 'Max Marks', 'Percentage'];
    const rows = filteredExternalMarks.map(e => [
      e.roll_number, `${e.first_name} ${e.last_name}`, e.subject_code, e.subject_name, e.department_name, e.semester_number,
      e.marks_obtained, e.max_marks,
      e.max_marks > 0 ? ((e.marks_obtained / e.max_marks) * 100).toFixed(1) + '%' : '0%'
    ]);
    exportCsv('external_marks', headers, rows);
  };

  const exportResultsCsv = () => {
    const headers = ['Roll Number', 'Student Name', 'Department', 'Semester', 'Course', 'Total Credits', 'Total Grade Points', 'SGPA', 'CGPA', 'Status', 'Published At'];
    const rows = filteredResults.map(r => [
      r.roll_number, `${r.first_name} ${r.last_name}`, r.department_name, r.semester_number, r.course_name,
      r.total_credits, r.total_grade_points, r.sgpa, r.cgpa, r.status, r.published_at || 'Draft'
    ]);
    exportCsv('examination_results', headers, rows);
  };

  const triggerPrintGradeCard = () => {
    if (!gradeCardPrintRef.current) return;
    const printContents = gradeCardPrintRef.current.innerHTML;
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) {
      setError('Allow pop-ups in your browser to print the grade card.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Grade Card - ${selectedStudentGradeCard?.student?.roll_number || 'ADIT'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; }
            th, td { border: 1px solid #d1d5db; padding: 8px 12px; font-size: 13px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: 600; text-transform: uppercase; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
            .header h1 { margin: 0; font-size: 20px; color: #1e3a8a; }
            .header p { margin: 2px 0; font-size: 12px; color: #4b5563; }
            .info-grid { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
            .badge-pass { color: #15803d; font-weight: bold; }
            .badge-fail { color: #b91c1c; font-weight: bold; }
            .footer { display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px; text-align: center; }
            .sig-line { border-top: 1px dashed #6b7280; width: 180px; padding-top: 4px; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  // Helper badge color
  const getExamTypeBadge = (type) => {
    switch (type) {
      case 'mid_sem': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200';
      case 'final_external': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200';
      case 'unit_test': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200';
      case 'practical': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200';
      case 'remedial': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-300';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300';
      case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300';
      case 'cancelled': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckIcon size={18} />
            </span>
            <p className="font-medium text-sm">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:opacity-80">
            <XIcon size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <WarningIcon size={18} />
            </span>
            <p className="font-medium text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:opacity-80">
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Page Header with Action Buttons */}
      <PageHeader
        title="Examination Module"
        subtitle="End-to-end exam lifecycle: timetable scheduling, internal unit tests, external marks, and grade cards"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'schedules') openCreateScheduleModal();
                else if (activeTab === 'unit_tests') openUnitTestsModal();
                else if (activeTab === 'external_marks') openExternalMarksModal();
                else setPublishModalOpen(true);
              }}
              className="btn btn-primary flex items-center gap-2 shadow-sm font-medium"
            >
              <PlusIcon size={18} />
              <span>
                {activeTab === 'schedules' && 'Schedule Exam'}
                {activeTab === 'unit_tests' && 'Enter Unit Tests'}
                {activeTab === 'external_marks' && 'Enter External Marks'}
                {activeTab === 'results' && 'Publish Results'}
              </span>
            </button>

            <button
              onClick={() => {
                if (activeTab === 'schedules') exportSchedulesCsv();
                else if (activeTab === 'unit_tests') exportUnitTestsCsv();
                else if (activeTab === 'external_marks') exportExternalMarksCsv();
                else exportResultsCsv();
              }}
              className="btn btn-secondary flex items-center gap-2 shadow-sm"
              title="Export Current View to CSV"
            >
              <DownloadIcon size={18} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={() => {
                loadStats();
                if (activeTab === 'schedules') loadSchedules();
                else if (activeTab === 'unit_tests') loadUnitTests();
                else if (activeTab === 'external_marks') loadExternalMarks();
                else loadResults();
              }}
              className="btn btn-secondary p-2.5"
              title="Refresh Data"
            >
              <RefreshIcon size={18} />
            </button>
          </div>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="card p-4 border border-surface-border hover:border-primary-500/40 transition-all bg-surface shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-medium uppercase tracking-wider mb-2">
            <span>Schedules</span>
            <span className="p-1 rounded-lg bg-blue-500/10 text-blue-500"><CalendarIcon size={16} /></span>
          </div>
          <div className="text-2xl font-bold text-muted-dark dark:text-muted-light">
            {stats?.total_schedules ?? schedules.length}
          </div>
          <div className="text-xs text-muted mt-1">Total Scheduled</div>
        </div>

        <div className="card p-4 border border-surface-border hover:border-primary-500/40 transition-all bg-surface shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-medium uppercase tracking-wider mb-2">
            <span>Upcoming</span>
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-500"><ClockIcon size={16} /></span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats?.upcoming_exams ?? schedules.filter(s => s.status === 'scheduled').length}
          </div>
          <div className="text-xs text-muted mt-1">Pending / Upcoming</div>
        </div>

        <div className="card p-4 border border-surface-border hover:border-primary-500/40 transition-all bg-surface shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-medium uppercase tracking-wider mb-2">
            <span>Completed</span>
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500"><CheckIcon size={16} /></span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats?.completed_exams ?? schedules.filter(s => s.status === 'completed').length}
          </div>
          <div className="text-xs text-muted mt-1">Exams Conducted</div>
        </div>

        <div className="card p-4 border border-surface-border hover:border-primary-500/40 transition-all bg-surface shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-medium uppercase tracking-wider mb-2">
            <span>Unit Tests</span>
            <span className="p-1 rounded-lg bg-violet-500/10 text-violet-500"><MarksIcon size={16} /></span>
          </div>
          <div className="text-2xl font-bold text-muted-dark dark:text-muted-light">
            {stats?.unit_tests_entered ?? unitTests.length}
          </div>
          <div className="text-xs text-muted mt-1">Internal Records</div>
        </div>

        <div className="card p-4 border border-surface-border hover:border-primary-500/40 transition-all bg-surface shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-medium uppercase tracking-wider mb-2">
            <span>External Marks</span>
            <span className="p-1 rounded-lg bg-sky-500/10 text-sky-500"><ExamIcon size={16} /></span>
          </div>
          <div className="text-2xl font-bold text-muted-dark dark:text-muted-light">
            {stats?.external_marks_entered ?? externalMarks.length}
          </div>
          <div className="text-xs text-muted mt-1">Final Mark Entries</div>
        </div>

        <div className="card p-4 border border-surface-border hover:border-primary-500/40 transition-all bg-surface shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-medium uppercase tracking-wider mb-2">
            <span>Published</span>
            <span className="p-1 rounded-lg bg-teal-500/10 text-teal-500"><ResultIcon size={16} /></span>
          </div>
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
            {stats?.published_results ?? results.filter(r => r.published_at).length}
          </div>
          <div className="text-xs text-muted mt-1">Official Results</div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="border-b border-surface-border flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'schedules'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-muted hover:text-muted-dark dark:hover:text-muted-light'
            }`}
          >
            <CalendarIcon size={18} />
            <span>1. Exam Scheduling</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-muted font-normal">
              {filteredSchedules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('unit_tests')}
            className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'unit_tests'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-muted hover:text-muted-dark dark:hover:text-muted-light'
            }`}
          >
            <MarksIcon size={18} />
            <span>2. Unit Tests (Internal)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-muted font-normal">
              {filteredUnitTests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('external_marks')}
            className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'external_marks'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-muted hover:text-muted-dark dark:hover:text-muted-light'
            }`}
          >
            <ExamIcon size={18} />
            <span>3. External Marks</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-muted font-normal">
              {filteredExternalMarks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'results'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-muted hover:text-muted-dark dark:hover:text-muted-light'
            }`}
          >
            <ResultIcon size={18} />
            <span>4. Grade Cards & Results</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-muted font-normal">
              {filteredResults.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXAM SCHEDULING */}
      {/* ========================================================================= */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="card p-4 border border-surface-border bg-surface flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[240px] max-w-sm">
                <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search exam title, subject, code, hall..."
                  value={schedSearch}
                  onChange={(e) => setSchedSearch(e.target.value)}
                  className="input pl-9 text-sm w-full"
                />
              </div>

              <select
                value={schedSemesterFilter}
                onChange={(e) => setSchedSemesterFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Semesters</option>
                {metadata.semesters.map(sem => (
                  <option key={sem.id} value={sem.id}>
                    Semester {sem.semester_number} ({sem.course_name})
                  </option>
                ))}
              </select>

              <select
                value={schedTypeFilter}
                onChange={(e) => setSchedTypeFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Exam Types</option>
                <option value="mid_sem">Mid Semester</option>
                <option value="final_external">Final External</option>
                <option value="unit_test">Unit Test</option>
                <option value="practical">Practical / Lab</option>
                <option value="remedial">Remedial Exam</option>
              </select>

              <select
                value={schedStatusFilter}
                onChange={(e) => setSchedStatusFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="text-xs text-muted">
              Showing <strong>{filteredSchedules.length}</strong> exam schedules
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="card p-12 flex justify-center"><LoadingSpinner /></div>
          ) : filteredSchedules.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="No exam schedules found"
              message="No exam schedules match your current filter criteria. Click 'Schedule Exam' to create a new timetable entry."
              action={
                <button onClick={openCreateScheduleModal} className="btn btn-primary mt-2">
                  <PlusIcon size={16} /> Schedule Exam
                </button>
              }
            />
          ) : (
            <div className="card overflow-hidden border border-surface-border bg-surface">
              <div className="overflow-x-auto">
                <table className="table w-full text-left">
                  <thead>
                    <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-muted bg-surface-overlay/50">
                      <th className="py-3 px-4">Exam Details</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Semester & Course</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Room / Hall</th>
                      <th className="py-3 px-4">Marks (Max / Pass)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-sm">
                    {filteredSchedules.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-overlay/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-muted-dark dark:text-muted-light">{item.title}</div>
                          <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md border mt-1 ${getExamTypeBadge(item.exam_type)}`}>
                            {item.exam_type?.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-muted-dark dark:text-muted-light">{item.subject_name}</div>
                          <div className="text-xs text-muted font-mono">{item.subject_code} • {item.credits || 3} Credits</div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="font-semibold text-muted-dark dark:text-muted-light">Semester {item.semester_number}</div>
                          <div className="text-muted">{item.course_name}</div>
                        </td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          <div className="font-medium text-muted-dark dark:text-muted-light flex items-center gap-1.5">
                            <CalendarIcon size={14} className="text-primary-500" />
                            {formatDate(item.exam_date)}
                          </div>
                          <div className="text-muted mt-0.5 flex items-center gap-1.5">
                            <ClockIcon size={13} />
                            {item.start_time?.substring(0, 5)} - {item.end_time?.substring(0, 5)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="px-2.5 py-1 rounded-md bg-surface-overlay border border-surface-border font-medium">
                            {item.room_number || 'Hall 1'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap font-medium">
                          <span className="text-muted-dark dark:text-muted-light">{item.max_marks} Max</span>
                          <span className="text-muted mx-1">/</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{item.passing_marks} Pass</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusBadge(item.status)}`}>
                            {item.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditScheduleModal(item)}
                              className="p-1.5 rounded-lg text-muted hover:text-primary-500 hover:bg-surface-overlay"
                              title="Edit Schedule"
                            >
                              <EditIcon size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'schedule', id: item.id, title: item.title })}
                              className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-surface-overlay"
                              title="Delete Schedule"
                            >
                              <TrashIcon size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UNIT TESTS (INTERNAL MARKS) */}
      {/* ========================================================================= */}
      {activeTab === 'unit_tests' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="card p-4 border border-surface-border bg-surface flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px] max-w-sm">
                <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search student roll, name, subject..."
                  value={utSearch}
                  onChange={(e) => setUtSearch(e.target.value)}
                  className="input pl-9 text-sm w-full"
                />
              </div>

              <select
                value={utDeptFilter}
                onChange={(e) => setUtDeptFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Departments</option>
                {metadata.departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={utSemesterFilter}
                onChange={(e) => setUtSemesterFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Semesters</option>
                {metadata.semesters.map(sem => (
                  <option key={sem.id} value={sem.id}>Semester {sem.semester_number} ({sem.course_name})</option>
                ))}
              </select>

              <select
                value={utSubjectFilter}
                onChange={(e) => setUtSubjectFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Subjects</option>
                {metadata.subjects
                  .filter(s => utSemesterFilter === 'all' || String(s.semester_id) === String(utSemesterFilter))
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))
                }
              </select>

              <select
                value={utTestNumFilter}
                onChange={(e) => setUtTestNumFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Tests (1, 2, 3)</option>
                <option value="1">Unit Test 1</option>
                <option value="2">Unit Test 2</option>
                <option value="3">Unit Test 3</option>
              </select>
            </div>

            <div className="text-xs text-muted">
              Showing <strong>{filteredUnitTests.length}</strong> unit test records
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="card p-12 flex justify-center"><LoadingSpinner /></div>
          ) : filteredUnitTests.length === 0 ? (
            <EmptyState
              icon={MarksIcon}
              title="No internal marks recorded"
              message="No unit test records match your filter. Click 'Enter Unit Tests' to record marks."
              action={
                <button onClick={openUnitTestsModal} className="btn btn-primary mt-2">
                  <PlusIcon size={16} /> Enter Unit Tests
                </button>
              }
            />
          ) : (
            <div className="card overflow-hidden border border-surface-border bg-surface">
              <div className="overflow-x-auto">
                <table className="table w-full text-left">
                  <thead>
                    <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-muted bg-surface-overlay/50">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Semester</th>
                      <th className="py-3 px-4">Test Number</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Percentage</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-sm">
                    {filteredUnitTests.map((item) => {
                      const pct = item.max_marks > 0 ? ((item.marks_obtained / item.max_marks) * 100).toFixed(1) : 0;
                      return (
                        <tr key={item.id} className="hover:bg-surface-overlay/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-muted-dark dark:text-muted-light">
                            {item.first_name} {item.last_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">
                            {item.roll_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-muted-dark dark:text-muted-light">{item.subject_name}</div>
                            <div className="text-xs text-muted font-mono">{item.subject_code}</div>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted">
                            Sem {item.semester_number || item.student_semester || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                              Unit Test {item.test_number}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-sm">
                            <span className={item.marks_obtained >= (item.max_marks * 0.4) ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {item.marks_obtained}
                            </span>
                            <span className="text-muted text-xs font-normal"> / {item.max_marks}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-surface-overlay rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-medium">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setDeleteConfirm({ type: 'unit_test', id: item.id, title: `Test ${item.test_number} for ${item.first_name} (${item.subject_code})` })}
                                className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-surface-overlay"
                                title="Delete Record"
                              >
                                <TrashIcon size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXTERNAL MARKS */}
      {/* ========================================================================= */}
      {activeTab === 'external_marks' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="card p-4 border border-surface-border bg-surface flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px] max-w-sm">
                <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search student roll, name, subject..."
                  value={extSearch}
                  onChange={(e) => setExtSearch(e.target.value)}
                  className="input pl-9 text-sm w-full"
                />
              </div>

              <select
                value={extDeptFilter}
                onChange={(e) => setExtDeptFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Departments</option>
                {metadata.departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={extSemesterFilter}
                onChange={(e) => setExtSemesterFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Semesters</option>
                {metadata.semesters.map(sem => (
                  <option key={sem.id} value={sem.id}>Semester {sem.semester_number} ({sem.course_name})</option>
                ))}
              </select>

              <select
                value={extSubjectFilter}
                onChange={(e) => setExtSubjectFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Subjects</option>
                {metadata.subjects
                  .filter(s => extSemesterFilter === 'all' || String(s.semester_id) === String(extSemesterFilter))
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))
                }
              </select>
            </div>

            <div className="text-xs text-muted">
              Showing <strong>{filteredExternalMarks.length}</strong> external mark entries
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="card p-12 flex justify-center"><LoadingSpinner /></div>
          ) : filteredExternalMarks.length === 0 ? (
            <EmptyState
              icon={ExamIcon}
              title="No external marks recorded"
              message="No external marks have been uploaded or entered yet. Click 'Enter External Marks' to record external assessment."
              action={
                <button onClick={openExternalMarksModal} className="btn btn-primary mt-2">
                  <PlusIcon size={16} /> Enter External Marks
                </button>
              }
            />
          ) : (
            <div className="card overflow-hidden border border-surface-border bg-surface">
              <div className="overflow-x-auto">
                <table className="table w-full text-left">
                  <thead>
                    <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-muted bg-surface-overlay/50">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Semester</th>
                      <th className="py-3 px-4">External Marks</th>
                      <th className="py-3 px-4">Percentage</th>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-sm">
                    {filteredExternalMarks.map((item) => {
                      const pct = item.max_marks > 0 ? ((item.marks_obtained / item.max_marks) * 100).toFixed(1) : 0;
                      let grade = 'F';
                      if (pct >= 90) grade = 'O';
                      else if (pct >= 80) grade = 'A+';
                      else if (pct >= 70) grade = 'A';
                      else if (pct >= 60) grade = 'B+';
                      else if (pct >= 50) grade = 'B';
                      else if (pct >= 40) grade = 'C';

                      return (
                        <tr key={item.id} className="hover:bg-surface-overlay/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-muted-dark dark:text-muted-light">
                            {item.first_name} {item.last_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">
                            {item.roll_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-muted-dark dark:text-muted-light">{item.subject_name}</div>
                            <div className="text-xs text-muted font-mono">{item.subject_code} • {item.credits || 3} Credits</div>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted">
                            Sem {item.semester_number || item.student_semester || '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-sm">
                            <span className={item.marks_obtained >= 40 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {item.marks_obtained}
                            </span>
                            <span className="text-muted text-xs font-normal"> / {item.max_marks}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-surface-overlay rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-medium">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${
                              grade === 'F' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}>
                              {grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setDeleteConfirm({ type: 'external_mark', id: item.id, title: `External mark for ${item.first_name} (${item.subject_code})` })}
                                className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-surface-overlay"
                                title="Delete Entry"
                              >
                                <TrashIcon size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GRADE CARDS & SEMESTER RESULTS */}
      {/* ========================================================================= */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="card p-4 border border-surface-border bg-surface flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px] max-w-sm">
                <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search student roll, name, department..."
                  value={resSearch}
                  onChange={(e) => setResSearch(e.target.value)}
                  className="input pl-9 text-sm w-full"
                />
              </div>

              <select
                value={resSemesterFilter}
                onChange={(e) => setResSemesterFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Semesters</option>
                {metadata.semesters.map(sem => (
                  <option key={sem.id} value={sem.id}>Semester {sem.semester_number} ({sem.course_name})</option>
                ))}
              </select>

              <select
                value={resDeptFilter}
                onChange={(e) => setResDeptFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Departments</option>
                {metadata.departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={resStatusFilter}
                onChange={(e) => setResStatusFilter(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Results (Pass & Fail)</option>
                <option value="pass">Passed Only</option>
                <option value="fail">Failed Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPublishModalOpen(true)}
                className="btn btn-secondary text-xs flex items-center gap-1.5"
              >
                <ResultIcon size={16} /> Batch Publish
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="card p-12 flex justify-center"><LoadingSpinner /></div>
          ) : filteredResults.length === 0 ? (
            <EmptyState
              icon={ResultIcon}
              title="No semester results calculated"
              message="Results have not been generated for the selected filter. Click 'Batch Publish' or enter marks first."
              action={
                <button onClick={() => setPublishModalOpen(true)} className="btn btn-primary mt-2">
                  <ResultIcon size={16} /> Generate / Publish Results
                </button>
              }
            />
          ) : (
            <div className="card overflow-hidden border border-surface-border bg-surface">
              <div className="overflow-x-auto">
                <table className="table w-full text-left">
                  <thead>
                    <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-muted bg-surface-overlay/50">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Department & Course</th>
                      <th className="py-3 px-4">Semester</th>
                      <th className="py-3 px-4">SGPA</th>
                      <th className="py-3 px-4">CGPA</th>
                      <th className="py-3 px-4">Credits</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Grade Card & Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-sm">
                    {filteredResults.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-overlay/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-muted-dark dark:text-muted-light">
                          {item.first_name} {item.last_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">
                          {item.roll_number}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="font-medium text-muted-dark dark:text-muted-light">{item.department_name || 'Engineering'}</div>
                          <div className="text-muted">{item.course_name}</div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          Semester {item.semester_number}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${
                            Number(item.sgpa) >= 7.5 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            Number(item.sgpa) >= 5.5 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                            Number(item.sgpa) >= 4.0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}>
                            {Number(item.sgpa).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-xs font-mono text-muted-dark dark:text-muted-light">
                            {Number(item.cgpa).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted font-mono">
                          {item.total_credits || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            item.status === 'pass'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-300'
                          }`}>
                            {item.status || 'PASS'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleCalculateSingleResult(item.student_id, item.semester_id)}
                              className="btn btn-secondary px-2.5 py-1 text-xs"
                              title="Re-compute SGPA/CGPA"
                            >
                              <RefreshIcon size={14} /> Recalc
                            </button>
                            <button
                              onClick={() => handleOpenGradeCard(item.student_id, item.semester_id)}
                              className="btn btn-primary px-3 py-1 text-xs flex items-center gap-1.5 font-medium shadow-xs"
                            >
                              <EyeIcon size={14} /> View Grade Card
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SCHEDULE EXAM (CREATE / EDIT) */}
      {/* ========================================================================= */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="card w-full max-w-2xl bg-surface border border-surface-border shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-surface-border bg-surface-overlay/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
                  <CalendarIcon size={20} />
                </span>
                <h3 className="font-semibold text-lg text-muted-dark dark:text-muted-light">
                  {editingSchedule ? 'Edit Exam Schedule' : 'Schedule New Exam'}
                </h3>
              </div>
              <button onClick={() => setScheduleModalOpen(false)} className="text-muted hover:text-muted-dark dark:hover:text-muted-light">
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Exam Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mid Semester Examination - Nov 2026"
                    value={scheduleForm.title}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label">Exam Type *</label>
                  <select
                    value={scheduleForm.exam_type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, exam_type: e.target.value })}
                    className="input w-full"
                  >
                    <option value="mid_sem">Mid Semester Exam</option>
                    <option value="final_external">Final External Exam</option>
                    <option value="unit_test">Internal Unit Test</option>
                    <option value="practical">Practical / Lab Exam</option>
                    <option value="remedial">Remedial Exam</option>
                  </select>
                </div>

                <div>
                  <label className="label">Semester *</label>
                  <select
                    value={scheduleForm.semester_id}
                    onChange={(e) => {
                      const semId = e.target.value;
                      const subs = metadata.subjects.filter(s => String(s.semester_id) === String(semId));
                      setScheduleForm({
                        ...scheduleForm,
                        semester_id: semId,
                        subject_id: subs[0]?.id || ''
                      });
                    }}
                    className="input w-full"
                    required
                  >
                    <option value="">Select Semester</option>
                    {metadata.semesters.map(sem => (
                      <option key={sem.id} value={sem.id}>
                        Semester {sem.semester_number} ({sem.course_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Subject *</label>
                  <select
                    value={scheduleForm.subject_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, subject_id: e.target.value })}
                    className="input w-full"
                    required
                  >
                    <option value="">Select Subject</option>
                    {metadata.subjects
                      .filter(s => !scheduleForm.semester_id || String(s.semester_id) === String(scheduleForm.semester_id))
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.name} ({s.credits} Credits)
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="label">Exam Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.exam_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, exam_date: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label">Room / Hall Number</label>
                  <input
                    type="text"
                    placeholder="e.g. Exam Hall A-102"
                    value={scheduleForm.room_number}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, room_number: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label">End Time *</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label">Maximum Marks</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={scheduleForm.max_marks}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, max_marks: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label">Passing Marks</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={scheduleForm.passing_marks}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, passing_marks: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Exam Status</label>
                  <select
                    value={scheduleForm.status}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, status: e.target.value })}
                    className="input w-full"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Special Instructions</label>
                  <textarea
                    rows={2}
                    placeholder="Candidate instructions or materials permitted in exam hall..."
                    value={scheduleForm.instructions}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, instructions: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {savingAction ? <LoadingSpinner size="sm" /> : <SaveIcon size={18} />}
                  <span>{editingSchedule ? 'Update Schedule' : 'Create Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ENTER UNIT TEST MARKS (BATCH & SINGLE) */}
      {/* ========================================================================= */}
      {utModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="card w-full max-w-3xl bg-surface border border-surface-border shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-surface-border bg-surface-overlay/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                  <MarksIcon size={20} />
                </span>
                <div>
                  <h3 className="font-semibold text-lg text-muted-dark dark:text-muted-light">
                    Record Unit Test Marks (Internal Assessment)
                  </h3>
                  <p className="text-xs text-muted">
                    Enter unit test scores. Best-of tests are evaluated automatically for SGPA.
                  </p>
                </div>
              </div>
              <button onClick={() => setUtModalOpen(false)} className="text-muted hover:text-muted-dark dark:hover:text-muted-light">
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUnitTests} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="flex items-center justify-between p-2 bg-surface-overlay rounded-xl border border-surface-border">
                <span className="text-xs font-medium text-muted pl-2">Entry Mode:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setUtBatchMode(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      utBatchMode ? 'bg-primary-500 text-white shadow-xs' : 'text-muted hover:text-muted-dark dark:hover:text-muted-light'
                    }`}
                  >
                    Class Batch Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setUtBatchMode(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      !utBatchMode ? 'bg-primary-500 text-white shadow-xs' : 'text-muted hover:text-muted-dark dark:hover:text-muted-light'
                    }`}
                  >
                    Single Student
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="label text-xs">Semester</label>
                  <select
                    value={utForm.semester_id}
                    onChange={(e) => handleUtSemesterChange(e.target.value)}
                    className="input text-xs w-full"
                    required
                  >
                    {metadata.semesters.map(sem => (
                      <option key={sem.id} value={sem.id}>Sem {sem.semester_number} ({sem.course_name})</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="label text-xs">Subject</label>
                  <select
                    value={utForm.subject_id}
                    onChange={(e) => handleUtSubjectChange(e.target.value)}
                    className="input text-xs w-full"
                    required
                  >
                    {metadata.subjects
                      .filter(s => !utForm.semester_id || String(s.semester_id) === String(utForm.semester_id))
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="label text-xs">Test Number</label>
                  <select
                    value={utForm.test_number}
                    onChange={(e) => {
                      const num = e.target.value;
                      setUtForm({ ...utForm, test_number: num });
                      prepareBatchUtStudents(utForm.semester_id, utForm.subject_id, num, utForm.max_marks);
                    }}
                    className="input text-xs w-full"
                  >
                    <option value="1">Unit Test 1</option>
                    <option value="2">Unit Test 2</option>
                    <option value="3">Unit Test 3</option>
                  </select>
                </div>
              </div>

              {utBatchMode ? (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-muted pb-1 border-b border-surface-border">
                    <span>Students in this Semester ({batchUtRows.length})</span>
                    <span>Max Marks: <strong>{utForm.max_marks || 30}</strong></span>
                  </div>

                  <div className="border border-surface-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="table w-full text-left text-xs">
                      <thead className="bg-surface-overlay/80 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3">Roll No</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3 w-36">Marks Obtained</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {batchUtRows.map((row, idx) => (
                          <tr key={row.student_id} className="hover:bg-surface-overlay/40">
                            <td className="py-2 px-3 font-mono font-medium text-primary-600 dark:text-primary-400">
                              {row.roll_number}
                            </td>
                            <td className="py-2 px-3 font-medium text-muted-dark dark:text-muted-light">
                              {row.name}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                max={utForm.max_marks || 30}
                                step="0.5"
                                placeholder={`0 - ${utForm.max_marks || 30}`}
                                value={row.marks_obtained}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchUtRows(prev => {
                                    const next = [...prev];
                                    next[idx].marks_obtained = val;
                                    return next;
                                  });
                                }}
                                className="input py-1 px-2.5 text-xs w-28 text-center"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="label text-xs">Select Student *</label>
                    <select
                      value={utForm.student_id}
                      onChange={(e) => setUtForm({ ...utForm, student_id: e.target.value })}
                      className="input text-sm w-full"
                      required
                    >
                      <option value="">Select Student</option>
                      {metadata.students.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.roll_number} - {st.first_name} {st.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label text-xs">Marks Obtained (out of {utForm.max_marks || 30}) *</label>
                    <input
                      type="number"
                      min="0"
                      max={utForm.max_marks || 30}
                      step="0.5"
                      required
                      placeholder="e.g. 24"
                      value={utForm.marks_obtained}
                      onChange={(e) => setUtForm({ ...utForm, marks_obtained: e.target.value })}
                      className="input text-sm w-full"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setUtModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {savingAction ? <LoadingSpinner size="sm" /> : <SaveIcon size={18} />}
                  <span>Save Internal Marks</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ENTER EXTERNAL MARKS (BATCH & SINGLE) */}
      {/* ========================================================================= */}
      {extModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="card w-full max-w-3xl bg-surface border border-surface-border shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-surface-border bg-surface-overlay/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
                  <ExamIcon size={20} />
                </span>
                <div>
                  <h3 className="font-semibold text-lg text-muted-dark dark:text-muted-light">
                    Record Final External Exam Marks
                  </h3>
                  <p className="text-xs text-muted">
                    Final external assessment marks out of 100 per university examination guidelines.
                  </p>
                </div>
              </div>
              <button onClick={() => setExtModalOpen(false)} className="text-muted hover:text-muted-dark dark:hover:text-muted-light">
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveExternalMarks} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="flex items-center justify-between p-2 bg-surface-overlay rounded-xl border border-surface-border">
                <span className="text-xs font-medium text-muted pl-2">Entry Mode:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setExtBatchMode(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      extBatchMode ? 'bg-primary-500 text-white shadow-xs' : 'text-muted hover:text-muted-dark dark:hover:text-muted-light'
                    }`}
                  >
                    Class Batch Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtBatchMode(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      !extBatchMode ? 'bg-primary-500 text-white shadow-xs' : 'text-muted hover:text-muted-dark dark:hover:text-muted-light'
                    }`}
                  >
                    Single Student
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Semester</label>
                  <select
                    value={extForm.semester_id}
                    onChange={(e) => handleExtSemesterChange(e.target.value)}
                    className="input text-xs w-full"
                    required
                  >
                    {metadata.semesters.map(sem => (
                      <option key={sem.id} value={sem.id}>Sem {sem.semester_number} ({sem.course_name})</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="label text-xs">Subject</label>
                  <select
                    value={extForm.subject_id}
                    onChange={(e) => handleExtSubjectChange(e.target.value)}
                    className="input text-xs w-full"
                    required
                  >
                    {metadata.subjects
                      .filter(s => !extForm.semester_id || String(s.semester_id) === String(extForm.semester_id))
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {extBatchMode ? (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-muted pb-1 border-b border-surface-border">
                    <span>Students in this Semester ({batchExtRows.length})</span>
                    <span>Max Marks: <strong>100</strong> (Passing: 40)</span>
                  </div>

                  <div className="border border-surface-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="table w-full text-left text-xs">
                      <thead className="bg-surface-overlay/80 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3">Roll No</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3 w-36">Marks (out of 100)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {batchExtRows.map((row, idx) => (
                          <tr key={row.student_id} className="hover:bg-surface-overlay/40">
                            <td className="py-2 px-3 font-mono font-medium text-primary-600 dark:text-primary-400">
                              {row.roll_number}
                            </td>
                            <td className="py-2 px-3 font-medium text-muted-dark dark:text-muted-light">
                              {row.name}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                placeholder="0 - 100"
                                value={row.marks_obtained}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchExtRows(prev => {
                                    const next = [...prev];
                                    next[idx].marks_obtained = val;
                                    return next;
                                  });
                                }}
                                className="input py-1 px-2.5 text-xs w-28 text-center font-medium"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="label text-xs">Select Student *</label>
                    <select
                      value={extForm.student_id}
                      onChange={(e) => setExtForm({ ...extForm, student_id: e.target.value })}
                      className="input text-sm w-full"
                      required
                    >
                      <option value="">Select Student</option>
                      {metadata.students.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.roll_number} - {st.first_name} {st.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label text-xs">External Marks Obtained (Max 100) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      required
                      placeholder="e.g. 84"
                      value={extForm.marks_obtained}
                      onChange={(e) => setExtForm({ ...extForm, marks_obtained: e.target.value })}
                      className="input text-sm w-full"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setExtModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {savingAction ? <LoadingSpinner size="sm" /> : <SaveIcon size={18} />}
                  <span>Save External Marks</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FULL OFFICIAL GRADE CARD / TRANSCRIPT */}
      {/* ========================================================================= */}
      {gradeCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="card w-full max-w-4xl bg-surface border border-surface-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 border-b border-surface-border bg-surface-overlay/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
                  <ResultIcon size={20} />
                </span>
                <div>
                  <h3 className="font-semibold text-lg text-muted-dark dark:text-muted-light">
                    Official Student Grade Card
                  </h3>
                  <p className="text-xs text-muted">
                    Academic performance transcript, SGPA/CGPA breakdown, and credits ledger
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrintGradeCard}
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                >
                  <DownloadIcon size={15} /> Print / Save PDF
                </button>
                <button onClick={() => setGradeCardModalOpen(false)} className="text-muted hover:text-muted-dark dark:hover:text-muted-light">
                  <XIcon size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-surface-card text-gray-900 dark:text-gray-100">
              {loadingGradeCard ? (
                <div className="py-24 flex justify-center"><LoadingSpinner /></div>
              ) : !selectedStudentGradeCard ? (
                <EmptyState icon={WarningIcon} title="Grade Card Not Found" message="Could not find performance records for this student." />
              ) : (
                <div ref={gradeCardPrintRef} className="space-y-6">
                  {/* College Header */}
                  <div className="text-center border-b-2 border-primary-500 pb-4">
                    <div className="inline-block px-3 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-1">
                      A. D. Patel Institute of Technology
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      OFFICIAL GRADE TRANSCRIPT
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Constituent College of Charutar Vidyamandal (CVM) University • New Vallabh Vidyanagar, Gujarat
                    </p>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Statement of Marks & Grades for {selectedStudentGradeCard.semester?.course_name || 'B.Tech Program'}
                    </div>
                  </div>

                  {/* Student & Program Profile Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-4 rounded-xl bg-gray-50 dark:bg-surface-overlay border border-gray-200 dark:border-surface-border text-xs">
                    <div>
                      <span className="text-gray-400 block">Student Name</span>
                      <strong className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        {selectedStudentGradeCard.student?.first_name} {selectedStudentGradeCard.student?.last_name}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Enrollment / Roll No</span>
                      <strong className="text-sm font-mono font-bold text-primary-600 dark:text-primary-400">
                        {selectedStudentGradeCard.student?.roll_number}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Department</span>
                      <strong className="font-semibold text-gray-800 dark:text-gray-200">
                        {selectedStudentGradeCard.student?.department_name || 'Engineering'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Semester & Batch</span>
                      <strong className="font-semibold text-gray-800 dark:text-gray-200">
                        Semester {selectedStudentGradeCard.semester?.semester_number} ({selectedStudentGradeCard.student?.batch || '2024-2028'})
                      </strong>
                    </div>
                  </div>

                  {/* Subjects & Grade Breakdown Table */}
                  <div className="border border-gray-200 dark:border-surface-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-surface-overlay text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-surface-border uppercase tracking-wider">
                          <th className="py-2.5 px-3">Subject Code</th>
                          <th className="py-2.5 px-3">Course / Subject Title</th>
                          <th className="py-2.5 px-3 text-center">Credits</th>
                          <th className="py-2.5 px-3 text-center">Internal (30)</th>
                          <th className="py-2.5 px-3 text-center">External (100)</th>
                          <th className="py-2.5 px-3 text-center">Total (130)</th>
                          <th className="py-2.5 px-3 text-center">Grade</th>
                          <th className="py-2.5 px-3 text-center">Grade Point</th>
                          <th className="py-2.5 px-3 text-center">Earned Credits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-surface-border font-medium">
                        {selectedStudentGradeCard.subjects?.map((sub) => (
                          <tr key={sub.subject_id} className="hover:bg-gray-50/50 dark:hover:bg-surface-overlay/20">
                            <td className="py-2.5 px-3 font-mono font-bold text-primary-600 dark:text-primary-400">
                              {sub.code}
                            </td>
                            <td className="py-2.5 px-3 text-gray-800 dark:text-gray-200 font-semibold">
                              {sub.name}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {sub.credits}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {sub.internal_obtained ?? 0}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {sub.external_obtained ?? 0}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {sub.total_obtained ?? 0}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                sub.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {sub.grade}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {sub.grade_point}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-800 dark:text-gray-200">
                              {sub.credits_earned}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & SGPA / CGPA Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-blue-50/70 dark:bg-surface-overlay border border-blue-200 dark:border-surface-border text-center">
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase font-medium">Credits Registered</div>
                      <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                        {selectedStudentGradeCard.result?.total_credits || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase font-medium">Credits Earned</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedStudentGradeCard.result?.earned_credits || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase font-medium">Semester SGPA</div>
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 font-mono">
                        {Number(selectedStudentGradeCard.result?.sgpa || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase font-medium">Cumulative CGPA</div>
                      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        {Number(selectedStudentGradeCard.result?.cgpa || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase font-medium">Result Status</div>
                      <div className={`text-lg font-bold uppercase mt-0.5 ${
                        selectedStudentGradeCard.result?.status === 'pass' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedStudentGradeCard.result?.status?.toUpperCase() || 'PASS'}
                      </div>
                    </div>
                  </div>

                  {/* Transcript Signatures & Seals */}
                  <div className="pt-8 border-t border-gray-200 dark:border-surface-border flex items-center justify-between text-xs text-gray-500">
                    <div className="text-center">
                      <div className="border-t border-gray-400 w-44 pt-1 font-semibold text-gray-700 dark:text-gray-300">
                        Prepared & Verified by
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Examination Cell</div>
                    </div>

                    <div className="text-center">
                      <div className="border-t border-gray-400 w-44 pt-1 font-semibold text-gray-700 dark:text-gray-300">
                        Controller of Examinations
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">CVM University</div>
                    </div>

                    <div className="text-center">
                      <div className="border-t border-gray-400 w-44 pt-1 font-semibold text-gray-700 dark:text-gray-300">
                        Principal / Dean
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">ADIT Institute</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: BATCH PUBLISH RESULTS */}
      {/* ========================================================================= */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="card w-full max-w-md bg-surface border border-surface-border shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-surface-border bg-surface-overlay/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-500">
                  <ResultIcon size={20} />
                </span>
                <h3 className="font-semibold text-lg text-muted-dark dark:text-muted-light">
                  Batch Compute & Publish Results
                </h3>
              </div>
              <button onClick={() => setPublishModalOpen(false)} className="text-muted hover:text-muted-dark dark:hover:text-muted-light">
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handlePublishResultsSubmit} className="p-6 space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                This process evaluates best internal unit tests and external marks for all enrolled students in the selected semester, calculates real credit-weighted SGPA & cumulative CGPA, and publishes the official grade cards.
              </p>

              <div>
                <label className="label text-xs">Select Semester to Evaluate & Publish *</label>
                <select
                  value={publishSemesterId}
                  onChange={(e) => setPublishSemesterId(e.target.value)}
                  className="input text-sm w-full"
                  required
                >
                  <option value="">Choose Semester...</option>
                  {metadata.semesters.map(sem => (
                    <option key={sem.id} value={sem.id}>
                      Semester {sem.semester_number} ({sem.course_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
                Students will immediately be able to see their updated grade cards in their student portal once published.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {publishing ? <LoadingSpinner size="sm" /> : <ResultIcon size={18} />}
                  <span>{publishing ? 'Publishing...' : 'Publish Results Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="card w-full max-w-sm bg-surface border border-surface-border shadow-2xl rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <TrashIcon size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-muted-dark dark:text-muted-light">Confirm Deletion</h3>
              <p className="text-xs text-muted mt-1">
                Are you sure you want to permanently delete <strong>{deleteConfirm.title}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={savingAction}
                className="btn btn-danger"
              >
                {savingAction ? <LoadingSpinner size="sm" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

