jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve({})),
  deleteDoc: jest.fn(() => Promise.resolve()),
  getFirestore: jest.fn(() => ({})),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
}));
jest.mock("firebase/auth", () => {
  let currentUser = {
  email: "test@example.com",
  uid: "user123",
  providerData: [{ providerId: "password", email: "test@example.com" }],
  reload: jest.fn(),
};
  return {
    getAuth: jest.fn(() => ({ currentUser })),
    updateProfile: jest.fn(),
    updateEmail: jest.fn(() => Promise.resolve()),
    sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
    EmailAuthProvider: { credential: jest.fn(() => ({})) },
    reauthenticateWithCredential: jest.fn(() => Promise.resolve()),
    sendEmailVerification: jest.fn(() => Promise.resolve()),
    deleteUser: jest.fn(() => Promise.resolve()),
    auth: {
      get currentUser() {
        return currentUser;
      },
      set currentUser(val) {
        currentUser = val;
      },
    },
  };
});
import "@testing-library/jest-dom";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
  within,
} from "@testing-library/react";
import MyInfo from "./MyInfo";
import { UserContext } from "../../UserContext";

const mockUser = {
  uid: "user123",
  email: "test@example.com",
  providerData: [{ providerId: "password", email: "test@example.com" }],
};

const socialUser = {
  uid: "social456",
  email: "social@test.com",
  providerData: [{ providerId: "google.com", email: "social@test.com" }],
};

const { auth } = require("firebase/auth");

let refreshState = false;
function setRefreshUser(fn) {
  refreshState = typeof fn === "function" ? fn(refreshState) : fn;
}

function renderWithUser(user = mockUser) {
  if (user) {
    auth.currentUser = {
      ...user,
      reload: jest.fn(),
      providerData: user.providerData && user.providerData.length
        ? user.providerData.map(p => ({ ...p, email: user.email }))
        : [{ providerId: "password", email: user.email }]
    };
  }
  return render(
    <UserContext.Provider value={{ user, setRefreshUser }}>
      <MyInfo />
    </UserContext.Provider>
  );
}

afterEach(() => {
  cleanup();
});

