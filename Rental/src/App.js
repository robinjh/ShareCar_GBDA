import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CarRent from './pages/CarRent';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<CarRent />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
