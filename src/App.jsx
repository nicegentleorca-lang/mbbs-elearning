import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ProtectedRoute, AdminRoute } from './components/RouteGuards'

import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import SubjectPage from './pages/SubjectPage'
import TopicPage from './pages/TopicPage'
import LessonPage from './pages/LessonPage'
import UnlockSubject from './pages/UnlockSubject'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminManage from './pages/admin/AdminManage'
import AdminSubjectForm from './pages/admin/AdminSubjectForm'
import AdminTopicForm from './pages/admin/AdminTopicForm'
import AdminLessonEditor from './pages/admin/AdminLessonEditor'
import AdminQuizEditor from './pages/admin/AdminQuizEditor'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/subjects/:subjectSlug" element={<SubjectPage />} />
        <Route path="/subjects/:subjectSlug/unlock" element={<UnlockSubject />} />
        <Route path="/subjects/:subjectSlug/:topicSlug" element={<TopicPage />} />
        <Route path="/subjects/:subjectSlug/:topicSlug/:lessonSlug" element={<LessonPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/manage" element={<AdminRoute><AdminManage /></AdminRoute>} />
        <Route path="/admin/subjects/new" element={<AdminRoute><AdminSubjectForm /></AdminRoute>} />
        <Route path="/admin/subjects/:id/edit" element={<AdminRoute><AdminSubjectForm /></AdminRoute>} />
        <Route path="/admin/topics/new" element={<AdminRoute><AdminTopicForm /></AdminRoute>} />
        <Route path="/admin/topics/:id/edit" element={<AdminRoute><AdminTopicForm /></AdminRoute>} />
        <Route path="/admin/lessons/new" element={<AdminRoute><AdminLessonEditor /></AdminRoute>} />
        <Route path="/admin/lessons/:id/edit" element={<AdminRoute><AdminLessonEditor /></AdminRoute>} />
        <Route path="/admin/quiz/new" element={<AdminRoute><AdminQuizEditor /></AdminRoute>} />
      </Route>
    </Routes>
  )
}
