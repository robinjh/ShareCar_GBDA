import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../../UserContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import "../../styles/MyInfo.css";

function MyInfo() {
    const user = useContext(UserContext);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editProfile, setEditProfile] = useState({ name: "", birth: "", address: "" });


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
    if (!profile) return <div className="myinfo-box">정보를 불러올 수 없습니다.</div>;

    return (
        <div className="myinfo-box">
            {editMode ? (
                <form className="myinfo-form" style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "stretch" }}>
                    <label>
                        이름
                        <input
                            type="text"
                            value={editProfile.name}
                            onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                        />
                    </label>
                    <label>
                        생년월일
                        <input
                            type="text"
                            value={editProfile.birth}
                            onChange={e => setEditProfile({ ...editProfile, birth: e.target.value })}
                        />
                    </label>
                    <label>
                        주소
                        <input
                            type="text"
                            value={editProfile.address}
                            onChange={e => setEditProfile({ ...editProfile, address: e.target.value })}
                        />
                    </label>
                    <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "8px" }}>
                        <button type="button" className="main-btn" onClick={() => setEditMode(false)}>
                            취소
                        </button>
                        <button type="submit" className="main-btn" style={{ background: "var(--color-primary)" }}>
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
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "18px" }}>
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
