import React, { useEffect, useState } from 'react';
import MyPage from './components/MyPage';
function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className={isDarkMode ? 'dark' : 'light'}>
      <MyPage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
    </div>
  );
}
export default App;