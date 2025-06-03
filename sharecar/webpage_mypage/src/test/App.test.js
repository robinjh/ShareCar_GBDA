import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App, { AppContent } from './App';
import { UserContext, UserProvider } from './UserContext';
import { auth } from './firebase'; 
import { signOut } from 'firebase/auth'; 

// 하위 컴포넌트 및 외부 모듈 Mocking
jest.mock('./UserContext', () => ({
  UserProvider: ({ children }) => <div>{children}</div>,
  UserContext: React.createContext({ user: null }), // 기본값 설정
}));

jest.mock('./Header', () => ({ isDarkMode, toggleMode }) => (
  <div data-testid="header">
    Header
    <button onClick={toggleMode} data-testid="toggle-mode-button">Toggle Mode</button>
  </div>
));

jest.mock('./components/auth/AuthForm', () => () => <div data-testid="auth-form">Auth Form</div>);
jest.mock('./components/mypage/MyPage', () => () => <div data-testid="my-page">My Page</div>);
jest.mock('./components/recommendation/PlaceRecommendation', () => () => <div data-testid="place-recommendation">Place Recommendation</div>);
jest.mock('./components/mainpage/MainPage', () => ({ onPageChange }) => (
  <div data-testid="main-page">
    Main Page
    <button onClick={() => onPageChange('registration')} data-testid="go-registration">Go Registration</button>
    <button onClick={() => onPageChange('rental')} data-testid="go-rental">Go Rental</button>
  </div>
));
