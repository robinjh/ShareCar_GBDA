import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App, { AppContent } from '../App';
import { UserContext } from '../UserContext';
import { auth } from '../firebase'; 
import { signOut } from 'firebase/auth'; 

// 하위 컴포넌트 및 외부 모듈 Mocking
jest.mock('../Header', () => ({ isDarkMode, toggleMode }) => (
  <div data-testid="header">
    Header
    <button onClick={toggleMode} data-testid="toggle-mode-button">Toggle Mode</button>
  </div>
));

jest.mock('../components/mypage/MyPage', () => () => <div data-testid="my-page">My Page</div>);
jest.mock('../components/recommendation/PlaceRecommendation', () => () => <div data-testid="place-recommendation">Place Recommendation</div>);
jest.mock('../components/mainpage/MainPage', () => ({ onPageChange }) => (
  <div data-testid="main-page">
    Main Page
    <button onClick={() => onPageChange('registration')} data-testid="go-registration">Go Registration</button>
    <button onClick={() => onPageChange('rental')} data-testid="go-rental">Go Rental</button>
  </div>
));

jest.mock('../components/registration/Registration', () => ({ onClose }) => (
  <div data-testid="registration">
    Registration
    <button onClick={onClose} data-testid="close-registration">Close Registration</button>
  </div>
));

jest.mock('../components/rental/Rental', () => ({ onClose }) => (
  <div data-testid="rental">
    Rental
    <button onClick={onClose} data-testid="close-rental">Close Rental</button>
  </div>
));

jest.mock('../firebase', () => ({
  auth: {
    currentUser: null, 
  },
}));
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(), // signOut 함수 mock
}));

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders AuthForm when user is null', () => {
    render(
      <UserContext.Provider value={{ user: null }}>
        <AppContent />
      </UserContext.Provider>
    );
    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
    expect(screen.queryByTestId('main-page')).not.toBeInTheDocument();
  });

  it('renders email verification message when user is not emailVerified', () => {
    const mockUser = { emailVerified: false, displayName: 'Test User' };
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <AppContent />
      </UserContext.Provider>
    );
    expect(screen.getByText(/이메일 인증 후 모든 기능을 사용할 수 있습니다/)).toBeInTheDocument();
    expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    expect(screen.getByText('인증 상태 새로고침')).toBeInTheDocument();
    expect(screen.getByText('로그아웃')).toBeInTheDocument();
    expect(screen.queryByTestId('main-page')).not.toBeInTheDocument();
  });

it('calls auth.currentUser.reload and window.location.reload on "인증 상태 새로고침" click', async () => {
  const mockUser = {
    emailVerified: false,
    displayName: 'Test User',
    reload: jest.fn().mockResolvedValue(undefined),
  };
  auth.currentUser = mockUser;
  jest.useFakeTimers();

  // 여기서 다시 한 번 명확하게 덮어씌움!
  const mockReload = jest.fn();
  window.location.reload = mockReload;

  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <AppContent />
    </UserContext.Provider>
  );

  const refreshButton = screen.getByText('인증 상태 새로고침');
  fireEvent.click(refreshButton);

  expect(mockUser.reload).toHaveBeenCalled();

  // 1. reload가 promise라서, 한 번 이벤트 루프 돌리기
  await Promise.resolve();

  // 2. setTimeout 1200ms 진행
  jest.advanceTimersByTime(1200);

  // 3. setTimeout 내 콜백이 마이크로태스크로 가서 한 번 더 이벤트 루프 돌리기
  await Promise.resolve();

  // 디버깅용으로 한 번 찍기
  // console.log("reload:", window.location.reload);

  expect(mockReload).toHaveBeenCalled();

  jest.useRealTimers();
});

  it('calls signOut on "로그아웃" click when not emailVerified', () => {
    const mockUser = { emailVerified: false, displayName: 'Test User' };
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <AppContent />
      </UserContext.Provider>
    );
    const logoutButton = screen.getByText('로그아웃');
    fireEvent.click(logoutButton);

    expect(signOut).toHaveBeenCalledWith(auth);
  });

  it('renders MainPage when user is emailVerified and currentPage is "main"', () => {
    const mockUser = { emailVerified: true, displayName: 'Test User' };
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <AppContent />
      </UserContext.Provider>
    );

    expect(screen.getByTestId('main-page')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-form')).not.toBeInTheDocument();
    expect(screen.queryByText(/이메일 인증 후/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('registration')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rental')).not.toBeInTheDocument();
  });

  it('renders Registration when onPageChange("registration") is called', async () => {
    const mockUser = { emailVerified: true, displayName: 'Test User' };
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <AppContent />
      </UserContext.Provider>
    );

    const mainPage = screen.getByTestId('main-page');
    const goRegistrationButton = within(mainPage).getByTestId('go-registration');

    fireEvent.click(goRegistrationButton);

    await waitFor(() => {
      expect(screen.getByTestId('registration')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('main-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rental')).not.toBeInTheDocument();
  });

  it('renders Rental when onPageChange("rental") is called', async () => {
    const mockUser = { emailVerified: true, displayName: 'Test User' };
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <AppContent />
      </UserContext.Provider>
    );

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
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <AppContent />
      </UserContext.Provider>
    );

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
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <AppContent />
      </UserContext.Provider>
    );

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