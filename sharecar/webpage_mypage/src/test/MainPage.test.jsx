import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MainPage from "../components/mainpage/MainPage";

describe("MainPage", () => {
  it("renders all main sections and text", () => {
    render(<MainPage />);
    // 상단 헤더
    expect(screen.getByText("ShareCar 프로젝트")).toBeInTheDocument();
    expect(screen.getByText("자율 주행을 언제 어디서나 쉽고 빠르게!")).toBeInTheDocument();
    // 버튼
    expect(screen.getByText("내 차량 등록하기")).toBeInTheDocument();
    expect(screen.getByText("차량 대여하기")).toBeInTheDocument();
    // 기능 섹션
    expect(screen.getByText("핵심 기능")).toBeInTheDocument();
    expect(screen.getByText("왜 ShareCar 인가?")).toBeInTheDocument();
    expect(screen.getByText("왜 ShareCar를 써야 하는가?")).toBeInTheDocument();
    expect(screen.getByText("왜 ShareCar여야만 하는가?")).toBeInTheDocument();
    // 서비스 소개
    expect(screen.getByText("서비스 소개")).toBeInTheDocument();
    expect(screen.getByText(/우리 Sharecar는 여러 유용한 서비스를 지원합니다/)).toBeInTheDocument();
  });

  it("calls onPageChange('registration') when '내 차량 등록하기' clicked", () => {
    const onPageChange = jest.fn();
    render(<MainPage onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText("내 차량 등록하기"));
    expect(onPageChange).toHaveBeenCalledWith("registration");
  });

  it("calls onPageChange('rental') when '차량 대여하기' clicked", () => {
    const onPageChange = jest.fn();
    render(<MainPage onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText("차량 대여하기"));
    expect(onPageChange).toHaveBeenCalledWith("rental");
  });

  it("renders with no onPageChange without crashing", () => {
    // onPageChange가 undefined여도 동작
    render(<MainPage />);
    fireEvent.click(screen.getByText("내 차량 등록하기"));
    fireEvent.click(screen.getByText("차량 대여하기"));
    // crash 없이 통과하면 성공!
  });
});
