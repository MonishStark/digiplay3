import { Route, Routes, Outlet } from 'react-router-dom'
import { ChatHistories } from './components/ChatHistories'

const ChatPage = () => {
  return (
    <Routes>
      <Route element={<Outlet />}>
        <Route index element={<ChatHistories />} />
      </Route>
    </Routes>
  )
}

export default ChatPage
