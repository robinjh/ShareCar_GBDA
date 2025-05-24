import React, { useState, useContext } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { UserContext } from "../../UserContext";
import { sendEmailVerification } from "firebase/auth";

function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true); // 로그인/회원가입 전환
  const [error, setError] = useState("");
  const user = useContext(UserContext);
  const isValidEmail = email =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  const isValidPassword = pwd =>
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]).{8,}$/.test(pwd);
  const [info, setInfo] = useState(""); // 안내 메시지 상태 추가


  // 로그인/회원가입 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo(""); // 안내 메시지 초기화
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setInfo("로그인 성공!");
        // user 상태는 Context에서 자동 반영됨
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(result.user);
        setInfo("회원가입 완료! 이메일 인증을 해주세요.");
      }
    } catch (err) {
      if (err.code === "auth/invalid-email") setError("올바른 이메일 형식이 아닙니다.");
      else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password")
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      else if (err.code === "auth/email-already-in-use")
        setError("이미 사용 중인 이메일입니다.");
      else if (err.code === "auth/weak-password")
        setError("비밀번호는 8자 이상, 영문+숫자+특수문자를 모두 포함해야 합니다.");
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
        {!user.emailVerified && (
          <div style={{ color: "#ffae42", marginBottom: 10 }}>이메일 인증 후 모든 기능을 사용할 수 있습니다.</div>
        )}
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
          style={{
            width: "100%",
            margin: "8px 0",
            padding: 8,
            borderColor: email === "" ? "#ccc" : isValidEmail(email) ? "#3a6ff7" : "#ff4444"
          }}
        />
        {info && (
          <div style={{ color: "#388e3c", marginBottom: 10 }}>
            {info}
          </div>
        )}
        {email && !isValidEmail(email) && (
          <div style={{ color: "#ff4444", marginBottom: 4 }}>
            올바른 이메일 형식(aaa@bbb.com)이 아닙니다.
          </div>
        )}
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="비밀번호 (영문+숫자+특수문자 8자 이상)"
          required
          style={{
            width: "100%",
            margin: "8px 0",
            padding: 8,
            borderColor:
              !isLogin && password !== ""
                ? isValidPassword(password)
                  ? "#3a6ff7"
                  : "#ff4444"
                : "#ccc"
          }}
        />
        {!isLogin && password && !isValidPassword(password) && (
          <div style={{ color: "#ff4444", marginBottom: 4 }}>
            비밀번호는 8자 이상, 영문+숫자+특수문자를 모두 포함해야 합니다.
          </div>
        )}

        {error && (
          <div style={{ color: "red", marginBottom: 10 }}>{error}</div>
        )}
        <button
          type="submit"
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
          disabled={
            !isValidEmail(email) ||
            (!isLogin && !isValidPassword(password))
          }
        >
          {isLogin ? "로그인" : "회원가입"}
        </button>
        <div style={{ textAlign: "right" }}>
          <span
            style={{ cursor: "pointer", color: "#1890ff" }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "회원가입" : "로그인"}으로 전환
          </span>
        </div>
      </form>
    </div>
  );
}

export default AuthForm;
