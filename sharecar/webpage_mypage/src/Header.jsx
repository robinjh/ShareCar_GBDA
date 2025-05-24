import React, { useContext } from "react";
import { UserContext } from "./UserContext";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import "./styles/Header.css";

function Header({ isDarkMode, toggleMode }) {
  const user = useContext(UserContext);

  return (
    <header className="header">
      <span className="header-title">ShareCar 프로젝트</span>
      <div className="header-actions">
        {user && (
          <>
            <span className="header-user">
              {user.displayName || user.email}
            </span>
            <button
              className="header-logout-btn"
              onClick={() => signOut(auth)}
            >
              로그아웃
            </button>
          </>
        )}
        <button className="btn" onClick={toggleMode}>
          {isDarkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </header>
  );
}

export default Header;