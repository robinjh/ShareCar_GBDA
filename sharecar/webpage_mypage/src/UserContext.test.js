import "@testing-library/jest-dom";
// UserContext.test.js
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { UserProvider, UserContext } from "./UserContext";

// 기본 렌더 테스트
it("UserProvider renders children", () => {
  render(
    <UserProvider>
      <div>hello</div>
    </UserProvider>
  );
  expect(screen.getByText("hello")).toBeInTheDocument();
});

// firebase/auth를 mock!
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (auth, callback) => {
    // 첫 번째로 null, 두 번째로 user 객체 넘겨서 상태 변화를 테스트
    callback(null);           // 처음엔 비로그인
    setTimeout(() => callback({ uid: "user1", email: "test@test.com" }), 10); // 로그인된 user
    return jest.fn(); // unsub 함수
  }
}));
jest.mock("./firebase", () => ({
  auth: {},
}));

it("UserProvider user 상태 변화를 정상적으로 관리한다", async () => {
  let contextUser = null;
  render(
    <UserProvider>
      <UserContext.Consumer>
        {({ user }) => {
          contextUser = user;
          return <div>{user ? user.email : "no-user"}</div>;
        }}
      </UserContext.Consumer>
    </UserProvider>
  );
  // 첫 번째 상태(null)
  expect(contextUser).toBe(null);
  // setTimeout으로 user 바뀐 후 상태 체크
  await waitFor(() => {
    expect(contextUser).toEqual({ uid: "user1", email: "test@test.com" });
  });
});

it("UserProvider setRefreshUser를 통해 상태 업데이트가 가능하다", () => {
  let contextSetRefreshUser = null;
  render(
    <UserProvider>
      <UserContext.Consumer>
        {({ setRefreshUser }) => {
          contextSetRefreshUser = setRefreshUser;
          return <div>user</div>;
        }}
      </UserContext.Consumer>
    </UserProvider>
  );
  // setRefreshUser가 함수인지 체크
  expect(typeof contextSetRefreshUser).toBe("function");
});