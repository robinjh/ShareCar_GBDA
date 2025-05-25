import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../../UserContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import "../../styles/MyInfo.css";

function MyInfo() {
  const user = useContext(UserContext);
  const [profile, setProfile] = useState(null);

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
    };
    fetchProfile();
  }, [user]);

  return (
    <div className="myinfo-box">
      <h3 className="myinfo-title">👤 내 정보</h3>
      {/* 이후 단계에서 profile 표시 */}
    </div>
  );
}

export default MyInfo;
