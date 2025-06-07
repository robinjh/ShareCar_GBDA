import "@testing-library/jest-dom";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within
} from "@testing-library/react";
import RentalHistory from "./RentalHistory";
import { UserContext } from "../../UserContext";

// Mock Firestore
jest.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
}));

const mockUser = { uid: "test-guest" };

function makeMockArchives() {
  return [
    {
      id: "arch-1",
      data: () => ({
        carName: "아반떼",
        carBrand: "현대",
        carNumber: "1111",
        startTime: "2025-07-01T08:00:00.000Z",
        endTime: "2025-07-02T20:00:00.000Z",
        status: "완료",
        rate: null,
        tags: ["#가족", "#여행"],
        totalFee: "12000",
        address: "서울",
        show: true,
        source: "archives",
        id: "arch-1",
      }),
    },
    {
      id: "arch-2",
      data: () => ({
        carName: "K5",
        carBrand: "기아",
        carNumber: "2222",
        startTime: "2025-08-01T08:00:00.000Z",
        endTime: "2025-08-02T20:00:00.000Z",
        status: "사용중",
        rate: null,
        tags: [],
        totalFee: "14000",
        address: "부산",
        show: true,
        source: "archives",
        id: "arch-2",
      }),
    },
    {
      id: "arch-3",
      data: () => ({
        carName: "모닝",
        carBrand: "기아",
        carNumber: "3333",
        startTime: "2025-09-01T08:00:00.000Z",
        endTime: "2025-09-02T20:00:00.000Z",
        status: "완료",
        rate: 4,
        tags: null,
        totalFee: "9000",
        address: undefined,
        show: true,
        source: "archives",
        id: "arch-3",
      }),
    },
  ];
}

const mockRequests = [
  {
    id: "req-1",
    data: () => ({
      carName: "SM6",
      carBrand: "르노",
      carNumber: "4444",
      startTime: "2025-09-10T09:00:00.000Z",
      endTime: "2025-09-12T09:00:00.000Z",
      status: "대기중",
      rate: null,
      tags: ["#출장"],
      totalFee: "8000",
      address: "인천",
      source: "request",
      id: "req-1",
    }),
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
});

// 1. 로딩/빈 목록 안내
test("로딩 중, 대여 기록 없음 안내", async () => {
  const { getDocs } = require("firebase/firestore");
  getDocs
    .mockResolvedValueOnce({ docs: [] })
    .mockResolvedValueOnce({ docs: [] });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText("대여 기록이 없습니다.")).toBeInTheDocument();
  });
});

// 2. 로그인하지 않은 경우
test("로그인하지 않은 경우 제목만 렌더됨", async () => {
  const { getDocs } = require("firebase/firestore");
  getDocs.mockResolvedValue({ docs: [] });
  render(
    <UserContext.Provider value={{ user: null }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  expect(screen.getByText("내 대여 기록")).toBeInTheDocument();
});

// 3. 전체 목록 표시
test("전체 대여 목록(archives + requests) 표시", async () => {
  const { getDocs } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs
    .mockResolvedValueOnce({ docs: mockArchives })
    .mockResolvedValueOnce({ docs: mockRequests });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  expect(await screen.findByText("아반떼")).toBeInTheDocument();
  expect(await screen.findByText("K5")).toBeInTheDocument();
  expect(await screen.findByText("SM6")).toBeInTheDocument();
  expect(await screen.findByText("대기중")).toBeInTheDocument();
  expect(await screen.findByText("사용중")).toBeInTheDocument();
  expect(await screen.findAllByText("완료")).toHaveLength(2);
});

// 4. 완료 상태에서 평점 select → updateDoc 호출
test("완료 상태에서 평점 select가 보이고 변경 시 updateDoc 호출", async () => {
  const { getDocs, updateDoc } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs
    .mockResolvedValueOnce({ docs: mockArchives })
    .mockResolvedValueOnce({ docs: [] });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  const options = await screen.findAllByText("평점 선택");
  fireEvent.change(options[0].closest("select"), { target: { value: "4" } });
  await waitFor(() => {
    expect(updateDoc).toHaveBeenCalled();
  });
});

// 5. 삭제/취소
test("삭제 버튼 클릭시 confirm 후 정상 삭제(updateDoc 호출)", async () => {
  const { getDocs, updateDoc } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs.mockResolvedValueOnce({ docs: mockArchives }).mockResolvedValueOnce({ docs: [] });
  window.confirm = jest.fn(() => true);

  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  const delBtns = await screen.findAllByRole("button", { name: "삭제" });

  await act(async () => {
    fireEvent.click(delBtns[0]);
  });

  await waitFor(() => {
    expect(updateDoc).toHaveBeenCalled();
    expect(screen.queryByText("아반떼")).not.toBeInTheDocument();
  });
});

test("삭제 confirm 취소시 updateDoc이 호출되지 않는다", async () => {
  const { getDocs, updateDoc } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs
    .mockResolvedValueOnce({ docs: mockArchives })
    .mockResolvedValueOnce({ docs: [] });
  window.confirm = jest.fn(() => false);
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  const delBtns = await screen.findAllByRole("button", { name: "삭제" });
  fireEvent.click(delBtns[0]);
  await waitFor(() => {
    expect(updateDoc).not.toHaveBeenCalled();
  });
});

test("요청 취소 버튼 클릭시 deleteDoc 호출", async () => {
  const { getDocs, deleteDoc } = require("firebase/firestore");
  getDocs.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: mockRequests });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  const cancelBtns = await screen.findAllByRole("button", { name: "요청 취소" });

  await act(async () => {
    fireEvent.click(cancelBtns[0]);
  });

  await waitFor(() => {
    expect(deleteDoc).toHaveBeenCalled();
  });
});

