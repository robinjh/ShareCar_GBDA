import React, { useState, useEffect, useContext } from "react";
import { UserProvider, UserContext } from "./UserContext";
import Header from "./Header";
import AuthForm from "./components/auth/AuthForm";
import MyPage from "./components/mypage/MyPage";
import PlaceRecommendation from "./components/recomendation/PlaceRecommendation";
import "./App.css";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import Modal from "./components/mypage/Modal";

function AppContent({ toggleMode }) {
  const { user } = useContext(UserContext);
  const [showMyPage, setShowMyPage] = useState(false);

  if (!user) {
    return <AuthForm />;
  }

  // 이메일 미인증 상태 안내 및 로그아웃만
  if (!user.emailVerified) {
    return (
      <div className="auth-box">
        <h3>Welcome, {user.displayName || user.email}!</h3>
        <div className="auth-warn">
          이메일 인증 후 모든 기능을 사용할 수 있습니다.
          <br />
          <small style={{ color: "#888", fontSize: "0.97em" }}>
            인증 완료 후 <b>‘인증 상태 새로고침’</b>을 누르거나,
            <br />
            반영이 안 될 경우 <b>브라우저 새로고침(F5)</b>을 해주세요.
          </small>
        </div>
        <div className="auth-action-group">
          <button
            onClick={() => {
              if (auth.currentUser) {
                auth.currentUser.reload().then(() => {
                  setTimeout(() => window.location.reload(), 1200); // 1.2초 후 새로고침
                });
              } else {
                alert("로그인 상태가 아닙니다. 다시 로그인해 주세요.");
                window.location.reload();
              }
            }}
          >
            인증 상태 새로고침
          </button>
          <button onClick={() => signOut(auth)}>로그아웃</button>
        </div>
      </div>
    );
  }

  // 인증 완료된 경우에만 서비스 UI 노출
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        minHeight: "calc(100vh - 65px)",
      }}
    >
      {/* 마이페이지 열기 버튼 */}
      <button
        onClick={() => setShowMyPage(true)}
        style={{
          margin: "1rem",
          padding: "0.5rem 1rem",
          border: "1px solid var(--color-border)",
          borderRadius: "6px",
        }}
      >
        마이페이지 열기
      </button>

      {/* 추천 장소 메인 화면 */}
      <div style={{ flex: 1, width: "100%" }}>
        <PlaceRecommendation user={user} />
      </div>

      {/* 모달로 마이페이지 표시 */}
      {showMyPage && (
        <Modal
          isOpen={true}
          onClose={() => setShowMyPage(false)}
        >
          <MyPage toggleMode={toggleMode} user={user} />
        </Modal>
      )}
    </div>
  );
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("darkMode");
    return savedMode ? JSON.parse(savedMode) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleMode = () => setIsDarkMode((prev) => !prev);

  return (
    <UserProvider>
      <div className={isDarkMode ? "dark" : "light"}>
        <Header isDarkMode={isDarkMode} toggleMode={toggleMode} />
        <AppContent toggleMode={toggleMode} />
      </div>
    </UserProvider>
  );
}

export default App;
