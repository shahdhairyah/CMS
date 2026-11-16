import { lazy, Suspense } from 'react';
import LoadingSpinner from './components/common/LoadingSpinner';
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminDepartments = lazy(() => import('./pages/admin/AdminDepartments'));
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentAttendance = lazy(() => import('./pages/student/StudentAttendance'));
const StudentAssignments = lazy(() => import('./pages/student/StudentAssignments'));
const StudentAssignmentDetail = lazy(() => import('./pages/student/StudentAssignmentDetail'));
const StudentNotices = lazy(() => import('./pages/student/StudentNotices'));
const StudentLeave = lazy(() => import('./pages/student/StudentLeave'));
const StudentResults = lazy(() => import('./pages/student/StudentResults'));
const StudentSyllabus = lazy(() => import('./pages/student/StudentSyllabus'));
const StudentLabManualList = lazy(() => import('./pages/student/StudentLabManualList'));
const StudentLabManualDetail = lazy(() => import('./pages/student/StudentLabManualDetail'));
const StudentLabManualStatus = lazy(() => import('./pages/student/StudentLabManualStatus'));
const StudentTimetable = lazy(() => import('./pages/student/StudentTimetable'));
const StudentFees = lazy(() => import('./pages/student/StudentFees'));
const LibrarianDashboard = lazy(() => import('./pages/librarian/LibrarianDashboard'));
const AdminLibrary = lazy(() => import('./pages/admin/AdminLibrary'));
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'));
const StudentLibrary = lazy(() => import('./pages/student/StudentLibrary'));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));
const FacultyDashboard = lazy(() => import('./pages/faculty/FacultyDashboard'));
const FacultyAttendance = lazy(() => import('./pages/faculty/FacultyAttendance'));
const FacultyAssignments = lazy(() => import('./pages/faculty/FacultyAssignments'));
const FacultyMaterials = lazy(() => import('./pages/faculty/FacultyMaterials'));
const FacultyMarks = lazy(() => import('./pages/faculty/FacultyMarks'));
const FacultyNotices = lazy(() => import('./pages/faculty/FacultyNotices'));
const FacultyAttendanceReports = lazy(() => import('./pages/faculty/FacultyAttendanceReports'));
const FacultyAnnouncements = lazy(() => import('./pages/faculty/FacultyAnnouncements'));
const FacultyLabManuals = lazy(() => import('./pages/faculty/FacultyLabManuals'));
const FacultyLeave = lazy(() => import('./pages/faculty/FacultyLeave'));
const FacultyProfile = lazy(() => import('./pages/faculty/FacultyProfile'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminFees = lazy(() => import('./pages/admin/AdminFees'));
const AdminTimetable = lazy(() => import('./pages/admin/AdminTimetable'));
const AdminFaculty = lazy(() => import('./pages/admin/AdminFaculty'));
const HODDashboard = lazy(() => import('./pages/hod/HODDashboard'));
const HODStudents = lazy(() => import('./pages/hod/HODStudents'));
const HODFaculty = lazy(() => import('./pages/hod/HODFaculty'));
const HODSubjects = lazy(() => import('./pages/hod/HODSubjects'));
const HODFeeReport = lazy(() => import('./pages/hod/HODFeeReport'));
const HODLeave = lazy(() => import('./pages/hod/HODLeave'));
const HODClassrooms = lazy(() => import('./pages/hod/HODClassrooms'));
const HODTimetable = lazy(() => import('./pages/hod/HODTimetable'));
const HODReports = lazy(() => import('./pages/hod/HODReports'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminExams = lazy(() => import('./pages/admin/AdminExams'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner text="Loading page..." />}><Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* Reachable while authenticated by any role: AuthMiddleware allows
                /auth/change-password even for an account that must still
                replace its provisioning password. */}
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/" element={<HomePage />} />

            {/* ========== ADMIN ROUTES ========== */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminStudents /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/faculty" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFaculty /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminDepartments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFees /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/timetable" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminTimetable /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/exams" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminExams /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/notices" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><FacultyNotices /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/library" element={<ProtectedRoute allowedRoles={['admin', 'librarian']}><DashboardLayout><AdminLibrary /></DashboardLayout></ProtectedRoute>} />
            <Route path="/librarian/dashboard" element={<ProtectedRoute allowedRoles={['librarian', 'admin']}><DashboardLayout><LibrarianDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/librarian/library" element={<ProtectedRoute allowedRoles={['admin', 'librarian']}><DashboardLayout><AdminLibrary /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminReports /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminSettings /></DashboardLayout></ProtectedRoute>} />

            {/* ========== HOD ROUTES ========== */}
            <Route path="/hod/dashboard" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/students" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODStudents /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/faculty" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODFaculty /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/subjects" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODSubjects /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/classrooms" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODClassrooms /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/fees" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODFeeReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/timetable" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODTimetable /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/leave" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODLeave /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/reports" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODReports /></DashboardLayout></ProtectedRoute>} />

            {/* ========== FACULTY ROUTES ========== */}
            <Route path="/faculty" element={<ProtectedRoute allowedRoles={['faculty']}><Navigate to="/faculty/dashboard" replace /></ProtectedRoute>} />
            <Route path="/faculty/dashboard" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/attendance" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyAttendance /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/assignments" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyAssignments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/marks" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyMarks /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/materials" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyMaterials /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/lab-manuals" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyLabManuals /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/attendance-reports" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyAttendanceReports /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/announcements" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyAnnouncements /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/notices" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyNotices /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/leave" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyLeave /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/profile" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyProfile /></DashboardLayout></ProtectedRoute>} />

            {/* ========== STUDENT ROUTES ========== */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentAttendance /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentAssignments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/assignments/:id" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentAssignmentDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentTimetable /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/fees" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentFees /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/results" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentResults /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/notices" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentNotices /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/syllabus" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentSyllabus /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/lab-manuals" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLabManualList /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/lab-manuals/status" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLabManualStatus /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/lab-manuals/:id" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLabManualDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/library" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLibrary /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/leave" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLeave /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentProfile /></DashboardLayout></ProtectedRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes></Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
