import React, { useState, useEffect } from 'react';
import MyPage from './components/MyPage';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <div className={isDarkMode ? 'dark' : 'light'}>
      <MyPage isDarkMode={isDarkMode} toggleMode={toggleMode} />
    </div>
  );
}

export default App;