// src/Header.js
import React, { useContext } from "react";
import { UserContext } from "./UserContext";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

function Header({ isDarkMode, toggleMode }) {
  const user = useContext(UserContext);

  return (
    <header style={{
      width: "100%",
      background: isDarkMode ? "#24243b" : "#f3f3fa",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "13px 24px",
      borderBottom: isDarkMode ? "1px solid #222" : "1px solid #e6e7ec",
      fontWeight: 600,
      fontSize: "1.05rem",
    }}>
      <span>ShareCar 프로젝트</span>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* 나중에 계정정보/로그아웃/모드변경 등 추가 */}
      </div>
    </header>
  );
}

export default Header;
