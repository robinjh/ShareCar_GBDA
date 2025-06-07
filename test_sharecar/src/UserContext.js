// src/UserContext.js
import React, { createContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
    const [refreshUser, setRefreshUser] = useState(false);

 useEffect(() => {
  const unsub = onAuthStateChanged(auth, (firebaseUser) => setUser(firebaseUser));
  return () => {
    if (typeof unsub === "function") unsub();
  };
}, [refreshUser]);


  return (
    <UserContext.Provider value={{ user, setRefreshUser }}>
      {children}
    </UserContext.Provider>
  );
}