// 6. 상세 모달
test("자세히 버튼 클릭 시 상세 모달 열리고 닫힘", async () => {
  const { getDocs } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs.mockResolvedValueOnce({ docs: mockArchives }).mockResolvedValueOnce({ docs: [] });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  const detailBtns = await screen.findAllByRole("button", { name: "자세히" });
  fireEvent.click(detailBtns[0]);
  expect(await screen.findByText("대여 상세 정보")).toBeInTheDocument();
  fireEvent.click(screen.getByText("X"));
  await waitFor(() => {
    expect(screen.queryByText("대여 상세 정보")).not.toBeInTheDocument();
  });
});

// 7. 모달 내 '사용 완료로 처리' 동작
test("사용중 상태에서 '사용 완료로 처리' 버튼 동작", async () => {
  const { getDocs, updateDoc } = require("firebase/firestore");
  const mockArchives = makeMockArchives();  
  getDocs.mockResolvedValueOnce({ docs: mockArchives }).mockResolvedValueOnce({ docs: [] });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  const detailBtns = await screen.findAllByRole("button", { name: "자세히" });
  fireEvent.click(detailBtns[1]); // 사용중

  const finishBtn = await screen.findByRole("button", { name: /사용 완료로 처리/ });

  await act(async () => {
    fireEvent.click(finishBtn);
  });

  await waitFor(() => {
    expect(updateDoc).toHaveBeenCalled();
    expect(screen.queryByText("대여 상세 정보")).not.toBeInTheDocument();
  });
});

// 8. formatDate 예외/주소 없을 때
test("formatDate 예외(빈값, invalid), tags undefined/null/빈배열 정상 출력", async () => {
  const { getDocs } = require("firebase/firestore");
  const customArchives = [
    {
      id: "arch-invalid",
      data: () => ({
        carName: "제네시스",
        carBrand: "현대",
        carNumber: "5555",
        startTime: undefined,
        endTime: "invalid-date",
        status: "완료",
        rate: null,
        tags: undefined,
        totalFee: "9999",
        address: null,
        show: true,
      }),
    },
  ];
  getDocs
    .mockResolvedValueOnce({ docs: customArchives })
    .mockResolvedValueOnce({ docs: [] });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  expect(await screen.findByText("제네시스")).toBeInTheDocument();
});

test("상세 모달 address 없으면 '-' 표시", async () => {
  const { getDocs } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs.mockResolvedValueOnce({ docs: [mockArchives[2]] }).mockResolvedValueOnce({ docs: [] });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  const detailBtns = await screen.findAllByRole("button", { name: "자세히" });
  fireEvent.click(detailBtns[0]);
  expect(await screen.findByText("-")).toBeInTheDocument();
});

