import React, { useState, useEffect, useContext } from "react";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { UserContext } from "../../UserContext";

function RentalHistory() {
  const { user } = useContext(UserContext);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchRentals = async () => {
      const q = query(
        collection(db, "archives"),
        where("requesterID", "==", user.uid),
        where("show", "in", [true, null]) // show === false가 아닌 문서만
      );
      const snapshot = await getDocs(q);
      setRentals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchRentals();
  }, [user]);

  // 평점 남기기
  const handleRate = async (id, score) => {
    await updateDoc(doc(db, "archive", id), { rate: score });
    setRentals(prev =>
      prev.map(r => (r.id === id ? { ...r, rate: score } : r))
    );
  };

  // 소프트 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("정말로 기록을 삭제하시겠습니까?")) return;
    await updateDoc(doc(db, "archive", id), { show: false });
    setRentals(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div>
      <h2>내 대여 기록</h2>
      {loading ? (
        <p>로딩 중...</p>
      ) : rentals.length === 0 ? (
        <p>대여 기록이 없습니다.</p>
      ) : (
        <ul>
          {rentals.map(r => (
            <li key={r.id}>
              {/* 중첩 구조면, 예: r["1_basicInfo"]?.name 등 접근 */}
              {r["1_basicInfo"]?.name || r.carNumber || "차명 없음"} /
              {r.startTime} ~ {r.endTime} /
              상태: {r.status}
              {r.rate == null && r.status === "완료" && (
                <select
                  onChange={e => handleRate(r.id, Number(e.target.value))}
                  defaultValue=""
                >
                  <option value="" disabled>평점 선택</option>
                  {[1,2,3,4,5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              )}
              {r.rate != null && ` 평점: ${r.rate}`}
              <button onClick={() => handleDelete(r.id)}>삭제</button>
              <button onClick={() => {/* 자세히 보기 모달 등 구현 */}}>자세히</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RentalHistory;