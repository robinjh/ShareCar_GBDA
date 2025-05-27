import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserContext, UserProvider } from './UserContext';
import CarRegistration from './components/CarRegistration';
import Login from './components/Login';
import './App.css';

function AppContent() {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={user ? <CarRegistration /> : <Login />}
          />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App; 