describe("MyInfo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading, error, and profile states", async () => {
    const { getDoc } = require("firebase/firestore");
    renderWithUser();
    expect(screen.getByText("정보를 불러오는 중...")).toBeInTheDocument();

    // 에러 상태: getDoc.exists()가 false일 때
    getDoc.mockResolvedValueOnce({ exists: () => false });
    await act(async () => {
      renderWithUser();
    });
    await waitFor(() => {
      expect(
        screen.getAllByText("정보를 불러올 수 없습니다.").length
      ).toBeGreaterThan(0);
    });
  });

  it("renders user profile and switches to edit mode", async () => {
    const { getDoc } = require("firebase/firestore");
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        name: "테스터",
        birth: "2000-01-01",
        address: "서울시 강남구",
        email: "test@example.com",
      }),
    });

    await act(async () => {
      renderWithUser();
    });

    expect(await screen.findByText("테스터")).toBeInTheDocument();
    fireEvent.click(screen.getByText("수정"));
    expect(screen.getByDisplayValue("테스터")).toBeInTheDocument();
  });

  it("입력 검증: 잘못된 이름, 생년월일, 주소, 이메일 에러", async () => {
    const { getDoc, updateDoc } = require("firebase/firestore");
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        name: "테스터",
        birth: "2000-01-01",
        address: "서울시 강남구",
        email: "test@example.com",
      }),
    });

    await act(async () => {
      renderWithUser();
    });
    fireEvent.click(screen.getByText("수정"));

    const textboxes = screen.getAllByRole("textbox");
    // 이름: 0, 생년월일: 1, 주소: 2, 연락이메일: 3

    fireEvent.change(textboxes[0], { target: { value: "a" } });
    fireEvent.click(screen.getByText("저장"));
    expect(await screen.findByText(/이름은 한글 2~10자/)).toBeInTheDocument();

    fireEvent.change(textboxes[0], { target: { value: "홍길동" } });
    fireEvent.change(textboxes[1], { target: { value: "20220101" } });
    fireEvent.click(screen.getByText("저장"));
    expect(await screen.findByText(/YYYY-MM-DD/)).toBeInTheDocument();

    fireEvent.change(textboxes[1], { target: { value: "2000-01-01" } });
    fireEvent.change(textboxes[2], { target: { value: "a" } });
    fireEvent.click(screen.getByText("저장"));
    expect(await screen.findByText(/주소는 5자/)).toBeInTheDocument();

    fireEvent.change(textboxes[2], { target: { value: "서울시 강남구" } });
    fireEvent.change(textboxes[3], { target: { value: "test" } });
    fireEvent.click(screen.getByText("저장"));
    expect(await screen.findByText(/이메일 형식/)).toBeInTheDocument();

    fireEvent.change(textboxes[3], { target: { value: "test@ex.com" } });
    fireEvent.click(screen.getByText("저장"));
    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
  });

  it("비밀번호 변경 버튼 클릭시 이메일 전송 호출", async () => {
    const { getDoc } = require("firebase/firestore");
    const { sendPasswordResetEmail } = require("firebase/auth");
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        name: "테스터",
        birth: "2000-01-01",
        address: "서울시 강남구",
        email: "test@example.com",
      }),
    });
    await act(async () => {
      renderWithUser();
    });
    fireEvent.click(screen.getByText("비밀번호 변경"));
    await waitFor(() => expect(sendPasswordResetEmail).toHaveBeenCalled());
  });

  it("회원 탈퇴 버튼 클릭시 모달 오픈 및 입력/확인", async () => {
    const { getDoc, deleteDoc } = require("firebase/firestore");
    const { deleteUser } = require("firebase/auth");
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        name: "테스터",
        birth: "2000-01-01",
        address: "서울시 강남구",
        email: "test@example.com",
      }),
    });
    await act(async () => {
      renderWithUser();
    });
    fireEvent.click(screen.getByText("회원 탈퇴"));

    // "비밀번호" placeholder가 반드시 나옴 (input index 등으로 찾는 것도 가능)
    const pwInput = await screen.findByPlaceholderText("비밀번호");
    fireEvent.change(pwInput, { target: { value: "pw1234" } });
    fireEvent.click(screen.getByText("탈퇴"));
    await waitFor(() => expect(deleteDoc).toHaveBeenCalled());
    await waitFor(() => expect(deleteUser).toHaveBeenCalled());
  });

  it("이메일 변경 모달 오픈 및 입력/확인", async () => {
    const { getDoc, updateDoc } = require("firebase/firestore");
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        name: "테스터",
        birth: "2000-01-01",
        address: "서울시 강남구",
        email: "test@example.com",
      }),
    });
    await act(async () => {
      renderWithUser();
    });
    fireEvent.click(screen.getByText("수정"));
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[3], { target: { value: "hello@naver.com" } });
    fireEvent.click(screen.getByText("저장"));

    const pwInput = await screen.findByPlaceholderText("비밀번호");
    fireEvent.change(pwInput, { target: { value: "pw1234" } });

    // 2. 비밀번호 인풋이 들어있는 모달(form) 찾기
    const pwModal = pwInput.closest(".pw-modal");
    expect(pwModal).toBeTruthy();

    // 3. 모달 내부에서만 "확인" 버튼을 찾아 클릭
    const confirmBtn = within(pwModal).getByRole("button", { name: /확인/ });
    fireEvent.click(confirmBtn);

    // 4. updateDoc이 호출됐는지 검증
    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
  });

  it("social 로그인 유저는 비번/이메일 변경 UI가 숨겨진다", async () => {
    const { getDoc } = require("firebase/firestore");
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        name: "테스터",
        birth: "2000-01-01",
        address: "서울시 강남구",
        email: "test@example.com",
      }),
    });
    await act(async () => {
      renderWithUser(socialUser);
    });
    expect(screen.queryByText("비밀번호 변경")).not.toBeInTheDocument();
    // 수정 전에는 텍스트박스가 아예 없으므로
    expect(screen.queryAllByRole("textbox").length).toBe(0);
  });
});