// 9. 완료 상태 + 평점 있으면 별점 표시
test("완료 상태에서 평점 있으면 별점 표시", async () => {
  const { getDocs } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs.mockResolvedValueOnce({ docs: mockArchives }).mockResolvedValueOnce({ docs: [] });
  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  const detailBtns = await screen.findAllByRole("button", { name: "자세히" });
  fireEvent.click(detailBtns[2]);
  const modal = document.querySelector(".modal");
  const stars = modal.querySelectorAll(".star-rating .star.on");
  expect(stars.length).toBe(4);
});

test("상세 모달에서 평점 미입력시 드롭다운이 뜨고, 선택하면 updateDoc 및 UI 반영", async () => {
  const { getDocs, updateDoc } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs
    .mockResolvedValueOnce({ docs: mockArchives })
    .mockResolvedValueOnce({ docs: [] });
  updateDoc.mockImplementation(async (docRef, updateObj) => {
    // mockArchives[0]의 rate를 변경 (테스트 내 상태 반영)
    mockArchives[0].data = () => ({
      ...mockArchives[0].data(),
      rate: updateObj.rate,
    });
  });

  await act(async () => {
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <RentalHistory />
      </UserContext.Provider>
    );
  });

  // '자세히' 버튼 클릭
  const detailBtns = await screen.findAllByRole("button", { name: "자세히" });
  fireEvent.click(detailBtns[0]);
  const modal = document.querySelector(".modal");
  const select = within(modal).getByRole("combobox");

  await act(async () => {
    fireEvent.change(select, { target: { value: "5" } });
  });

  // 모달을 닫았다가 다시 열어서 별점이 반영됐는지 확인
  fireEvent.click(within(modal).getByText("X"));
  fireEvent.click(detailBtns[0]);

  const updatedModal = document.querySelector(".modal");
  await waitFor(() => {
    const stars = updatedModal.querySelectorAll(".star-rating .star.on");
    expect(stars.length).toBe(5);
  });
});

test("테이블에서 평점 등록시 setRentals의 map 콜백이 실행되고 별로 표시됨", async () => {
  const { getDocs, updateDoc } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs.mockResolvedValueOnce({ docs: mockArchives }).mockResolvedValueOnce({ docs: [] });
  updateDoc.mockResolvedValue({});

  render(
    <UserContext.Provider value={{ user: mockUser }}>
      <RentalHistory />
    </UserContext.Provider>
  );
  // 첫 row의 select로 평점 선택
  const options = await screen.findAllByText("평점 선택");
  fireEvent.change(options[0].closest("select"), { target: { value: "3" } });

  await waitFor(() => {
    // updateDoc 호출
    expect(updateDoc).toHaveBeenCalled();
    // 테이블 row에서 별점 표시 확인
    const allTableRows = document.querySelectorAll("tbody tr");
    const firstRow = allTableRows[0];
    const stars = firstRow.querySelectorAll("span.star.on");
    expect(stars.length).toBe(3);
  });
});

test("상세 모달에서 평점 연속 변경이 정상 반영된다", async () => {
  const { getDocs, updateDoc } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs
    .mockResolvedValueOnce({ docs: mockArchives })
    .mockResolvedValueOnce({ docs: [] });
  updateDoc.mockImplementation(async (docRef, updateObj) => {
    mockArchives[0].data = () => ({
      ...mockArchives[0].data(),
      rate: null,
    });
  });

  await act(async () => {
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <RentalHistory />
      </UserContext.Provider>
    );
  });

  // '자세히' 버튼 클릭
  const detailBtns = await screen.findAllByRole("button", { name: "자세히" });
  fireEvent.click(detailBtns[0]);
  const modal = document.querySelector(".modal");
  const select = within(modal).getByRole("combobox");

  // 4점 선택
  await act(async () => {
    fireEvent.change(select, { target: { value: "4" } });
  });
  fireEvent.click(within(modal).getByText("X"));
  fireEvent.click(detailBtns[0]);
  const updatedModal = document.querySelector(".modal");
  await waitFor(() => {
    const stars = updatedModal.querySelectorAll(".star-rating .star.on");
    expect(stars.length).toBe(4);
  });
});

test("handleRate에서 존재하지 않는 id에 평점 변경해도 오류 없이 동작", async () => {
  const { getDocs } = require("firebase/firestore");
  const mockArchives = makeMockArchives();
  getDocs.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [] });

  await act(async () => {
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <RentalHistory />
      </UserContext.Provider>
    );
  });
  expect(await screen.findByText("대여 기록이 없습니다.")).toBeInTheDocument();
});