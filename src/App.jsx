import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { ProtectedRoute, AdminRoute } from './components/RouteGuards'

// Synchronous core pages
import Login from './pages/Login'
import Signup from './pages/Signup'

// Lazy-loaded routes for optimized dynamic loading
const Dashboard = lazy(() => import('./pages/Dashboard'))
const SubjectPage = lazy(() => import('./pages/SubjectPage'))
const TopicPage = lazy(() => import('./pages/TopicPage'))
const LessonPage = lazy(() => import('./pages/LessonPage'))
const UnlockSubject = lazy(() => import('./pages/UnlockSubject'))

// Quiz Pages
const Quizzes = lazy(() => import('./pages/Quizzes'))
const QuizView = lazy(() => import('./pages/QuizView'))
const QuizHistory = lazy(() => import('./pages/QuizHistory'))

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminManage = lazy(() => import('./pages/admin/AdminManage'))
const AdminSubjectForm = lazy(() => import('./pages/admin/AdminSubjectForm'))
const AdminTopicForm = lazy(() => import('./pages/admin/AdminTopicForm'))
const AdminLessonEditor = lazy(() => import('./pages/admin/AdminLessonEditor'))
const AdminQuizEditor = lazy(() => import('./pages/admin/AdminQuizEditor'))

function PageFallbackLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
      <div className="w-8 h-8 border-3 border-venous border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono text-slate tracking-wider uppercase">Loading page...</span>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallbackLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            
            {/* Quiz Routes */}
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/history" element={<QuizHistory />} />
            <Route path="/quiz/:quizId" element={<QuizView />} />

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
            <Route path="/admin/quizzes/:quizId/edit" element={<AdminRoute><AdminQuizEditor /></AdminRoute>} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