it("회원 탈퇴 실패시 에러 메시지 표시", async () => {
  const { getDoc, deleteDoc } = require("firebase/firestore");
  const { deleteUser, reauthenticateWithCredential } = require("firebase/auth");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  // reauthenticate만 정상, deleteDoc 정상, deleteUser 실패
  reauthenticateWithCredential.mockResolvedValueOnce();
  deleteDoc.mockResolvedValueOnce();
  deleteUser.mockRejectedValueOnce(new Error("mock 탈퇴 실패"));

  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("회원 탈퇴"));
  const pwInput = await screen.findByPlaceholderText("비밀번호");
  fireEvent.change(pwInput, { target: { value: "pw1234" } });
  fireEvent.click(screen.getByText("탈퇴"));

  await waitFor(() =>
    expect(screen.getByText(/탈퇴 실패: mock 탈퇴 실패/)).toBeInTheDocument()
  );
});

it("이메일 변경시 인증 필요 에러 분기", async () => {
  const { getDoc, updateDoc } = require("firebase/firestore");
  const { reauthenticateWithCredential, updateEmail } = require("firebase/auth");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  reauthenticateWithCredential.mockResolvedValueOnce();
  updateEmail.mockRejectedValueOnce({
    code: "auth/operation-not-allowed",
    message: "verify the new email",
  });

  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  const textboxes = screen.getAllByRole("textbox");
  fireEvent.change(textboxes[3], { target: { value: "hello@naver.com" } });
  fireEvent.click(screen.getByText("저장"));

  const pwInput = await screen.findByPlaceholderText("비밀번호");
  fireEvent.change(pwInput, { target: { value: "pw1234" } });
  const pwModal = pwInput.closest(".pw-modal");
  const confirmBtn = within(pwModal).getByRole("button", { name: /확인/ });
  fireEvent.click(confirmBtn);

  await waitFor(() =>
    expect(
      screen.getByText(/보안 정책상 연락용 이메일 변경 전 반드시 회원가입 시 사용한한 이메일/)
    ).toBeInTheDocument()
  );
});

it("이메일 변경시 비밀번호 불일치 에러 분기", async () => {
  const { getDoc } = require("firebase/firestore");
  const { reauthenticateWithCredential } = require("firebase/auth");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  reauthenticateWithCredential.mockRejectedValueOnce({
    code: "auth/wrong-password",
    message: "wrong password"
  });

  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  const textboxes = screen.getAllByRole("textbox");
  fireEvent.change(textboxes[3], { target: { value: "hello@naver.com" } });
  fireEvent.click(screen.getByText("저장"));

  const pwInput = await screen.findByPlaceholderText("비밀번호");
  fireEvent.change(pwInput, { target: { value: "pw1234" } });
  const pwModal = pwInput.closest(".pw-modal");
  const confirmBtn = within(pwModal).getByRole("button", { name: /확인/ });
  fireEvent.click(confirmBtn);

  await waitFor(() =>
    expect(
      screen.getByText(/비밀번호가 올바르지 않습니다/)
    ).toBeInTheDocument()
  );
});

it("비밀번호 재설정 메일 발송 실패 시 에러 메시지 표시", async () => {
  const { getDoc } = require("firebase/firestore");
  const { sendPasswordResetEmail } = require("firebase/auth");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  sendPasswordResetEmail.mockRejectedValueOnce(new Error("메일 전송 실패"));

  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("비밀번호 변경"));
  await waitFor(() =>
    expect(screen.getByText(/메일 발송 실패/)).toBeInTheDocument()
  );
});

it("프로필 저장 실패 시 에러 메시지 표시", async () => {
  const { getDoc, updateDoc } = require("firebase/firestore");
  updateDoc.mockRejectedValueOnce(new Error("업데이트 실패"));
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  const textboxes = screen.getAllByRole("textbox");
  fireEvent.change(textboxes[0], { target: { value: "홍길동" } });
  fireEvent.change(textboxes[1], { target: { value: "2000-01-01" } });
  fireEvent.change(textboxes[2], { target: { value: "서울시 강남구" } });
  fireEvent.change(textboxes[3], { target: { value: "test@ex.com" } });
  fireEvent.click(screen.getByText("저장"));

  await waitFor(() =>
    expect(screen.getByText(/저장 실패! 업데이트 실패/)).toBeInTheDocument()
  );
});

