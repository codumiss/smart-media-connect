import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { GuestOnly, RequireAdmin, RequireAuth } from './components/auth/guards'
import { AppLayout } from './components/layout/AppLayout'
import { AdminAlertsProvider } from './lib/adminAlerts'
import { AuthProvider } from './lib/auth'
import AdminHomePage from './pages/admin/AdminHomePage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminMembersPage from './pages/admin/AdminMembersPage'
import AdminNoticesPage from './pages/admin/AdminNoticesPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ChatPage from './pages/chat/ChatPage'
import CommunityPage from './pages/community/CommunityPage'
import ContestPage from './pages/contest/ContestPage'
import HomePage from './pages/home/HomePage'
import MorePage from './pages/MorePage'
import MyPage from './pages/mypage/MyPage'
import NotFoundPage from './pages/NotFoundPage'
import NoticePage from './pages/notice/NoticePage'
import TeamRoomPage from './pages/team/TeamRoomPage'
import WelcomePage from './pages/welcome/WelcomePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAlertsProvider>
          <Routes>
            {/* 로그인 전 */}
            <Route path="welcome" element={<GuestOnly><WelcomePage /></GuestOnly>} />
            <Route path="login" element={<GuestOnly><LoginPage /></GuestOnly>} />
            <Route path="signup" element={<GuestOnly><SignupPage /></GuestOnly>} />

            {/* 관리자 전용 (별도 레이아웃) */}
            <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminHomePage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="members" element={<AdminMembersPage />} />
              <Route path="notices" element={<AdminNoticesPage />} />
            </Route>

            {/* 로그인한 학과 구성원 */}
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route index element={<HomePage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="notice" element={<NoticePage />} />
              <Route path="community" element={<CommunityPage />} />
              <Route path="team" element={<TeamRoomPage />} />
              <Route path="contest" element={<ContestPage />} />
              <Route path="mypage" element={<MyPage />} />
              <Route path="more" element={<MorePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AdminAlertsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
