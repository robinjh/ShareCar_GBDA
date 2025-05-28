import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VehicleManager from "./VehicleManager";
import { UserContext } from "../../UserContext";

// 🔥 반드시 최상단에 위치
jest.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  doc: jest.fn(),
}));

const mockUser = { uid: "Y6HOXIlu04d7e4n3GXc9UNzrt4k2" };

// 🏁 테스트마다 mock 데이터 fresh하게
const mockCars = [
  {
    id: "1111",
    data: () => ({
      carBrand: "현대",
      carName: "아반떼",
      carNumber: "1111",
      carType: "중형",
      rentalFee: "8000",
      tags: ["#비즈니스", "#친구들과 함께"],
    }),
  },
  {
    id: "2222",
    data: () => ({
      carBrand: "기아",
      carName: "K5",
      carNumber: "2222",
      carType: "중형",
      rentalFee: "9000",
      tags: ["#장거리 운전용", "#가족과 함께"],
    }),
  },
  {
    id: "3333",
    data: () => ({
      carBrand: "쉐보레",
      carName: "스파크",
      carNumber: "3333",
      carType: "소형",
      rentalFee: "6500",
      tags: ["#혼자 힐링", "#도심 드라이브"],
    }),
  },
];

describe("VehicleManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("user가 null이면 '로딩 중...'과 '차량 등록' 버튼이 렌더링된다", () => {
    const { container } = render(
      <UserContext.Provider value={{ user: null }}>
        <VehicleManager />
      </UserContext.Provider>
    );
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
    expect(screen.getByText("차량 등록")).toBeInTheDocument();
  });
  it("'로딩 중...' 메시지가 먼저 나온다", async () => {
    const { getDocs } = require("firebase/firestore");
    getDocs.mockResolvedValueOnce({
      docs: mockCars.map((car) => ({
        id: car.id,
        data: car.data,
      })),
    });
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <VehicleManager />
      </UserContext.Provider>
    );
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
    expect(
      await screen.findByText((content) => content.includes("현대"))
    ).toBeInTheDocument();
  });

  it("차량 목록이 모두 렌더링된다", async () => {
    const { getDocs } = require("firebase/firestore");
    getDocs.mockResolvedValueOnce({
      docs: mockCars.map((car) => ({
        id: car.id,
        data: car.data,
      })),
    });
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <VehicleManager />
      </UserContext.Provider>
    );
    for (const car of mockCars) {
      expect(
        await screen.findByText((text) => text.includes(car.data().carBrand))
      ).toBeInTheDocument();
    }
  });

  it("차량이 없을 때 메시지가 정상 노출된다", async () => {
    const { getDocs } = require("firebase/firestore");
    getDocs.mockResolvedValueOnce({ docs: [] });
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <VehicleManager />
      </UserContext.Provider>
    );
    expect(
      await screen.findByText("등록한 차량이 없습니다.")
    ).toBeInTheDocument();
  });

  it("차량 등록 버튼 클릭시 라우팅이 발생한다", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
    const { getDocs } = require("firebase/firestore");
    getDocs.mockResolvedValueOnce({ docs: [] });
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <VehicleManager />
      </UserContext.Provider>
    );
    const regBtn = await screen.findByText("차량 등록");
    fireEvent.click(regBtn);
    expect(window.location.href).toBe("/register-car");
  });

  it("차량 삭제 버튼 클릭시 confirm 후 정상 삭제", async () => {
    const { getDocs, deleteDoc } = require("firebase/firestore");
    getDocs.mockResolvedValueOnce({
      docs: mockCars.map((car) => ({
        id: car.id,
        data: car.data,
      })),
    });
    deleteDoc.mockResolvedValueOnce();
    window.confirm = jest.fn(() => true);
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <VehicleManager />
      </UserContext.Provider>
    );
    const delBtns = await screen.findAllByText("삭제");
    fireEvent.click(delBtns[0]);
    await waitFor(() => {
      expect(screen.getAllByText("삭제").length).toBe(mockCars.length - 1);
    });
  });

  it("삭제 취소시 차량 삭제 안 됨", async () => {
    const { getDocs } = require("firebase/firestore");
    getDocs.mockResolvedValueOnce({
      docs: mockCars.map((car) => ({
        id: car.id,
        data: car.data,
      })),
    });
    window.confirm = jest.fn(() => false);
    render(
      <UserContext.Provider value={{ user: mockUser }}>
        <VehicleManager />
      </UserContext.Provider>
    );
    const delBtns = await screen.findAllByText("삭제");
    fireEvent.click(delBtns[0]);
    expect(screen.getAllByText("삭제").length).toBe(mockCars.length);
  });
});
