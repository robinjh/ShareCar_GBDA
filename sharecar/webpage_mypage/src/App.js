import React, { useState, useEffect } from "react";
import MyPage from "./components/mypage/MyPage";
import PlaceRecommendation from "./components/recomendation/PlaceRecommendation";

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("darkMode");
    return savedMode ? JSON.parse(savedMode) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <div className={isDarkMode ? "dark" : "light"}>
      <MyPage isDarkMode={isDarkMode} toggleMode={toggleMode} />
      <div>
        <PlaceRecommendation isDarkMode={isDarkMode}
                address={"서울 종로구 세종대로 1"}
        tags={["#비즈니스", "#친구들과 함께"]} />

      </div>
    </div>
  );
}

export default App;
