import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Login from './components/Login/Login'
import AppShell from './components/AppShell/AppShell'
import Search from './components/Search/Search'
import ToVisitPage from './components/ToVisitPage/ToVisitPage'
import VisitedPage from './components/VisitedPage/VisitedPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Search />} />
            <Route path="/por-visitar" element={<ToVisitPage />} />
            <Route path="/visitados" element={<VisitedPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
