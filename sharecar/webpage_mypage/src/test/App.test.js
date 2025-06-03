import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App, { AppContent } from './App';
import { UserContext, UserProvider } from './UserContext'; // UserContext를 임포트합니다.
import { auth } from './firebase'; // Firebase auth를 임포트합니다.
import { signOut } from 'firebase/auth'; // Firebase signOut를 임포트합니다.

// 하위 컴포넌트 및 외부 모듈 Mocking
jest.mock('./UserContext', () => ({
  // UserProvider는 실제처럼 동작하게 하고, UserContext만 mocking하여 user 값을 제어합니다.
  UserProvider: ({ children }) => <div>{children}</div>,
  UserContext: React.createContext({ user: null }), // 기본값 설정
}));

jest.mock('./Header', () => ({ isDarkMode, toggleMode }) => (
  <div data-testid="header">
    Header
    <button onClick={toggleMode} data-testid="toggle-mode-button">Toggle Mode</button>
  </div>
));


