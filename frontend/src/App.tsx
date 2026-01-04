import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import LandingPage from './landingPage/LandingPage'
import UploadPage from './uploadPage/UploadPage'
import Login from './loginPage/Login'
import SignUp from './loginPage/SignUp'
import LiveSttPage from './liveStt/LiveSttPage'
import HistoryPage from './historyPage/HistoryPage'
import Layout from './layout/Layout'
import { MeetingProvider } from './context/MeetingContext'

function App() {

  return (
    <MeetingProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/live" element={<LiveSttPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MeetingProvider>
  )
}

export default App
