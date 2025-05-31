import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserContext } from '../UserContext';
import '../styles/Header.css';

const Header = ({ isDarkMode, toggleDarkMode }) => {
  const { currentUser, logout } = useAuth();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <header className="header">
      <span className="header-title">ShareCar 프로젝트</span>
      <div className="header-actions">
        {currentUser && (
          <>
            <span className="header-user">
              {user?.displayName || '사용자'}
            </span>
            <button className="header-logout-btn" onClick={handleLogout}>
              로그아웃
            </button>
          </>
        )}
        <button className="btn" onClick={toggleDarkMode}>
          {isDarkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>
    </header>
  );
};

export default Header; 