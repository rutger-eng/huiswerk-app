import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ParentDashboard from './components/parent/ParentDashboard';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import HomeworkForm from './components/HomeworkForm';
import TextParser from './components/TextParser';
import { authApi } from './services/api';

// Auth Context
export const AuthContext = React.createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/" />}
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={user ? <ParentDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/student/:id"
            element={user ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/student/:id/calendar"
            element={user ? <Calendar /> : <Navigate to="/login" />}
          />
          <Route
            path="/student/:id/add"
            element={user ? <HomeworkForm /> : <Navigate to="/login" />}
          />
          <Route
            path="/student/:id/parse"
            element={user ? <TextParser /> : <Navigate to="/login" />}
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
