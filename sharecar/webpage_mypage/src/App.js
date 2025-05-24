import React, { useState, useEffect, useContext } from "react";
import { UserProvider, UserContext } from "./UserContext";
import Header from "./Header";
import AuthForm from "./components/auth/AuthForm";
import MyPage from "./components/mypage/MyPage";
import PlaceRecommendation from "./components/recomendation/PlaceRecommendation";

function AppContent({ toggleMode }) {
  const user = useContext(UserContext);

  return (
    !user ? (
      <AuthForm />
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          minHeight: "calc(100vh - 65px)", // 헤더 높이 빼기
        }}
      >
        <div style={{ flex: "0 0 370px", borderRight: "1px solid var(--color-border)", minHeight: "100%" }}>
          <MyPage toggleMode={toggleMode} user={user} />
        </div>
        <div style={{ flex: 1 }}>
          <PlaceRecommendation user={user} />
        </div>
      </div>
    )
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