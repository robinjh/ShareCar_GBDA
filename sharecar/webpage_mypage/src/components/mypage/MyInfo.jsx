import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../../UserContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import "../../styles/MyInfo.css";

function MyInfo() {
    const user = useContext(UserContext);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProfile(docSnap.data());
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
        </div>
    );
}

export default MyInfo;
