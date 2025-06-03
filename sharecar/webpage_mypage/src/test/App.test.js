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

    it('calls auth.currentUser.reload and window.location.reload on "인증 상태 새로고침" click', async () => {
    const mockUser = { emailVerified: false, displayName: 'Test User', reload: jest.fn().mockResolvedValue(undefined) };
    UserContext.Provider.valueOf = () => ({ user: mockUser });
    auth.currentUser = mockUser; // firebase mock에 currentUser 설정

    // setTimeout을 mock하여 실제 지연 없이 바로 실행되게 함
    jest.useFakeTimers();

    render(<AppContent />);
    const refreshButton = screen.getByText('인증 상태 새로고침');
    fireEvent.click(refreshButton);

    expect(mockUser.reload).toHaveBeenCalled();

    // reload Promise가 해결된 후 setTimeout 내의 로직을 실행
    await waitFor(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(mockReload).toHaveBeenCalled();

    jest.useRealTimers(); // 타이머 mock 해제
  });

  it('calls alert and window.location.reload if auth.currentUser is null on "인증 상태 새로고침" click', () => {
    const mockUser = { emailVerified: false, displayName: 'Test User' };
    UserContext.Provider.valueOf = () => ({ user: mockUser });
    auth.currentUser = null; // currentUser가 null인 상태

    const mockAlert = jest.fn();
    window.alert = mockAlert; // window.alert mock

    render(<AppContent />);
    const refreshButton = screen.getByText('인증 상태 새로고침');
    fireEvent.click(refreshButton);

    expect(mockAlert).toHaveBeenCalledWith("로그인 상태가 아닙니다. 다시 로그인해 주세요.");
    expect(mockReload).toHaveBeenCalled();
  });

  it('calls signOut on "로그아웃" click when not emailVerified', () => {
    const mockUser = { emailVerified: false, displayName: 'Test User' };
    UserContext.Provider.valueOf = () => ({ user: mockUser });
    render(<AppContent />);
    const logoutButton = screen.getByText('로그아웃');
    fireEvent.click(logoutButton);

    expect(signOut).toHaveBeenCalledWith(auth);
  });

   it('renders MainPage when user is emailVerified and currentPage is "main"', () => {
    const mockUser = { emailVerified: true, displayName: 'Test User' };
    UserContext.Provider.valueOf = () => ({ user: mockUser });
    render(<AppContent />);

    expect(screen.getByTestId('main-page')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-form')).not.toBeInTheDocument();
    expect(screen.queryByText(/이메일 인증 후/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('registration')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rental')).not.toBeInTheDocument();
  });

  it('renders Registration when onPageChange("registration") is called', async () => {
    const mockUser = { emailVerified: true, displayName: 'Test User' };
    UserContext.Provider.valueOf = () => ({ user: mockUser });
    render(<AppContent />);

    // MainPage가 렌더링되고 onPageChange prop이 전달되었는지 확인
    const mainPage = screen.getByTestId('main-page');
    const goRegistrationButton = within(mainPage).getByTestId('go-registration');

    fireEvent.click(goRegistrationButton);

    // 상태 변경 후 렌더링될 때까지 기다림
    await waitFor(() => {
      expect(screen.getByTestId('registration')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('main-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rental')).not.toBeInTheDocument();
  });

  it('renders Rental when onPageChange("rental") is called', async () => {
    const mockUser = { emailVerified: true, displayName: 'Test User' };
    UserContext.Provider.valueOf = () => ({ user: mockUser });
    render(<AppContent />);

    const mainPage = screen.getByTestId('main-page');
    const goRentalButton = within(mainPage).getByTestId('go-rental');

    fireEvent.click(goRentalButton);

    await waitFor(() => {
      expect(screen.getByTestId('rental')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('main-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('registration')).not.toBeInTheDocument();
  });

  it('returns to MainPage when onClose is called from Registration', async () => {
    const mockUser = { emailVerified: true, displayName: 'Test User' };
    UserContext.Provider.valueOf = () => ({ user: mockUser });
    render(<AppContent />);

    const mainPage = screen.getByTestId('main-page');
    const goRegistrationButton = within(mainPage).getByTestId('go-registration');
    fireEvent.click(goRegistrationButton);

    await waitFor(() => {
      expect(screen.getByTestId('registration')).toBeInTheDocument();
    });

    const registrationComp = screen.getByTestId('registration');
    const closeButton = within(registrationComp).getByTestId('close-registration');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getByTestId('main-page')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('registration')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rental')).not.toBeInTheDocument();
  });

   it('returns to MainPage when onClose is called from Rental', async () => {
    const mockUser = { emailVerified: true, displayName: 'Test User' };
    UserContext.Provider.valueOf = () => ({ user: mockUser });
    render(<AppContent />);

    const mainPage = screen.getByTestId('main-page');
    const goRentalButton = within(mainPage).getByTestId('go-rental');
    fireEvent.click(goRentalButton);

    await waitFor(() => {
      expect(screen.getByTestId('rental')).toBeInTheDocument();
    });

    const rentalComp = screen.getByTestId('rental');
    const closeButton = within(rentalComp).getByTestId('close-rental');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getByTestId('main-page')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('registration')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rental')).not.toBeInTheDocument();
  });
});

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Mock 상태 초기화
    // localStorage mock 초기화
    localStorageMock.getItem.mockReturnValue(null); // 기본적으로 다크 모드 설정 없음
    // UserContext mock의 value를 기본값으로 설정 (null user)
    UserContext.Provider.valueOf = () => ({ user: null });
  });