it("소셜 로그인 유저는 연락 이메일 안내 메시지 노출", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  await act(async () => {
    renderWithUser(socialUser);
  });
  fireEvent.click(screen.getByText("수정"));
  expect(
    screen.getByText("소셜 계정은 연락 이메일을 변경할 수 없습니다.")
  ).toBeInTheDocument();
});

it("user가 없으면 useEffect 분기 커버 (로딩 유지)", async () => {
  await act(async () => {
    renderWithUser(null);
  });
  expect(screen.getByText("정보를 불러오는 중...")).toBeInTheDocument();
});

it("생년월일이 잘못된 날짜면 false 반환", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-02-30", // 잘못된 날짜
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  const textboxes = screen.getAllByRole("textbox");
  fireEvent.change(textboxes[1], { target: { value: "2000-02-30" } });
  fireEvent.click(screen.getByText("저장"));
  expect(
    await screen.findByText(/YYYY-MM-DD/)
  ).toBeInTheDocument();
});

it("수정 취소 버튼 클릭시 editMode 해제", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  fireEvent.click(screen.getByText("취소"));
  expect(screen.getByText("수정")).toBeInTheDocument(); // 다시 수정버튼 노출
});

it("탈퇴 모달 취소 버튼 클릭시 모달 닫힘", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("회원 탈퇴"));
  fireEvent.click(screen.getByText("취소"));
  expect(screen.queryByPlaceholderText("비밀번호")).not.toBeInTheDocument();
});

it("이메일 변경시 예상치 못한 에러(else 분기)도 잘 처리", async () => {
  const { getDoc } = require("firebase/firestore");
  const { reauthenticateWithCredential } = require("firebase/auth");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  // 에러 코드가 없는 에러 객체
  reauthenticateWithCredential.mockRejectedValueOnce({
    message: "unknown error!"
  });

  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  const textboxes = screen.getAllByRole("textbox");
  fireEvent.change(textboxes[3], { target: { value: "hello@naver.com" } });
  fireEvent.click(screen.getByText("저장"));

  const pwInput = await screen.findByPlaceholderText("비밀번호");
  fireEvent.change(pwInput, { target: { value: "pw1234" } });
  const pwModal = pwInput.closest(".pw-modal");
  const confirmBtn = within(pwModal).getByRole("button", { name: /확인/ });
  fireEvent.click(confirmBtn);

  await waitFor(() =>
    expect(
      screen.getByText(/이메일 변경 실패: unknown error!/)
    ).toBeInTheDocument()
  );
});

it("프로필 정상 저장 시 성공 메시지 노출", async () => {
  const { getDoc, updateDoc } = require("firebase/firestore");
  const { updateProfile } = require("firebase/auth");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  updateDoc.mockResolvedValueOnce();
  updateProfile.mockResolvedValueOnce();
  // 이메일을 바꾸지 않은 상황으로(기존과 동일)
  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  const textboxes = screen.getAllByRole("textbox");
  fireEvent.change(textboxes[0], { target: { value: "테스터" } });
  fireEvent.change(textboxes[1], { target: { value: "2000-01-01" } });
  fireEvent.change(textboxes[2], { target: { value: "서울시 강남구" } });
  fireEvent.change(textboxes[3], { target: { value: "test@example.com" } });
  fireEvent.click(screen.getByText("저장"));

  await waitFor(() =>
    expect(screen.getByText(/정보가 성공적으로 저장되었습니다/)).toBeInTheDocument()
  );
});

