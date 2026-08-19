import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireAuth, RequireAdmin } from './components/RouteGuards'

import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import SubjectPage from './pages/SubjectPage'
import TopicPage from './pages/TopicPage'
import LessonPage from './pages/LessonPage'
import UnlockSubject from './pages/UnlockSubject'
import Quizzes from './pages/Quizzes'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminSubjectForm from './pages/admin/AdminSubjectForm'
import AdminTopicForm from './pages/admin/AdminTopicForm'
import AdminLessonEditor from './pages/admin/AdminLessonEditor'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/quizzes" element={<RequireAuth><Quizzes /></RequireAuth>} />
        <Route path="/subjects/:subjectSlug" element={<RequireAuth><SubjectPage /></RequireAuth>} />
        <Route path="/subjects/:subjectSlug/unlock" element={<RequireAuth><UnlockSubject /></RequireAuth>} />
        <Route path="/subjects/:subjectSlug/:topicSlug" element={<RequireAuth><TopicPage /></RequireAuth>} />
        <Route path="/subjects/:subjectSlug/:topicSlug/:lessonSlug" element={<RequireAuth><LessonPage /></RequireAuth>} />

        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/subjects/new" element={<RequireAdmin><AdminSubjectForm /></RequireAdmin>} />
        <Route path="/admin/topics/new" element={<RequireAdmin><AdminTopicForm /></RequireAdmin>} />
        <Route path="/admin/lessons/new" element={<RequireAdmin><AdminLessonEditor /></RequireAdmin>} />
      </Routes>
    </Layout>
  )
}
