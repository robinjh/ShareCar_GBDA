import React, { useState, useEffect, useContext } from "react";
import { UserProvider, UserContext } from "./UserContext";
import AuthForm from "./components/auth/AuthForm";
import MyPage from "./components/mypage/MyPage";
import PlaceRecommendation from "./components/recomendation/PlaceRecommendation";

function AppContent({ isDarkMode, toggleMode }) {
  // UserContext에서 로그인 상태 받아오기
  const user = useContext(UserContext);
  return (
    <div className={isDarkMode ? "dark" : "light"}>
      {!user ? (
        <AuthForm />
      ) : (
        <>
          <MyPage isDarkMode={isDarkMode} toggleMode={toggleMode} user={user} />
          <div>
            <PlaceRecommendation isDarkMode={isDarkMode} user={user} />
          </div>
        </>
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
      <AppContent isDarkMode={isDarkMode} toggleMode={toggleMode} />
    </UserProvider>
  );
}

export default App;
