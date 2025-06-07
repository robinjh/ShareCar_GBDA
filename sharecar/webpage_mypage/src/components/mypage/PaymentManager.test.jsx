jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve({})),
  arrayUnion: jest.fn((v) => v),
  arrayRemove: jest.fn((v) => v),
  getFirestore: jest.fn(() => ({})),
}));

import "@testing-library/jest-dom";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import PaymentManager, { maskCardNumber } from "./PaymentManager";
import { UserContext } from "../../UserContext";

// 반드시 한 번만 mock 선언!

const mockUser = { uid: "test-user" };

beforeEach(() => {
  jest.clearAllMocks();
  window.alert = jest.fn();
});

// 공용 렌더 함수 (UserContext 포함)
function renderWithUser(user = mockUser) {
  return render(
    <UserContext.Provider value={{ user }}>
      <PaymentManager />
    </UserContext.Provider>
  );
}


// 2. 카드 등록 정상 시나리오
test("카드 등록 모달에서 모든 값 입력시 정상 등록", async () => {
  const { getDoc, updateDoc } = require("firebase/firestore");
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ paymentMethods: [] }),
  });
  updateDoc.mockResolvedValue({});

  await act(async () => {
  renderWithUser();
});

  // 카드 등록 모달 열기
  fireEvent.click(screen.getByText("카드 등록"));

  fireEvent.change(screen.getByPlaceholderText("카드번호 (숫자 16자리)"), {
    target: { value: "1234123412341234" },
  });
  fireEvent.change(screen.getByPlaceholderText("유효기간 (MM/YY)"), {
    target: { value: "12/34" },
  });
  fireEvent.change(screen.getByPlaceholderText("소유자명"), {
    target: { value: "홍길동" },
  });
  fireEvent.change(screen.getByPlaceholderText("CVC (3자리)"), {
    target: { value: "123" },
  });
  fireEvent.change(screen.getByDisplayValue("카드사 선택"), {
    target: { value: "신한카드" },
  });

  fireEvent.click(screen.getByText("등록"));

  await waitFor(() => {
    expect(updateDoc).toHaveBeenCalled();
    expect(screen.getByText(/신한카드/)).toBeInTheDocument();
    expect(screen.getByText(/1234-.*-.*-1234/)).toBeInTheDocument();
  });
});

// 5. 계좌 등록 정상 시나리오 (유사하게 추가)
test("계좌 등록 모달에서 모든 값 입력시 정상 등록", async () => {
  const { getDoc, updateDoc } = require("firebase/firestore");
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ paymentMethods: [] }),
  });
  updateDoc.mockResolvedValue({});

  await act(async () => {
  renderWithUser();
});

  fireEvent.click(screen.getByText("계좌 등록"));
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "국민은행" } });
  fireEvent.change(screen.getByPlaceholderText("계좌번호 (12~14자리)"), {
    target: { value: "12345678901234" },
  });
  fireEvent.change(screen.getByPlaceholderText("예금주명"), {
    target: { value: "홍길동" },
  });
  fireEvent.click(screen.getByText("등록"));

  await waitFor(() => {
    expect(updateDoc).toHaveBeenCalled();
    expect(screen.getByText(/국민은행/)).toBeInTheDocument();
    expect(screen.getByText(/12345678901234/)).toBeInTheDocument();
  });
});

// 7. 비로그인 상태
test("로그인하지 않은 경우 안내 메시지만 렌더", async () => {
  await act(async () => {
    renderWithUser(null);
  });
  expect(screen.getByText("등록된 카드가 없습니다.")).toBeInTheDocument();
  expect(screen.getByText("등록된 계좌가 없습니다.")).toBeInTheDocument();
});

test("userSnap.exists() false일 때 카드/계좌 미등록 안내만 렌더", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValue({
    exists: () => false,
    data: () => ({}),
  });
  await act(async () => {
    renderWithUser();
  });
  expect(screen.getByText("등록된 카드가 없습니다.")).toBeInTheDocument();
  expect(screen.getByText("등록된 계좌가 없습니다.")).toBeInTheDocument();
});

