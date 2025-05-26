import React, { useState, useEffect, useContext } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { UserContext } from "../../UserContext";
import '../../styles/RentalHistory.css'

// 별점 표시 컴포넌트 (숫자→별)
const StarRating = ({ rate }) => {
  const score = Number(rate);
  return (
    <span className="star-rating">
      {[1,2,3,4,5].map(n =>
        <span key={n} className={n <= score ? "star on" : "star off"}>★</span>
      )}
    </span>
  );
};

// 날짜 변환 유틸
const formatDate = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function RentalHistory() {
  const { user } = useContext(UserContext);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // 상세 모달용

  useEffect(() => {
    if (!user) return;
    const fetchRentals = async () => {
      const q = query(
        collection(db, "archives"),
        where("requesterID", "==", user.uid),
        where("show", "in", [true, null])
      );
      const snapshot = await getDocs(q);
      setRentals(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchRentals();
  }, [user]);

  // 평점 남기기
  const handleRate = async (id, rate) => {
    await updateDoc(doc(db, "archives", id), { rate: rate });
    setRentals((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rate: rate } : r))
    );
  };

  // 소프트 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("정말로 기록을 삭제하시겠습니까?")) return;
    await updateDoc(doc(db, "archives", id), { show: false });
    setRentals((prev) => prev.filter((r) => r.id !== id));
  };

  // 사용 완료 처리
  const handleFinish = async (r) => {
    // 완료 처리: status "완료", archivedAt 추가
    await updateDoc(doc(db, "archives", r.id), {
      status: "완료",
      archivedAt: new Date().toISOString(),
    });
    setRentals((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? { ...x, status: "완료", archivedAt: new Date().toISOString() }
          : x
      )
    );
    setDetail(null);
  };

  // 모달 닫기
  const closeDetail = () => setDetail(null);

  return (
    <div>
      <h2>내 대여 기록</h2>
      {loading ? (
        <p>로딩 중...</p>
      ) : rentals.length === 0 ? (
        <p>대여 기록이 없습니다.</p>
      ) : (
        <table className="table rental-table">
          <thead>
            <tr>
              <th>차량번호</th>
              <th>대여기간</th>
              <th>상태</th>
              <th>평점</th>
              <th>자세히</th>
              <th>삭제</th>
            </tr>
          </thead>
          <tbody>
            {rentals.map(r => (
              <tr key={r.id}>
                <td>{r.carNumber}</td>
                <td>{formatDate(r.startTime)} ~ {formatDate(r.endTime)}</td>
                <td>{r.status}</td>
                <td>
                  {/* 평점 */}
                  {r.status === "완료" && (r.rate == null
                    ? (
                      // 평점 아직 없음: 드롭다운
                      <select
                        onChange={e => handleRate(r.id, Number(e.target.value))}
                        defaultValue=""
                      >
                        <option value="" disabled>평점 선택</option>
                        {[1,2,3,4,5].map(n =>
                          <option key={n} value={n}>{'⭐️'.repeat(n)}</option>
                        )}
                      </select>
                    )
                    : <StarRating rate={r.rate} />
                  )}
                  {r.status !== "완료" && "-"}
                </td>
                <td>
                  <button onClick={() => setDetail(r)}>자세히</button>
                </td>
                <td>
                  <button onClick={() => handleDelete(r.id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* 상세/모달 */}
      {detail && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: 360 }}>
            <button className="close-button" onClick={closeDetail}>X</button>
            <h4>대여 상세 정보</h4>
            <p>차량번호: {detail.carNumber}</p>
            <p>대여 기간: {formatDate(detail.startTime)} ~ {formatDate(detail.endTime)}</p>
            <p>요금: {detail.fee}원</p>
            <p>상태: {detail.status}</p>
            <p>태그: {detail.tags && detail.tags.join(", ")}</p>
            {detail.status === "사용중" && (
              <button className="btn" onClick={() => handleFinish(detail)}>
                사용 완료로 처리
              </button>
            )}
            {detail.status === "완료" && detail.rate == null && (
              <div style={{ marginTop: 12 }}>
                <strong>평점:</strong>
                <select
                  onChange={e => handleRate(detail.id, Number(e.target.value))}
                  defaultValue=""
                >
                  <option value="" disabled>평점 선택</option>
                  {[1,2,3,4,5].map(n =>
                    <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>
                  )}
                </select>
              </div>
            )}
            {detail.status === "완료" && detail.rate != null && (
              <div style={{ marginTop: 12 }}>
                <strong>평점:</strong> <StarRating rate={detail.rate} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RentalHistory;