import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MyPage from "./MyPage";
import { UserContext } from "../../UserContext";

const menus = [
  { label: "📜 대여 기록" },
  { label: "🚗 차량 관리" },
  { label: "💳 결제 수단" },
  { label: "📥 나에게 온 요청" },
  { label: "👤 내 정보" },
];

describe("MyPage", () => {
  it("renders and opens/closes all modals in light mode", () => {
    render(
      <UserContext.Provider value={{ user: { uid: "test-user" }, setRefreshUser: jest.fn() }}>
        <MyPage isDarkMode={false} toggleMode={jest.fn()} />
      </UserContext.Provider>
    );
    menus.forEach(({ label }) => {
      const button = screen.getAllByText(label).find(el => el.closest('button'));
      fireEvent.click(button);
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "×" }));
      expect(screen.queryByRole("heading", { name: label })).not.toBeInTheDocument();
    });
  });

  it("renders and opens/closes all modals in dark mode", () => {
    render(
      <UserContext.Provider value={{ user: { uid: "test-user" }, setRefreshUser: jest.fn() }}>
        <MyPage isDarkMode={true} toggleMode={jest.fn()} />
      </UserContext.Provider>
    );
    menus.forEach(({ label }) => {
      const button = screen.getAllByText(label).find(el => el.closest('button'));
      fireEvent.click(button);
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "×" }));
      expect(screen.queryByRole("heading", { name: label })).not.toBeInTheDocument();
    });
  });
});