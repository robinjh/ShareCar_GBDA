import React, { useState, useContext, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../../firebase";
import { UserContext } from "../../UserContext";
import '../../styles/AuthForm.css';

function AuthForm() {
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showReset, setShowReset] = useState(false);

  const user = useContext(UserContext);

      useEffect(() => {
    // user가 있고 인증이 안되어 있으면, reload로 최신 상태 반영
    if (user && !user.emailVerified) {
      auth.currentUser.reload();
    }
  }, [user]);

  // 구글 로그인/회원가입
  const handleGoogleLogin = async () => {
    setError(""); setInfo("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setInfo("Google 계정으로 로그인/회원가입 완료!");
    } catch (err) {
      setError("구글 로그인 실패: " + err.message);
    }
  };

  // 로그인/회원가입 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setInfo("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setInfo("로그인 성공!");
      } else {
        if (!name.trim()) return setError("이름을 입력해 주세요.");
        if (!birth.match(/^\d{4}-\d{2}-\d{2}$/)) return setError("생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.");
        if (!address.trim()) return setError("주소를 입력해 주세요.");
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
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

  const handleLogout = async () => {
    await signOut(auth);
  };

  // 비밀번호 재설정(가입 이메일로만)
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError(""); setInfo("");
    if (!email) {
      setError("비밀번호 재설정은 먼저 이메일을 입력해야 합니다.");
      setShowReset(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo("비밀번호 재설정 메일이 전송되었습니다.");
    } catch (err) {
      setError("재설정 메일 전송 실패: " + err.message);
    }
    setShowReset(false);
  };

  // 로그인 중 화면
  if (user) {
    return (
      <div className="auth-box">
        <h3>Welcome, {user.displayName || user.email}!</h3>
        {!user.emailVerified && (
          <div className="auth-warn">이메일 인증 후 모든 기능을 사용할 수 있습니다.</div>
        )}
        <button className="main-btn" onClick={handleLogout}>로그아웃</button>
      </div>
    );
  }

  return (
    <div className="auth-box">
      <form onSubmit={handleSubmit} className="auth-form">
        <h3>{isLogin ? "로그인" : "회원가입"}</h3>
        <button type="button" className="google-btn" onClick={handleGoogleLogin}>
          <span className="google-icon">G</span> Google 계정으로 로그인/회원가입
        </button>
        <hr className="auth-divider" />
        {!isLogin && (
          <>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름"
              required
            />
            <input
              type="text"
              value={birth}
              onChange={e => setBirth(e.target.value)}
              placeholder="생년월일 (YYYY-MM-DD)"
              required
            />
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="주소"
              required
            />
          </>
        )}
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="이메일"
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="비밀번호"
          required
        />
        {info && <div className="auth-info">{info}</div>}
        {error && <div className="auth-error">{error}</div>}
        <button
          type="submit"
          className="main-btn"
          disabled={
            !email ||
            !password ||
            (!isLogin && (!name || !birth.match(/^\d{4}-\d{2}-\d{2}$/) || !address))
          }
        >
          {isLogin ? "로그인" : "회원가입"}
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="switch-link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "회원가입" : "로그인"}으로 전환
          </span>
          <span className="switch-link" onClick={() => setShowReset(true)}>
            비밀번호 재설정
          </span>
        </div>
      </form>
      {/* 비밀번호 재설정은 이메일이 입력된 경우에만 가능 */}
      {showReset && (
        <form className="reset-form" onSubmit={handlePasswordReset}>
          <input
            type="email"
            value={email}
            readOnly
            style={{ background: "#ececec", color: "#aaa" }}
          />
          <button type="submit" className="main-btn" style={{ marginTop: 6 }}>재설정 메일 전송</button>
          <span className="switch-link" onClick={() => setShowReset(false)}>닫기</span>
        </form>
      )}
    </div>
  );
}

export default AuthForm;