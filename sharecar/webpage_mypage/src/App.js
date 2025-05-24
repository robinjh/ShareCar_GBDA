import React, { useState, useEffect, useContext } from "react";
import { UserProvider, UserContext } from "./UserContext";
import Header from "./Header"; // 헤더 컴포넌트 import
import AuthForm from "./components/auth/AuthForm";
import MyPage from "./components/mypage/MyPage";
import PlaceRecommendation from "./components/recomendation/PlaceRecommendation";

function AppContent({ isDarkMode, toggleMode }) {
  const user = useContext(UserContext);

  return (
    <div className={isDarkMode ? "dark" : "light"}>
      {!user ? (
        <AuthForm />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            minHeight: "calc(100vh - 65px)", // 헤더 높이만큼 빼기
            background: isDarkMode ? "#181829" : "#fff",
          }}
        >
          <div style={{ flex: "0 0 370px", borderRight: "1px solid #ececec", minHeight: "100%" }}>
            <MyPage isDarkMode={isDarkMode} toggleMode={toggleMode} user={user} />
          </div>
          <div style={{ flex: 1 }}>
            <PlaceRecommendation isDarkMode={isDarkMode} user={user} />
          </div>
        </div>
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
      <Header isDarkMode={isDarkMode} toggleMode={toggleMode} />
      <AppContent isDarkMode={isDarkMode} toggleMode={toggleMode} />
    </UserProvider>
  );
}

export default App;