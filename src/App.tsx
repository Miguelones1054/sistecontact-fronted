import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Login from './components/Login/Login'
import AppShell from './components/AppShell/AppShell'
import Search from './components/Search/Search'
import ProspectsPage from './components/ProspectsPage/ProspectsPage'
import VisitsPage from './components/VisitsPage/VisitsPage'
import ContactedPage from './components/ContactedPage/ContactedPage'

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
            <Route path="/prospectos" element={<ProspectsPage />} />
            <Route path="/visitas" element={<VisitsPage />} />
            <Route path="/por-visitar" element={<Navigate to="/visitas" replace />} />
            <Route path="/contactados" element={<ContactedPage />} />
            <Route path="/visitados" element={<Navigate to="/contactados" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
