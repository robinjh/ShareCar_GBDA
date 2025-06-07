import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Modal from "./Modal";

// 각 테스트 끝날 때마다 DOM 정리
afterEach(cleanup);

describe("Modal", () => {
  it("is not rendered when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()} title="Test Title">
        Modal Content
      </Modal>
    );
    expect(screen.queryByText("Modal Content")).not.toBeInTheDocument();
    expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
  });

  it("renders with title and content when open", () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Title">
        Modal Content
      </Modal>
    );
    expect(screen.getByText("Modal Content")).toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "×" })).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="닫기 테스트">
        Modal Content
      </Modal>
    );
    fireEvent.click(screen.getByRole("button", { name: "×" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking the overlay", () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="오버레이 테스트">
        Modal Content
      </Modal>
    );
    const overlay = document.querySelector('.modal-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when clicking inside modal", () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="내부 클릭 테스트">
        <div data-testid="modal-inner">내부</div>
      </Modal>
    );
    fireEvent.click(screen.getByTestId("modal-inner"));
    expect(onClose).not.toHaveBeenCalled();
  });
});