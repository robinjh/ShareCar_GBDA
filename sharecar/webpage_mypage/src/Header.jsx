import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "./UserContext";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import AuthForm from "./components/auth/AuthForm"; 
import MyPage from "./components/mypage/MyPage"; 
import "./styles/Header.css";

function Header({ isDarkMode, toggleMode }) {
  const { user } = useContext(UserContext);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMyPageModal, setShowMyPageModal] = useState(false);

  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
    }
    if (!user && showMyPageModal) {
      setShowMyPageModal(false);
    }
  }, [user, showAuthModal, showMyPageModal]);
  

  return (
    <header className="header">
      <span className="header-title">ShareCar 프로젝트</span>
      <div className="header-actions">
        {user ? (
          <>
            <span className="header-user">
              {user.displayName || user.email}님 환영합니다
            </span>

            <button
              className="header-mypage-btn" onClick={() => {
                setShowMyPageModal(true);
              }}
            >
              마이페이지
            </button>

            <button className="header-logout-btn" onClick={() => signOut(auth)}>
              로그아웃
            </button>
          </>
        ) : (
          <>
            <button className="header-login-btn" onClick={() => setShowAuthModal(true)}>
              로그인 / 회원가입
            </button>
          </>
        )}
        <button className="btn" onClick={toggleMode}>
          {isDarkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* 모달 창으로 로그인/회원가입 폼 렌더링 */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 32, minWidth: 370, maxWidth: 500 }}
          >
            <button className="close-button" onClick={() => setShowAuthModal(false)}>
              ×
            </button>
            <AuthForm />
          </div>
        </div>
      )}

       {showMyPageModal && ( 
        <div className="modal-overlay" onClick={() => setShowMyPageModal(false)}> 
          <div
            className="modal" 
            onClick={(e) => e.stopPropagation()} 
            style={{ padding: 20, width: '90%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button className="close-button" onClick={() => setShowMyPageModal(false)}> 
              ×
            </button>
            <MyPage user={user} toggleMode={toggleMode} /> 
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
