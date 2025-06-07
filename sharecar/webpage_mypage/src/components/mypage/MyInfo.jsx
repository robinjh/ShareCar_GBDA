import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../../UserContext";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  updateProfile,
  updateEmail,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  deleteUser,
} from "firebase/auth";
import { auth } from "../../firebase";
import "../../styles/MyInfo.css";

function MyInfo() {
  const { user, setRefreshUser } = useContext(UserContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msgType, setMsgType] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const isSocialUser =
    user &&
    user.providerData &&
    user.providerData.some((p) => p.providerId !== "password");
  const [editProfile, setEditProfile] = useState({
    name: "",
    birth: "",
    address: "",
    email: "",
  });

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setMsg("");
    setMsgType("");
    try {
      // 1. 비밀번호 재인증
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        deletePassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // 2. (선택) Firestore 등 DB의 사용자 정보도 함께 삭제
      await deleteDoc(doc(db, "users", auth.currentUser.uid));

      // 3. Firebase Auth 계정 삭제
      await deleteUser(auth.currentUser);

      // 4. 안내 및 리다이렉트 등
      setMsg("계정이 정상적으로 삭제되었습니다.");
      setMsgType("info");
      // 로그아웃, 메인 페이지 이동 등 추가 처리
      window.location.href = "/";
    } catch (err) {
      setMsg(`탈퇴 실패: ${err.message}`);
      setMsgType("error");
    }
    setShowDeleteModal(false);
    setDeletePassword("");
  };

  const handleEmailChangeWithReauth = async (e) => {
    e.preventDefault();
    setMsg(""); // 이전 메시지 초기화
    setMsgType("");
    try {
      // 1. 비밀번호 재인증
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // 2. 이메일 변경 시도
      await updateEmail(auth.currentUser, pendingEmail);
      await sendEmailVerification(auth.currentUser); // 변경된 이메일로 인증 메일 발송

      // 3. 안내: 인증 메일 발송 안내
      setMsg(
        "연락용 이메일이 성공적으로 변경되었습니다. 회원가입 시 사용하신신 이메일로 인증 메일을 발송했으니 반드시 인증을 완료해주세요."
      );
      setMsgType("info");

      // 4. 계정 정보 동기화
      await auth.currentUser.reload();
      setRefreshUser((v) => !v);
      setProfile((prev) => ({ ...prev, email: pendingEmail }));
      setEditMode(false);
    } catch (err) {
      // 5. 실패 시 안내
      if (
        err.code === "auth/operation-not-allowed" ||
        (err.message && err.message.includes("verify the new email"))
      ) {
        setMsg(
          "보안 정책상 연락용 이메일 변경 전 반드시 회원가입 시 사용한한 이메일 주소에서 인증을 완료해야 합니다. 인증 메일을 확인해주세요."
        );
        await sendEmailVerification(auth.currentUser);
        setMsgType("error");
      } else if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        setMsg("비밀번호가 올바르지 않습니다.");
        setMsgType("error");
      } else {
        setMsg(`이메일 변경 실패: ${err.message}`);
        setMsgType("error");
      }
    }
    setShowPasswordModal(false);
    setPassword("");
    setPendingEmail("");
  };

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, profile.email);
      setMsg("비밀번호 재설정 메일을 발송했습니다.");
      setMsgType("info");
    } catch (err) {
      setMsg("메일 발송 실패! 다시 시도해 주세요.");
      setMsgType("error");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    // 입력값 검증
    if (!validateName(editProfile.name)) {
      setMsg("이름은 한글 2~10자 또는 영문 2~20자(이름/성)만 입력 가능합니다.");
      setMsgType("error");
      return;
    }
    if (!validateBirth(editProfile.birth)) {
      setMsg("생년월일을 YYYY-MM-DD 형식의 실제 날짜로 입력해 주세요.");
      setMsgType("error");
      return;
    }
    if (!validateAddress(editProfile.address)) {
      setMsg("주소는 5자 이상 입력해 주세요.");
      setMsgType("error");
      return;
    }
    if (!validateEmail(editProfile.email)) {
      setMsg("이메일 형식이 올바르지 않습니다.");
      setMsgType("error");
      return;
    }
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: editProfile.name,
        birth: editProfile.birth,
        address: editProfile.address,
        email: editProfile.email,
      });
      await updateProfile(auth.currentUser, {
        displayName: editProfile.name,
      });
      if (!isSocialUser && auth.currentUser.email !== editProfile.email) {
        setPendingEmail(editProfile.email);
        setShowPasswordModal(true);
        return;
      }
      await auth.currentUser.reload();
      setRefreshUser((v) => !v);
      setProfile(editProfile);
      setEditMode(false);
      setMsg("정보가 성공적으로 저장되었습니다.");
      setMsgType("info");
    } catch (err) {
      setMsg(`저장 실패! ${err.message || "다시 시도해 주세요."}`);
      setMsgType("error");
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
          setEditProfile({
            name: docSnap.data().name,
            birth: docSnap.data().birth,
            address: docSnap.data().address,
            email: docSnap.data().email,
          });
        }
      } catch (err) {
        setProfile(null);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  if (loading) return <div className="myinfo-box">정보를 불러오는 중...</div>;
  if (!profile)
    return <div className="myinfo-box">정보를 불러올 수 없습니다.</div>;

  function validateName(name) {
    return (
      /^[가-힣]{2,10}$/.test(name) ||
      /^[a-zA-Z]{2,20}( [a-zA-Z]{2,20})?$/.test(name)
    );
  }
  function validateBirth(birth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return false;
    const [year, month, day] = birth.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() + 1 !== month ||
      date.getDate() !== day
    )
      return false;
    const now = new Date();
    return year >= 1900 && date <= now;
  }
  function validateAddress(address) {
    return address.trim().length >= 5;
  }
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  return (
    <div className="myinfo-box">
      {showDeleteModal && (
        <div className="pw-modal-overlay">
          <form className="pw-modal" onSubmit={handleDeleteAccount}>
            <h4 className="pw-modal-title">정말로 회원 탈퇴하시겠습니까?</h4>
            <div className="delete-modal-desc">
              탈퇴 후 계정과 모든 정보가 삭제되며 복구할 수 없습니다.
              <br />
              <b>비밀번호를 한 번 더 입력해 주세요.</b>
            </div>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호"
              required
              className="pw-modal-input"
            />
            <div className="pw-modal-btn-row">
              <button type="submit" className="leave-btn">
                탈퇴
              </button>
              <button
                type="button"
                className="main-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {showPasswordModal && (
        <div className="pw-modal-overlay">
          <form className="pw-modal" onSubmit={handleEmailChangeWithReauth}>
            <h4 className="pw-modal-title">
              연락용 이메일 변경을 위해 비밀번호를 입력하세요
            </h4>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              autoFocus
              className="pw-modal-input"
            />
            <div className="pw-modal-btn-row">
              <button type="submit" className="main-btn">
                확인
              </button>
              <button
                type="button"
                className="main-btn"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPendingEmail("");
                  setPassword("");
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
      {/* 메시지 출력 */}
      {msg && (
        <div
          className={
            msgType === "error" ? "myinfo-msg-error" : "myinfo-msg-info"
          }
        >
          {msg}
        </div>
      )}
      {editMode ? (
        <form className="myinfo-form" onSubmit={handleSave}>
          <label>
            이름
            <input
              type="text"
              value={editProfile.name}
              onChange={(e) =>
                setEditProfile({ ...editProfile, name: e.target.value })
              }
            />
          </label>
          <label>
            생년월일
            <input
              type="text"
              value={editProfile.birth}
              onChange={(e) =>
                setEditProfile({ ...editProfile, birth: e.target.value })
              }
            />
          </label>
          <label>
            주소
            <input
              type="text"
              value={editProfile.address}
              onChange={(e) =>
                setEditProfile({ ...editProfile, address: e.target.value })
              }
            />
            <label>
              연락 이메일
              <input
                type="email"
                value={editProfile.email}
                onChange={(e) =>
                  setEditProfile({ ...editProfile, email: e.target.value })
                }
                disabled={isSocialUser}
              />
              {isSocialUser && (
                <div
                  className="myinfo-msg-info"
                  style={{ marginTop: 4, color: "#888", fontSize: "0.92em" }}
                >
                  소셜 계정은 연락 이메일을 변경할 수 없습니다.
                </div>
              )}
            </label>
          </label>
          <div className="myinfo-form-btns">
            <button
              type="button"
              className="main-btn"
              onClick={() => setEditMode(false)}
            >
              취소
            </button>
            <button type="submit" className="main-btn">
              저장
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="myinfo-list">
            <dt>이름</dt>
            <dd>{profile.name}</dd>
            <dt>생년월일</dt>
            <dd>{profile.birth}</dd>
            <dt>주소</dt>
            <dd>{profile.address}</dd>
            <dt>연락 이메일</dt>
            <dd>{profile.email}</dd>
          </dl>
          {/* 비밀번호 재설정 버튼 추가 */}
          <div className="myinfo-edit-btn-wrap">
            {!isSocialUser && (
              <button
                className="main-btn"
                style={{ marginBottom: "10px" }}
                onClick={handlePasswordReset}
              >
                비밀번호 변경
              </button>
            )}
            <button
              className="leave-btn"
              onClick={() => setShowDeleteModal(true)}
            >
              회원 탈퇴
            </button>
            <button className="main-btn" onClick={() => setEditMode(true)}>
              수정
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default MyInfo;
