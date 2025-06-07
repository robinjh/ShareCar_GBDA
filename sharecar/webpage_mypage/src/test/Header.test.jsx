import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Header from "../Header";
import { UserContext } from "../UserContext";

// MyPage, AuthForm 모킹 (모달 내부 렌더링 커버)
jest.mock("../components/mypage/MyPage", () => () => <div data-testid="mypage-content">MyPage Content</div>);
jest.mock("../components/auth/AuthForm", () => () => <div data-testid="authform-content">AuthForm Content</div>);

// signOut과 auth 모킹
jest.mock("firebase/auth", () => ({
  signOut: jest.fn(),
}));
import { signOut } from "firebase/auth";
jest.mock("../firebase", () => ({
  auth: {},
}));

// 필요 스타일 무시
jest.mock("../styles/Header.css", () => ({}));

describe("Header component", () => {
  const toggleModeMock = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

 it("renders login button when user is not logged in", () => {
    render(
      <UserContext.Provider value={{ user: null }}>
        <Header isDarkMode={false} toggleMode={toggleModeMock} />
      </UserContext.Provider>
    );
    expect(screen.getByText(/로그인 \/ 회원가입/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /로그인 \/ 회원가입/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /🌙 Dark/ })).toBeInTheDocument();
  });

  it("shows AuthForm modal when login button is clicked, closes on overlay/click", () => {
    render(
      <UserContext.Provider value={{ user: null }}>
        <Header isDarkMode={false} toggleMode={toggleModeMock} />
      </UserContext.Provider>
    );
    // 모달 오픈
    fireEvent.click(screen.getByText(/로그인 \/ 회원가입/));
    expect(screen.getByTestId("authform-content")).toBeInTheDocument();

    // 모달 닫기 (X 버튼)
    fireEvent.click(screen.getByText("×"));
    expect(screen.queryByTestId("authform-content")).not.toBeInTheDocument();

    // 모달 다시 오픈
    fireEvent.click(screen.getByText(/로그인 \/ 회원가입/));
    // 모달 닫기 (Overlay 클릭)
    fireEvent.click(screen.getByText(/AuthForm Content/).closest(".modal-overlay"));
    expect(screen.queryByTestId("authform-content")).not.toBeInTheDocument();
  });

  it("renders user info, 마이페이지/로그아웃/다크모드 버튼 when logged in", () => {
    const mockUser = { displayName: "홍길동", email: "hong@test.com" };
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <Header isDarkMode={true} toggleMode={toggleModeMock} />
      </UserContext.Provider>
    );
    expect(screen.getByText(/홍길동|hong@test.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /마이페이지/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /로그아웃/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /☀️ Light/ })).toBeInTheDocument();
  });

  it("shows MyPage modal when 마이페이지 button is clicked, closes on overlay/click", () => {
    const mockUser = { displayName: "홍길동", email: "hong@test.com" };
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <Header isDarkMode={true} toggleMode={toggleModeMock} />
      </UserContext.Provider>
    );
    // 마이페이지 모달 오픈
    fireEvent.click(screen.getByText(/마이페이지/));
    expect(screen.getByTestId("mypage-content")).toBeInTheDocument();

    // 닫기 (X 버튼)
    fireEvent.click(screen.getAllByText("×")[0]);
    expect(screen.queryByTestId("mypage-content")).not.toBeInTheDocument();

    // 다시 열기
    fireEvent.click(screen.getByText(/마이페이지/));
    // 닫기 (Overlay)
    fireEvent.click(screen.getByTestId("mypage-content").closest(".modal-overlay"));
    expect(screen.queryByTestId("mypage-content")).not.toBeInTheDocument();
  });

  it("calls signOut when 로그아웃 button is clicked", () => {
    const mockUser = { displayName: "홍길동", email: "hong@test.com" };
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <Header isDarkMode={true} toggleMode={toggleModeMock} />
      </UserContext.Provider>
    );
    fireEvent.click(screen.getByText(/로그아웃/));
    expect(signOut).toHaveBeenCalled();
  });

  it("calls toggleMode when 다크/라이트 버튼 클릭", () => {
    render(
      <UserContext.Provider value={{ user: null }}>
        <Header isDarkMode={false} toggleMode={toggleModeMock} />
      </UserContext.Provider>
    );
    fireEvent.click(screen.getByText(/🌙 Dark/));
    expect(toggleModeMock).toHaveBeenCalled();

    // 라이트모드 버튼도 커버
    render(
      <UserContext.Provider value={{ user: { displayName: "홍길동" } }}>
        <Header isDarkMode={true} toggleMode={toggleModeMock} />
      </UserContext.Provider>
    );
    fireEvent.click(screen.getByText(/☀️ Light/));
    expect(toggleModeMock).toHaveBeenCalled();
  });

 it("closes AuthForm modal when user logs in while modal is open", async () => {
  let setUser;
  function Wrapper() {
    const [user, _setUser] = React.useState(null);
    setUser = _setUser;
    return (
      <UserContext.Provider value={{ user }}>
        <Header isDarkMode={false} toggleMode={jest.fn()} />
      </UserContext.Provider>
    );
  }

  render(<Wrapper />);
  // 비로그인 상태에서 로그인 모달 열기
  fireEvent.click(screen.getByText(/로그인 \/ 회원가입/));
  expect(screen.getByTestId("authform-content")).toBeInTheDocument();

  // 로그인 시나리오: user 값을 변경(로그인)
  await act(async () => {
    setUser({ displayName: "홍길동" });
  });

  // 모달이 자동으로 닫혀야 함
  await waitFor(() => {
    expect(screen.queryByTestId("authform-content")).not.toBeInTheDocument();
  });
});

it("closes MyPage modal when user logs out while modal is open", async () => {
  let setUser;
  function Wrapper() {
    const [user, _setUser] = React.useState({ displayName: "홍길동" });
    setUser = _setUser;
    return (
      <UserContext.Provider value={{ user }}>
        <Header isDarkMode={true} toggleMode={jest.fn()} />
      </UserContext.Provider>
    );
  }

  render(<Wrapper />);
  // 로그인 상태에서 마이페이지 모달 열기
  fireEvent.click(screen.getByText(/마이페이지/));
  expect(screen.getByTestId("mypage-content")).toBeInTheDocument();

  // 로그아웃 시나리오: user 값을 null로 변경
  await act(async () => {
    setUser(null);
  });

  // 모달이 자동으로 닫혀야 함
  await waitFor(() => {
    expect(screen.queryByTestId("mypage-content")).not.toBeInTheDocument();
  });
});

it("shows welcome message with email if displayName is missing", () => {
  const mockUser = { email: "test@example.com" };
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <Header isDarkMode={false} toggleMode={jest.fn()} />
    </UserContext.Provider>
  );
  expect(screen.getByText("test@example.com님 환영합니다")).toBeInTheDocument();
});

}); 
