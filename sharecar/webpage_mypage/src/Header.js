// src/Header.js
import React, { useContext } from "react";
import { UserContext } from "./UserContext";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

function Header({ isDarkMode, toggleMode }) {
    const user = useContext(UserContext);

    return (
        <header style={{
            width: "100%",
            background: isDarkMode ? "#24243b" : "#f3f3fa",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "13px 24px",
            borderBottom: isDarkMode ? "1px solid #222" : "1px solid #e6e7ec",
            fontWeight: 600,
            fontSize: "1.05rem",
        }}>
            <span>ShareCar 프로젝트</span>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {user && (
                    <>
                        <span style={{ color: "#5978e7", fontWeight: 500 }}>
                            {user.displayName || user.email}
                        </span>
                        <button
                            style={{
                                background: "#5978e7",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "7px 15px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                            onClick={() => signOut(auth)}
                        >
                            로그아웃
                        </button>
                    </>
                )}
                <button
                    style={{
                        background: "none",
                        color: isDarkMode ? "#fff" : "#222",
                        border: "1px solid #bbc5e2",
                        borderRadius: 8,
                        padding: "7px 14px",
                        cursor: "pointer",
                        marginLeft: 10,
                    }}
                    onClick={toggleMode}
                >
                    {isDarkMode ? "라이트모드" : "다크모드"}
                </button>
            </div>
        </header>
    );
}

export default Header;
