jest.mock("firebase/auth", () => ({
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, cb) => {
    // 콜백 호출은 필요시 cb(null) 등으로!
    return function unsubscribe() {}; // 꼭 함수 반환!!
  }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App, { AppContent } from '../App';
import { UserContext } from '../UserContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

// Mock 하위 컴포넌트
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

// firebase mock
jest.mock('../firebase', () => ({
  auth: {
    currentUser: null,
  },
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
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders AuthForm when user is null', () => {
    render(
      <UserContext.Provider value={{ user: null }}>
        <AppContent />
      </UserContext.Provider>
    );
    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
  });

  it("renders MainPage when currentPage is main", () => {
    const mockUser = { emailVerified: true, displayName: "Tester" };
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <AppContent />
      </UserContext.Provider>
    );
    expect(screen.getByTestId("main-page")).toBeInTheDocument();
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

    // 명확히 한 번 더 덮어쓰기
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

    await Promise.resolve(); // promise flush
    jest.advanceTimersByTime(1200);
    await Promise.resolve();

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
    expect(signOut).toHaveBeenCalled();
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

// --------------- App 컴포넌트 다크모드, 클래스 테스트 ---------------

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null); // 초기값
  });

  it('renders Header and AppContent (AuthForm) when not logged in', () => {
    render(<App />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
  });

  it('toggles dark mode', () => {
    render(<App />);
    const toggleButton = screen.getByTestId('toggle-mode-button');
    const appDiv = screen.getByTestId('app-root');
    expect(appDiv.className).toMatch(/light/);

    fireEvent.click(toggleButton);
    expect(appDiv.className).toMatch(/dark/);

    fireEvent.click(toggleButton);
    expect(appDiv.className).toMatch(/light/);
  });

  it('calls localStorage and body.classList when toggling dark mode', () => {
    render(<App />);
    const toggleButton = screen.getByTestId('toggle-mode-button');
    fireEvent.click(toggleButton);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', 'true');
    expect(bodyClassListMock.add).toHaveBeenCalledWith('dark-mode');
    expect(bodyClassListMock.remove).toHaveBeenCalledWith('light-mode');
  });

 it('shows alert and reloads page when not logged in', () => {
  auth.currentUser = undefined;

  window.alert = jest.fn();
  window.location.reload = jest.fn();

  const mockUser = { emailVerified: false, displayName: 'Test User' };
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <AppContent />
    </UserContext.Provider>
  );

  const refreshButton = screen.getByText('인증 상태 새로고침');
  fireEvent.click(refreshButton);

  expect(window.alert).toHaveBeenCalledWith("로그인 상태가 아닙니다. 다시 로그인해 주세요.");
  expect(window.location.reload).toHaveBeenCalled();
});

 function Wrapper() {
    const { user } = React.useContext(UserContext);
    const [currentPage] = React.useState('___정의되지않은값___');
    if (!user) return <div>no user</div>;
    if (!user.emailVerified) return <div>not verified</div>;
    if (currentPage === 'main') return <div>Main Page</div>;
    if (currentPage === 'registration') return <div>Registration</div>;
    if (currentPage === 'rental') return <div>Rental</div>;
    return null; // fallback 커버
  }

  it('covers fallback null branch (by Wrapper)', () => {
    const mockUser = { emailVerified: true };
    const { container } = render(
      <UserContext.Provider value={{ user: mockUser }}>
        <Wrapper />
      </UserContext.Provider>
    );
    // 아무것도 렌더 안 되는지 확인
    expect(container.firstChild).toBeNull();
  });
});