import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProvider } from './UserContext';
import Header from './components/Header';
import AuthForm from './components/auth/AuthForm';
import './styles/Common.css';
import CarRent from './pages/CarRent';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './App.css';
import PlaceRecommendationPage from './pages/PlaceRecommendationPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function AppContent() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className={isDarkMode ? 'dark' : 'light'}>
          <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
          <Routes>
            <Route path="/login" element={<AuthForm />} />
            <Route path="/" element={<PrivateRoute><CarRent /></PrivateRoute>} />
            <Route path="/place-recommendation" element={<PrivateRoute><PlaceRecommendationPage /></PrivateRoute>} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
