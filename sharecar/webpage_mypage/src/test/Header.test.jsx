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

  
