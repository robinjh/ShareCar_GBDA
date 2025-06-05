import React, { useState, useContext } from "react";
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
import { auth, db } from "../../firebase";
import { UserContext } from "../../UserContext";
import { setDoc, doc } from "firebase/firestore";
import "../../styles/AuthForm.css";

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

  const { user } = useContext(UserContext);

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

  // 이름: 한글 2~10자 또는 영문 2~20자, 특수문자/숫자 불가
  function validateName(name) {
    return /^[가-힣]{2,10}$/.test(name) || /^[a-zA-Z]{2,20}( [a-zA-Z]{2,20})?$/.test(name);
  }

  // 생년월일: YYYY-MM-DD, 실제 날짜, 1900년~현재
  function validateBirth(birth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return false;
    const [year, month, day] = birth.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() + 1 !== month ||
      date.getDate() !== day
    ) return false;
    const now = new Date();
    return year >= 1900 && date <= now;
  }

  // 주소: 5자 이상 입력
  function validateAddress(address) {
    return address.trim().length >= 5;
  }

  // 비밀번호: 8자 이상, 영문/숫자/특수문자 포함
  function validatePassword(password) {
    return (
      password.length >= 8 &&
      /[a-zA-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    );
  }

   // 로그인/회원가입 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setInfo("");
    if (isLogin) {
      // 로그인: 이메일/비번만 검사
      if (!email.trim()) return setError("이메일을 입력해 주세요.");
      if (!validatePassword(password)) return setError("비밀번호는 8자 이상, 영문/숫자/특수문자를 모두 포함해야 합니다.");
      try {
        await signInWithEmailAndPassword(auth, email, password);
        setInfo("로그인 성공!");

      } 
      catch (err) {
        if (err.code === "auth/invalid-email") setError("올바른 이메일 형식이 아닙니다.");
        else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password")
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        else setError("오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } else {
      // 회원가입: 모든 필드 검사
      if (!validateName(name)) return setError("이름은 한글 2~10자 또는 영문 2~20자(이름/성)만 입력 가능합니다.");
      if (!validateBirth(birth)) return setError("생년월일을 YYYY-MM-DD 형식의 실제 날짜로 입력해 주세요.");
      if (!validateAddress(address)) return setError("주소는 5자 이상 입력해 주세요.");
      if (!validatePassword(password)) return setError("비밀번호는 8자 이상, 영문/숫자/특수문자를 모두 포함해야 합니다.");
      try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", result.user.uid), { name, birth, address, email });
        await updateProfile(result.user, { displayName: name });
        await sendEmailVerification(result.user);
        setInfo("회원가입 완료! 이메일 인증을 해주세요.");
      } catch (err) {
        if (err.code === "auth/invalid-email") setError("올바른 이메일 형식이 아닙니다.");
        else if (err.code === "auth/email-already-in-use")
          setError("이미 사용 중인 이메일입니다.");
        else if (err.code && err.code.startsWith("firestore/"))
          setError("회원정보 저장 중 오류가 발생했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.");
        else setError("오류가 발생했습니다. 다시 시도해 주세요.");
      }
    };
  }

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

    // 로그인/회원가입 폼
    return (
      <div className="auth-box" data-testid="auth-form">
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
