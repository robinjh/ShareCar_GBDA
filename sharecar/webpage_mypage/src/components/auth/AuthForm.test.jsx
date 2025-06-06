import "@testing-library/jest-dom";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import AuthForm from "./AuthForm";
import { UserContext } from "../../UserContext";

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  getAuth: jest.fn(() => ({ currentUser: null })),
}));
jest.mock("firebase/firestore", () => ({
  setDoc: jest.fn(),
  doc: jest.fn(),
  getFirestore: jest.fn(() => ({})),
}));
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

const renderWithContext = ( user = null) =>
  render(
    <UserContext.Provider value={{ user }}>
      <AuthForm />
    </UserContext.Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AuthForm", () => {
  test("로그인/회원가입 폼 전환 UI", () => {
    renderWithContext();
    expect(screen.getByRole("heading", { name: "로그인" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("회원가입으로 전환"));
    expect(
      screen.getByRole("heading", { name: "회원가입" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("로그인으로 전환"));
    expect(screen.getByRole("heading", { name: "로그인" })).toBeInTheDocument();
  });

  test("이메일 미입력 시 로그인 버튼이 비활성화(disabled)", () => {
    renderWithContext();
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "Abcdefg1!" },
    });
    const loginBtn = screen.getByRole("button", { name: "로그인" });
    expect(loginBtn).toBeDisabled();
  });

  test("로그인 실패 - 비밀번호 검증 실패", async () => {
    renderWithContext();
    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByText(/비밀번호는 8자 이상/)).toBeInTheDocument();
  });

  test("로그인 성공", async () => {
    signInWithEmailAndPassword.mockResolvedValueOnce({});
    renderWithContext();

    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "Abcdefg1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() =>
      expect(screen.getByText("로그인 성공!")).toBeInTheDocument()
    );
  });

  test("로그인 실패 - 비밀번호 틀림", async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce({
      code: "auth/wrong-password",
    });
    renderWithContext();
    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "Abcdefg1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(
      await screen.findByText(/이메일 또는 비밀번호가 올바르지 않습니다/)
    ).toBeInTheDocument();
  });

  test("로그인 실패 - 기타 에러", async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce({ code: "unknown-error" });
    renderWithContext();
    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "Abcdefg1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(
      await screen.findByText(/오류가 발생했습니다. 다시 시도해 주세요/)
    ).toBeInTheDocument();
  });

  test("회원가입 입력 검증: 이름, 생년월일, 주소, 비밀번호 에러 순차 확인", async () => {
    renderWithContext();
    // 회원가입 폼으로 전환
    fireEvent.click(screen.getByText("회원가입으로 전환"));

    // 모든 필드를 올바른 값으로 초기 세팅 (버튼 활성화를 위해)
    fireEvent.change(screen.getByPlaceholderText("이름"), {
      target: { value: "홍길동" },
    });
    fireEvent.change(screen.getByPlaceholderText("생년월일 (YYYY-MM-DD)"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getByPlaceholderText("주소"), {
      target: { value: "서울시 강남구" },
    });
    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "test@ex.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "Abcdefg1!" },
    });

    // 1. 이름 오류
    fireEvent.change(screen.getByPlaceholderText("이름"), {
      target: { value: "a" },
    });
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(await screen.findByText(/이름은 한글 2~10자/)).toBeInTheDocument();
    // 올바른 값으로 복구
    fireEvent.change(screen.getByPlaceholderText("이름"), {
      target: { value: "홍길동" },
    });

    // 2. 생년월일 오류
    // 2-1. 일자를 넘긴 경우(30일까지인 달인데 31일 입력 등)
    fireEvent.change(screen.getByPlaceholderText("생년월일 (YYYY-MM-DD)"), {
      target: { value: "2001-06-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(
      await screen.findByText(/생년월일을 YYYY-MM-DD/)
    ).toBeInTheDocument();
    // 2-2. 1900년 이전인 경우
    fireEvent.change(screen.getByPlaceholderText("생년월일 (YYYY-MM-DD)"), {
      target: { value: "1112-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(
      await screen.findByText(/생년월일을 YYYY-MM-DD/)
    ).toBeInTheDocument();
    // 2-3. 미래인 경우
    const nextYear = new Date().getFullYear() + 1;
    fireEvent.change(screen.getByPlaceholderText("생년월일 (YYYY-MM-DD)"), {
      target: { value: `${nextYear}-01-01` },
    });
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(
      await screen.findByText(/생년월일을 YYYY-MM-DD/)
    ).toBeInTheDocument();
    // 2-4. 미성년자인 경우
    const underageYear = new Date().getFullYear() - 5;
    fireEvent.change(screen.getByPlaceholderText("생년월일 (YYYY-MM-DD)"), {
      target: { value: `${underageYear}-01-01` },
    });
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(await screen.findByText(/만 18세/)).toBeInTheDocument();

    // 올바른 값으로 복구
    fireEvent.change(screen.getByPlaceholderText("생년월일 (YYYY-MM-DD)"), {
      target: { value: "2000-01-01" },
    });

    // 3. 주소 오류
    fireEvent.change(screen.getByPlaceholderText("주소"), {
      target: { value: "a" },
    });
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(await screen.findByText(/주소는 5자/)).toBeInTheDocument();
    // 올바른 값으로 복구
    fireEvent.change(screen.getByPlaceholderText("주소"), {
      target: { value: "서울시 강남구" },
    });

    // 4. 비밀번호 오류
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(await screen.findByText(/비밀번호는 8자 이상/)).toBeInTheDocument();
    // (여기서 다시 올바른 비밀번호로 복구 후, 추가 플로우 진행 가능)
  });

  test("회원가입 정상 플로우", async () => {
    createUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: "testid" },
    });
    setDoc.mockResolvedValueOnce();
    updateProfile.mockResolvedValueOnce();
    sendEmailVerification.mockResolvedValueOnce();

    renderWithContext();
    fireEvent.click(screen.getByText("회원가입으로 전환"));

    fireEvent.change(screen.getByPlaceholderText("이름"), {
      target: { value: "홍길동" },
    });
    fireEvent.change(screen.getByPlaceholderText("생년월일 (YYYY-MM-DD)"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getByPlaceholderText("주소"), {
      target: { value: "서울시 강남구" },
    });
    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "hong@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "Abcdefg1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    await waitFor(() =>
      expect(screen.getByText(/회원가입 완료/)).toBeInTheDocument()
    );
  });

  test("회원가입 실패 - 이메일 중복", async () => {
    createUserWithEmailAndPassword.mockRejectedValueOnce({
      code: "auth/email-already-in-use",
    });
    renderWithContext();
    fireEvent.click(screen.getByText("회원가입으로 전환"));

    fireEvent.change(screen.getByPlaceholderText("이름"), {
      target: { value: "홍길동" },
    });
    fireEvent.change(screen.getByPlaceholderText("생년월일 (YYYY-MM-DD)"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getByPlaceholderText("주소"), {
      target: { value: "서울시 강남구" },
    });
    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "hong@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "Abcdefg1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(
      await screen.findByText(/이미 사용 중인 이메일입니다/)
    ).toBeInTheDocument();
  });

  test("회원가입 실패 - Firestore 오류 (회원정보 저장)", async () => {
    createUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: "testid" },
    });
    setDoc.mockRejectedValueOnce({ code: "firestore/unavailable" });
    renderWithContext();
    fireEvent.click(screen.getByText("회원가입으로 전환"));

    fireEvent.change(screen.getByPlaceholderText("이름"), {
      target: { value: "홍길동" },
    });
    fireEvent.change(screen.getByPlaceholderText("생년월일 (YYYY-MM-DD)"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getByPlaceholderText("주소"), {
      target: { value: "서울시 강남구" },
    });
    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "hong@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "Abcdefg1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));

    expect(
      await screen.findByText(/회원정보 저장 중 오류가 발생했습니다/)
    ).toBeInTheDocument();
  });

  test("회원가입 실패 - 기타 에러", async () => {
    createUserWithEmailAndPassword.mockRejectedValueOnce({
      code: "unknown-error",
    });
    renderWithContext();
    fireEvent.click(screen.getByText("회원가입으로 전환"));

    fireEvent.change(screen.getByPlaceholderText("이름"), {
      target: { value: "홍길동" },
    });
    fireEvent.change(screen.getByPlaceholderText("생년월일 (YYYY-MM-DD)"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getByPlaceholderText("주소"), {
      target: { value: "서울시 강남구" },
    });
    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "hong@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), {
      target: { value: "Abcdefg1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    expect(
      await screen.findByText(/오류가 발생했습니다. 다시 시도해 주세요/)
    ).toBeInTheDocument();
  });

  test("구글 로그인 정상/실패", async () => {
    signInWithPopup.mockResolvedValueOnce();
    renderWithContext();
    fireEvent.click(
      screen.getByRole("button", { name: "G Google 계정으로 로그인/회원가입" })
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Google 계정으로 로그인\/회원가입 완료/)
      ).toBeInTheDocument()
    );

    signInWithPopup.mockRejectedValueOnce({ message: "google error" });
    fireEvent.click(
      screen.getByRole("button", { name: "G Google 계정으로 로그인/회원가입" })
    );
    await waitFor(() =>
      expect(screen.getByText(/구글 로그인 실패/)).toBeInTheDocument()
    );
  });

  test("비밀번호 재설정 플로우 - 성공", async () => {
    sendPasswordResetEmail.mockResolvedValueOnce();
    renderWithContext();
    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "test@test.com" },
    });
    fireEvent.click(screen.getByText("비밀번호 재설정"));
    fireEvent.click(screen.getByText("재설정 메일 전송"));
    await waitFor(() =>
      expect(
        screen.getByText(/비밀번호 재설정 메일이 전송되었습니다/)
      ).toBeInTheDocument()
    );
  });

  test("비밀번호 재설정 플로우 - 실패", async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({ message: "reset error" });
    renderWithContext();
    fireEvent.change(screen.getByPlaceholderText("이메일"), {
      target: { value: "test@test.com" },
    });
    fireEvent.click(screen.getByText("비밀번호 재설정"));
    fireEvent.click(screen.getByText("재설정 메일 전송"));
    await waitFor(() =>
      expect(screen.getByText(/재설정 메일 전송 실패/)).toBeInTheDocument()
    );
  });

  test("비밀번호 재설정 - 이메일 미입력", async () => {
    renderWithContext();
    fireEvent.click(screen.getByText("비밀번호 재설정"));
    fireEvent.click(screen.getByText("재설정 메일 전송"));
    // 이메일을 입력하지 않고 재설정 시도
    await waitFor(() =>
      expect(
        screen.getByText(/비밀번호 재설정은 먼저 이메일을 입력해야 합니다./)
      ).toBeInTheDocument()
    );
  });
});

test("비밀번호 재설정 폼 닫기 동작", () => {
  renderWithContext();
  fireEvent.change(screen.getByPlaceholderText("이메일"), {
    target: { value: "test@test.com" },
  });
  fireEvent.click(screen.getByText("비밀번호 재설정"));
  // reset-form이 생겼는지 확인
  expect(
    screen.getByRole("button", { name: "재설정 메일 전송" })
  ).toBeInTheDocument();
  // 닫기 클릭
  fireEvent.click(screen.getByText("닫기"));
  // reset-form이 없어지는지 확인
  expect(
    screen.queryByRole("button", { name: "재설정 메일 전송" })
  ).not.toBeInTheDocument();
});
