import React, { useState, useContext } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { UserContext } from "../../UserContext";

function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true); // 로그인/회원가입 전환
  const [error, setError] = useState("");
  const user = useContext(UserContext);

  // 로그인/회원가입 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // user 상태는 Context에서 자동 반영됨
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      if (err.code === "auth/invalid-email") setError("올바른 이메일 형식이 아닙니다.");
      else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password")
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      else if (err.code === "auth/email-already-in-use")
        setError("이미 사용 중인 이메일입니다.");
      else if (err.code === "auth/weak-password")
        setError("비밀번호는 6자 이상이어야 합니다.");
      else setError("오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    await signOut(auth);
    // 로그아웃해도 Context에서 user가 자동 null로 반영됨
  };

  // 이미 로그인 중이면 Welcome 메시지 + 로그아웃 버튼만!
  if (user) {
    return (
      <div style={{ maxWidth: 400, margin: "30px auto", padding: 24, border: "1px solid #eee", borderRadius: 10 }}>
        <h3>Welcome, {user.email}!</h3>
        <button onClick={handleLogout}>로그아웃</button>
      </div>
    );
  }

  // 로그인/회원가입 폼
  return (
    <div style={{ maxWidth: 400, margin: "30px auto", padding: 24, border: "1px solid #eee", borderRadius: 10 }}>
      <form onSubmit={handleSubmit}>
        <h3>{isLogin ? "로그인" : "회원가입"}</h3>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="이메일"
          required
          style={{ width: "100%", margin: "8px 0", padding: 8 }}
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="비밀번호"
          required
          style={{ width: "100%", margin: "8px 0", padding: 8 }}
        />
        {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
        <button type="submit" style={{ width: "100%", padding: 8, marginBottom: 8 }}>
          {isLogin ? "로그인" : "회원가입"}
        </button>
        <div style={{ textAlign: "right" }}>
          <span style={{ cursor: "pointer", color: "#1890ff" }} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "회원가입" : "로그인"}으로 전환
          </span>
        </div>
      </form>
    </div>
  );
}

export default AuthForm;
