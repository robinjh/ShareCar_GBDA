import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CarRegistration from './components/CarRegistration';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CarRegistration />} />
      </Routes>
    </Router>
  );
}

export default App; 