test("카드 등록 필수값 누락시 alert 호출", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ paymentMethods: [] }),
  });

  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("카드 등록"));
  // 입력 없이 등록
  fireEvent.click(screen.getByText("등록"));
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("모든 항목을 입력"));
});

test("계좌 등록 필수값 누락시 alert 호출", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ paymentMethods: [] }),
  });

  await act(async () => {
    renderWithUser();
  });
  fireEvent.click(screen.getByText("계좌 등록"));
  // 입력 없이 등록
  fireEvent.click(screen.getByText("등록"));
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("모든 항목을 입력"));
});

test("카드 삭제 버튼 클릭 시 리스트에서 항목이 사라진다", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      paymentMethods: [
        { type: "card", company: "신한카드", number: "1111222233334444", owner: "홍길동" },
        { type: "account", bank: "국민은행", number: "12345678901234", owner: "홍길동" }
      ]
    }),
  });

  await act(async () => {
  renderWithUser();
});

  await waitFor(() => {
    expect(screen.getByText(/신한카드/)).toBeInTheDocument();
    expect(screen.getByText(/국민은행/)).toBeInTheDocument();
  });

  // 삭제 버튼 클릭 (카드)
  const deleteBtns = screen.getAllByRole("button", { name: "삭제" });
  fireEvent.click(deleteBtns[0]);
  await waitFor(() =>
    expect(screen.queryByText(/신한카드/)).not.toBeInTheDocument()
  );
   fireEvent.click(deleteBtns[1]);
   await waitFor(() =>
     expect(screen.queryByText(/국민은행/)).not.toBeInTheDocument()
   );
});

test("maskCardNumber - 빈 값", () => {
  expect(maskCardNumber("")).toBe("");
  expect(maskCardNumber(undefined)).toBe("");
  expect(maskCardNumber(null)).toBe("");
});

test("카드/계좌 삭제 버튼 클릭 시 리스트에서 항목이 사라진다", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      paymentMethods: [
        { type: "card", company: "신한카드", number: "1111222233334444", owner: "홍길동" },
        { type: "account", bank: "국민은행", number: "12345678901234", owner: "홍길동" },
      ]
    }),
  });

  await act(async () => {
  renderWithUser();
});

  await waitFor(() => {
    expect(screen.getByText(/신한카드/)).toBeInTheDocument();
    expect(screen.getByText(/국민은행/)).toBeInTheDocument();
  });

  
  const deleteBtns = screen.getAllByRole("button", { name: "삭제" });
  fireEvent.click(deleteBtns[0]);
  // 그냥 UI에서 사라지기만 검증(updateDoc 호출 검증 안함)
  await waitFor(() =>
    expect(screen.queryByText(/신한카드/)).not.toBeInTheDocument()
  );
});

test("paymentMethods undefined 시 빈 배열 분기 커버", async () => {
  const { getDoc } = require("firebase/firestore");
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({}), // paymentMethods가 undefined
  });

  await act(async () => {
  renderWithUser();
});

  expect(screen.getByText("등록된 카드가 없습니다.")).toBeInTheDocument();
  expect(screen.getByText("등록된 계좌가 없습니다.")).toBeInTheDocument();
});

test("user가 null 상태에서 결제수단 등록 시 아무 동작도 하지 않는다", async () => {
  // user: null로 context 설정
  renderWithUser(null);

  // 등록 모달 열기
  fireEvent.click(screen.getByText("계좌 등록"));

  // 폼 입력 (임의로 정상 값 입력)
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "국민은행" } });
  fireEvent.change(screen.getByPlaceholderText("계좌번호 (12~14자리)"), {
    target: { value: "12345678901234" },
  });
  fireEvent.change(screen.getByPlaceholderText("예금주명"), {
    target: { value: "홍길동" },
  });

  // 등록 버튼 클릭
  fireEvent.click(screen.getByText("등록"));

  // updateDoc이 호출되지 않았는지(아무 동작도 안 일어났는지) 확인
  const { updateDoc } = require("firebase/firestore");
  expect(updateDoc).not.toHaveBeenCalled();

  // 등록 모달이 닫혔는지도(선택) 확인
  await waitFor(() => {
    expect(screen.queryByPlaceholderText("계좌번호 (12~14자리)")).not.toBeInTheDocument();
  });
});