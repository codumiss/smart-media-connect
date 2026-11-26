import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import AdminPage from './pages/admin/AdminPage'
import ChatPage from './pages/chat/ChatPage'
import CommunityPage from './pages/community/CommunityPage'
import ContestPage from './pages/contest/ContestPage'
import HomePage from './pages/home/HomePage'
import MorePage from './pages/MorePage'
import MyPage from './pages/mypage/MyPage'
import NotFoundPage from './pages/NotFoundPage'
import NoticePage from './pages/notice/NoticePage'
import TeamRoomPage from './pages/team/TeamRoomPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="notice" element={<NoticePage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="team" element={<TeamRoomPage />} />
          <Route path="contest" element={<ContestPage />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
