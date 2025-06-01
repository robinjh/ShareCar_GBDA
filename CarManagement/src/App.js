import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Rental from './components/rental/Rental';
import Registration from './components/registration/Registration';
import PlaceRecommendation from './components/recommendation/PlaceRecommendation';
import AuthForm from './components/auth/AuthForm';
import { UserContext, UserProvider } from './UserContext';
import './App.css';

// 보호된 라우트 컴포넌트
function ProtectedRoute({ children }) {
  const { user } = React.useContext(UserContext);
  const location = useLocation();
  
  if (!user) {
    // 로그인되지 않은 경우 로그인 페이지로 리다이렉트하고 현재 경로를 state로 전달
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

// 로그인 페이지 리다이렉트 컴포넌트
function LoginRedirect() {
  const { user } = React.useContext(UserContext);
  const location = useLocation();
  
  // 이미 로그인된 경우
  if (user) {
    // 이전에 가려던 페이지가 있으면 그 페이지로, 없으면 차량 대여 페이지로
    const from = location.state?.from || '/rental';
    return <Navigate to={from} replace />;
  }
  
  return <AuthForm />;
}

// 메인 앱 컴포넌트를 UserProvider로 감싸는 컴포넌트
function AppContent() {
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e) => {
      setIsDarkMode(e.matches);
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    
    // 초기 테마 설정
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    
    mediaQuery.addEventListener('change', handleDarkModeChange);
    return () => mediaQuery.removeEventListener('change', handleDarkModeChange);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    document.documentElement.setAttribute('data-theme', newDarkMode ? 'dark' : 'light');
  };

  return (
    <div className="app">
      <Header isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/rental" replace />} />
          <Route 
            path="/rental" 
            element={
              <ProtectedRoute>
                <Rental isDarkMode={isDarkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/registration" 
            element={
              <ProtectedRoute>
                <Registration isDarkMode={isDarkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/recommendation" 
            element={
              <ProtectedRoute>
                <PlaceRecommendation isDarkMode={isDarkMode} />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<LoginRedirect />} />
        </Routes>
      </main>
    </div>
  );
}

// 최상위 App 컴포넌트
function App() {
  return (
    <Router>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </Router>
  );
}

export default App; 