it("프로필 저장 실패시 err.message가 없는 경우도 커버", async () => {
  const { getDoc, updateDoc } = require("firebase/firestore");
  updateDoc.mockRejectedValueOnce({});
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  const textboxes = screen.getAllByRole("textbox");
  fireEvent.change(textboxes[0], { target: { value: "테스터" } });
  fireEvent.change(textboxes[1], { target: { value: "2000-01-01" } });
  fireEvent.change(textboxes[2], { target: { value: "서울시 강남구" } });
  fireEvent.change(textboxes[3], { target: { value: "test@example.com" } });
  fireEvent.click(screen.getByText("저장"));

  await waitFor(() =>
    expect(screen.getByText(/저장 실패! 다시 시도해 주세요/)).toBeInTheDocument()
  );
});

it("비밀번호 입력 모달 취소 버튼 클릭 시 모달 닫힘", async () => {
  const { getDoc, updateDoc } = require("firebase/firestore");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  updateDoc.mockResolvedValueOnce();
  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  const textboxes = screen.getAllByRole("textbox");
  fireEvent.change(textboxes[0], { target: { value: "테스터" } });
  fireEvent.change(textboxes[1], { target: { value: "2000-01-01" } });
  fireEvent.change(textboxes[2], { target: { value: "서울시 강남구" } });
  fireEvent.change(textboxes[3], { target: { value: "aaa@bbb.com" } }); // 이메일 변경

  fireEvent.click(screen.getByText("저장"));

  // 비밀번호 모달 등장
  const pwInput = await screen.findByPlaceholderText("비밀번호");
  expect(pwInput).toBeInTheDocument();

  // 취소 버튼 클릭
  const cancelBtn = within(pwInput.closest(".pw-modal")).getByRole("button", { name: /취소/ });
  fireEvent.click(cancelBtn);

  // 모달 닫힘 확인
  await waitFor(() =>
    expect(screen.queryByPlaceholderText("비밀번호")).not.toBeInTheDocument()
  );
});

it("연락 이메일을 성공적으로 변경할 수 있다(정상 플로우 커버)", async () => {
  const { getDoc } = require("firebase/firestore");
  const {
    reauthenticateWithCredential,
    updateEmail,
    sendEmailVerification
  } = require("firebase/auth");

  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });

  reauthenticateWithCredential.mockResolvedValueOnce();
  updateEmail.mockResolvedValueOnce();
  sendEmailVerification.mockResolvedValueOnce();

  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));

  // 이메일 변경
  const textboxes = screen.getAllByRole("textbox");
  fireEvent.change(textboxes[3], { target: { value: "hello2@naver.com" } });
  fireEvent.click(screen.getByText("저장"));

  // 비밀번호 입력 모달
  const pwInput = await screen.findByPlaceholderText("비밀번호");
  fireEvent.change(pwInput, { target: { value: "pw1234" } });
  const pwModal = pwInput.closest(".pw-modal");
  const confirmBtn = within(pwModal).getByRole("button", { name: /확인/ });
  fireEvent.click(confirmBtn);

  // 성공 메시지까지 커버!
  await waitFor(() =>
    expect(screen.getByText(/연락용 이메일이 성공적으로 변경되었습니다/)).toBeInTheDocument()
  );
});

it("수정 모드에서 취소 버튼 클릭시 editMode가 해제된다", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  expect(screen.getByText("취소")).toBeInTheDocument();
  fireEvent.click(screen.getByText("취소"));
  expect(screen.getByText("수정")).toBeInTheDocument();
});

it("비밀번호 변경 모달에서 취소 버튼 클릭 시 모달이 닫힌다", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      name: "테스터",
      birth: "2000-01-01",
      address: "서울시 강남구",
      email: "test@example.com",
    }),
  });
  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("수정"));
  const textboxes = screen.getAllByRole("textbox");
  fireEvent.change(textboxes[3], { target: { value: "abc@naver.com" } });
  fireEvent.click(screen.getByText("저장"));
  // 비밀번호 입력 모달 등장
  const pwInput = await screen.findByPlaceholderText("비밀번호");
  const cancelBtn = within(pwInput.closest(".pw-modal")).getByRole("button", { name: /취소/ });
  fireEvent.click(cancelBtn);
  // 모달이 닫혀야 함
  await waitFor(() =>
    expect(screen.queryByPlaceholderText("비밀번호")).not.toBeInTheDocument()
  );
});