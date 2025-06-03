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

jest.mock('./components/registration/Registration', () => ({ onClose }) => (
  <div data-testid="registration">
    Registration
    <button onClick={onClose} data-testid="close-registration">Close Registration</button>
  </div>
));

jest.mock('./components/rental/Rental', () => ({ onClose }) => (
  <div data-testid="rental">
    Rental
    <button onClick={onClose} data-testid="close-rental">Close Rental</button>
  </div>
));

jest.mock('./firebase', () => ({
  auth: {
    currentUser: null, 
  },
}));
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(), // signOut 함수 mock
}));

// window.location.reload Mock
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

// localStorage Mock
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// document.body.classList Mock
const bodyClassListMock = {
  add: jest.fn(),
  remove: jest.fn(),
  contains: jest.fn(),
};
Object.defineProperty(document.body, 'classList', {
  value: bodyClassListMock,
});

describe('AppContent Component', () => {
  // 각 테스트 전에 UserContext의 user 값을 null로
  beforeEach(() => {
    jest.clearAllMocks(); // Mock 상태 초기화
    // UserContext mock의 value를 설정하여 useContext에서 반환될 값을 제어
    UserContext.Provider.valueOf = () => ({ user: null });
  });

  it('renders AuthForm when user is null', () => {
    UserContext.Provider.valueOf = () => ({ user: null });
    render(<AppContent />);
    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
    expect(screen.queryByTestId('main-page')).not.toBeInTheDocument();
  });

  it('renders email verification message when user is not emailVerified', () => {
    const mockUser = { emailVerified: false, displayName: 'Test User' };
    UserContext.Provider.valueOf = () => ({ user: mockUser });
    render(<AppContent />);

    expect(screen.getByText(/이메일 인증 후 모든 기능을 사용할 수 있습니다/)).toBeInTheDocument();
    expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    expect(screen.getByText('인증 상태 새로고침')).toBeInTheDocument();
    expect(screen.getByText('로그아웃')).toBeInTheDocument();
    expect(screen.queryByTestId('main-page')).not.toBeInTheDocument();
  });