import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import AppLayout from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import TeacherDashboard from '@/pages/teacher/Dashboard';
import Sources from '@/pages/teacher/Sources';
import Generate from '@/pages/teacher/Generate';
import QuestionBank from '@/pages/teacher/QuestionBank';
import Tests from '@/pages/teacher/Tests';
import TestEditor from '@/pages/teacher/TestEditor';
import Groups from '@/pages/teacher/Groups';
import Assignments from '@/pages/teacher/Assignments';
import Analytics from '@/pages/teacher/Analytics';
import AssignmentAnalytics from '@/pages/teacher/AssignmentAnalytics';

import StudentDashboard from '@/pages/student/Dashboard';
import StudentGroups from '@/pages/student/Groups';
import TakeQuiz from '@/pages/student/TakeQuiz';
import Result from '@/pages/student/Result';
import History from '@/pages/student/History';
import Progress from '@/pages/student/Progress';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute role="TEACHER"><AppLayout /></ProtectedRoute>}>
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/sources" element={<Sources />} />
            <Route path="/teacher/generate" element={<Generate />} />
            <Route path="/teacher/questions" element={<QuestionBank />} />
            <Route path="/teacher/tests" element={<Tests />} />
            <Route path="/teacher/tests/:id" element={<TestEditor />} />
            <Route path="/teacher/groups" element={<Groups />} />
            <Route path="/teacher/assignments" element={<Assignments />} />
            <Route path="/teacher/analytics" element={<Analytics />} />
            <Route path="/teacher/analytics/assignments/:id" element={<AssignmentAnalytics />} />
            <Route path="/teacher/profile" element={<Profile />} />
          </Route>

          <Route element={<ProtectedRoute role="STUDENT"><AppLayout /></ProtectedRoute>}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/groups" element={<StudentGroups />} />
            <Route path="/student/take/:assignmentId" element={<TakeQuiz />} />
            <Route path="/student/result/:attemptId" element={<Result />} />
            <Route path="/student/history" element={<History />} />
            <Route path="/student/progress" element={<Progress />} />
            <Route path="/student/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>,
);
