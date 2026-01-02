import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import LandingPage from './landingPage/LandingPage'
import UploadPage from './uploadPage/UploadPage'
import Login from './loginPage/Login'
import SignUp from './loginPage/SignUp'
import LiveSttPage from './liveStt/LiveSttPage'
import Layout from './layout/Layout'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/live" element={<LiveSttPage />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
