// src/UserContext.js
import React, { createContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
    const [refreshUser, setRefreshUser] = useState(false);

  useEffect(() => {
    // Firebase 인증 상태 변경 감지 (자동 로그인, 로그아웃 모두 반영)
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("onAuthStateChanged user:", firebaseUser);
      setUser(firebaseUser);
    });
    return () => unsub();
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, setRefreshUser }}>
      {children}
    </UserContext.Provider>
  );
}