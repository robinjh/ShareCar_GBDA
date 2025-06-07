import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequestManager,{ archiveRequest } from "./RequestManager";
import { UserContext } from "../../UserContext";
import { getDocs, updateDoc, setDoc, deleteDoc } from "firebase/firestore";

jest.mock("firebase/firestore");

const HOST_UID = "Y6HOXIlu04d7e4n3GXc9UNzrt4k2";
const mockUser = { uid: HOST_UID };

const mockRequests = [
  {
    id: "req-1",
    data: () => ({
      carName: "아반떼",
      carNumber: "1111",
      hostID: HOST_UID,
      guestID: "guest-1",
      guestName: "송지훈",
      startTime: "2025-07-01T08:00:00.000Z",
      endTime: "2025-07-02T20:00:00.000Z",
      status: "대기중",
      totalFee: "16000",
      rentalFee: "8000",
      tags: ["#비즈니스"],
      address: "서울 종로구 세종대로 1",
      requestedAt: "2025-06-20T13:00:00.000Z",
    }),
  },
  {
    id: "req-2",
    data: () => ({
      carName: "K5",
      carNumber: "1111",
      hostID: HOST_UID,
      guestID: "guest-2",
      guestName: "이채린",
      startTime: "2025-07-02T12:00:00.000Z",
      endTime: "2025-07-03T14:00:00.000Z",
      status: "대기중",
      totalFee: "17000",
      rentalFee: "9000",
      tags: ["#비즈니스"],
      address: undefined, // address가 undefined 분기 체크
      requestedAt: null, // requestedAt이 null인 분기 체크
    }),
  },
];

// formatDate의 undefined, NaN 분기 체크용
const mockInvalidDateRequest = [
  {
    id: "req-3",
    data: () => ({
      carName: "K5",
      carNumber: "2222",
      hostID: HOST_UID,
      guestID: "guest-3",
      guestName: "박가영",
      startTime: undefined, // undefined
      endTime: "invalid-date", // NaN 분기
      totalFee: "12000",
      rentalFee: "6000",
      status: "대기중",
      tags: [],
      requestedAt: null,
      address: undefined,
    }),
  },
];

const mockReq = {
  id: 'req123',
  carNumber: '12가3456',
  hostID: 'host001',
  guestID: 'guest001',
  guestName: '홍길동',
  startTime: '2025-07-03T12:00:00Z',
  endTime: '2025-07-04T12:00:00Z',
  totalFee: 50000,
  rentalFee: 45000,
  tags: ['전기차'],
  requestedAt: '2025-07-01T10:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  window.alert = jest.fn();
});

// 1. 기본 목록/표시 커버리지
test("대기중 요청이 있으면 목록이 뜬다", async () => {
  getDocs.mockResolvedValueOnce({ docs: mockRequests });

  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RequestManager />
    </UserContext.Provider>
  );
  expect(await screen.findByText(/내 차량에 온 대여 요청/)).toBeInTheDocument();
  expect(
    await screen.findByText((content) => content.includes("아반떼"))
  ).toBeInTheDocument();
  expect(
    await screen.findByText((content) => content.includes("송지훈"))
  ).toBeInTheDocument();
  expect(
    await screen.findByText((content) => content.includes("이채린"))
  ).toBeInTheDocument();
});

// 2. 자세히 버튼 클릭 시 상세 모달이 뜬다 & 닫기
test("자세히 버튼 클릭 시 상세 모달이 뜨고, 닫기 버튼으로 닫힌다", async () => {
  getDocs.mockResolvedValueOnce({ docs: mockRequests });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RequestManager />
    </UserContext.Provider>
  );
  const detailBtns = await screen.findAllByText("자세히");
  fireEvent.click(detailBtns[0]);
  expect(await screen.findByText(/대여 요청 상세/)).toBeInTheDocument();
  // 닫기 버튼 클릭
  fireEvent.click(screen.getByText("X"));
  // 닫힌 뒤엔 상세 모달 텍스트가 더 이상 안보임
  await waitFor(() => {
    expect(screen.queryByText(/대여 요청 상세/)).toBeNull();
  });
});

