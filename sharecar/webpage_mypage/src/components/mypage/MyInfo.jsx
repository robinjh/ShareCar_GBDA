import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../../UserContext";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import "../../styles/MyInfo.css";

function MyInfo() {
  const user = useContext(UserContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [editProfile, setEditProfile] = useState({
    name: "",
    birth: "",
    address: "",
  });

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
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: editProfile.name,
        birth: editProfile.birth,
        address: editProfile.address,
      });
      setProfile(editProfile);
      setEditMode(false);
      setMsg("정보가 성공적으로 저장되었습니다.");
      setMsgType("info");
    } catch (err) {
      setMsg("저장 실패! 다시 시도해 주세요.");
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

  return (
    <div className="myinfo-box">
      {editMode ? (
        <form className="myinfo-form" onSubmit={handleSave}>
          {msg && (
            <div
              className={
                msgType === "error" ? "myinfo-msg-error" : "myinfo-msg-info"
              }
            >
              {msg}
            </div>
          )}
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
            <dt>이메일</dt>
            <dd>{profile.email}</dd>
          </dl>
          <div className="myinfo-edit-btn-wrap">
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