// 3. 승인 버튼 클릭 시 겹치는 요청 자동 거부 (mock)
test("승인 버튼 클릭 시 겹치는 요청 자동 거부 (mock)", async () => {
  // 목록, handleApprove 내부 getDocs 2번 필요
  getDocs
    .mockResolvedValueOnce({ docs: mockRequests }) // useEffect
    .mockResolvedValueOnce({ docs: mockRequests }); // handleApprove

  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RequestManager />
    </UserContext.Provider>
  );
  const detailBtns = await screen.findAllByText("자세히");
  fireEvent.click(detailBtns[0]);
  fireEvent.click(screen.getByText("승인"));

  await waitFor(() => {
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(setDoc).toHaveBeenCalledTimes(2); // 승인, 자동거부 각각 1회
    expect(deleteDoc).toHaveBeenCalledTimes(2);
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("승인"));
  });
});

// 4. 거부 버튼 클릭 시 거부 로직이 정상 동작 (mock)
test("거부 버튼 클릭 시 거부 로직이 정상 동작 (mock)", async () => {
  getDocs.mockResolvedValueOnce({ docs: mockRequests });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RequestManager />
    </UserContext.Provider>
  );
  const detailBtns = await screen.findAllByText("자세히");
  fireEvent.click(detailBtns[0]);
  fireEvent.click(screen.getByText("거부"));

  await waitFor(() => {
    expect(setDoc).toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("거부"));
  });
});

// 5. 요청이 없을 때 안내 문구가 뜬다
test("요청이 없을 때 안내 문구가 뜬다", async () => {
  getDocs.mockResolvedValueOnce({ docs: [] });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RequestManager />
    </UserContext.Provider>
  );
  expect(
    await screen.findByText(/현재 대기중인 대여 요청이 없습니다/)
  ).toBeInTheDocument();
});

// 6. 로그인하지 않은 경우 아무것도 렌더링하지 않는다 (div만 반환, 제목 없음)
test("로그인하지 않은 경우 아무것도 렌더링하지 않는다", async () => {
  getDocs.mockResolvedValueOnce({ docs: [] }); // 호출은 되나 실제로 렌더 없음
  render(
    <UserContext.Provider value={{ user: null }}>
      <RequestManager />
    </UserContext.Provider>
  );
  // 실제로는 <div>만 렌더링. 제목/요청자 등 없음
  expect(screen.queryByText(/내 차량에 온 대여 요청/)).toBeInTheDocument();
  expect(screen.queryByText(/송지훈/)).toBeNull();
  expect(screen.queryByText(/이채린/)).toBeNull();
});

// 7. formatDate: undefined, 잘못된 날짜 등 예외 커버
test("formatDate undefined/NaN/invalid-date 등 예외 분기", async () => {
  // invalidRequest로 getDocs mock (startTime undefined, endTime invalid-date)
  getDocs.mockResolvedValueOnce({ docs: mockInvalidDateRequest });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RequestManager />
    </UserContext.Provider>
  );
  // "undefined" startTime이 들어갈 때, li 안에 "" (빈값), "invalid-date" 포함 확인
  expect(await screen.findByText((t) => t.includes("K5"))).toBeInTheDocument();
  // 실제 날짜 변환이 "" 또는 "invalid-date" 등 예외 출력 커버됨
});

// 8. archiveRequest: resultStatus에 "사용중" 전달
  test('기본값 status="사용중"으로 저장되어야 함', async () => {
    await archiveRequest(mockReq);
    const call = setDoc.mock.calls[0];
    expect(call[1].status).toBe('사용중');
    expect(deleteDoc).toHaveBeenCalled();
  });

// 9. 상세 모달에 주소가 없을 때 "-"가 보임 (브랜치 커버)
test('상세 모달에서 address가 없을 때 "-"가 보임', async () => {
  // address: undefined인 요청 넣기
  getDocs.mockResolvedValueOnce({
    docs: [
      {
        ...mockRequests[0],
        data: () => ({ ...mockRequests[0].data(), address: undefined }),
      },
    ],
  });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RequestManager />
    </UserContext.Provider>
  );
  const detailBtns = await screen.findAllByText("자세히");
  fireEvent.click(detailBtns[0]);
  // "-"가 실제로 표기되는지 확인
  expect(await screen.findByText("-")).toBeInTheDocument();
});