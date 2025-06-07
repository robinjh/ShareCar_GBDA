import React, { useState, useEffect, useContext } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { UserContext } from "../../UserContext";
import "../../styles/RentalHistory.css";

// 별점 표시 컴포넌트 (숫자→별)
const StarRating = ({ rate }) => {
  const score = Number(rate);
  return (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= score ? "star on" : "star off"}>
          ★
        </span>
      ))}
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
    const fetchAllRentalHistory = async () => {
      // 1. archives
      const archQ = query(
        collection(db, "archives"),
        where("guestID", "==", user.uid),
        where("show", "in", [true, null])
      );
      const archSnap = await getDocs(archQ);
      const archiveData = archSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        source: "archives",
      }));

      // 2. requests (대기중)
      const reqQ = query(
        collection(db, "requests"),
        where("guestID", "==", user.uid),
        where("status", "==", "대기중")
      );
      const reqSnap = await getDocs(reqQ);
      const requestData = reqSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        status: "대기중",
        source: "request",
      }));

      // 3. 합치기 (원하는대로 최신순 정렬 등 가능)
      setRentals([...archiveData, ...requestData]);
      setLoading(false);
    };
    fetchAllRentalHistory();
  }, [user]);

  // 평점 남기기
  const handleRate = async (id, rate) => {
    await updateDoc(doc(db, "archives", id), { rate: rate });
    setRentals((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rate: rate } : r))
    );
  };

  // 소프트 삭제
  const handleDelete = async (id, source) => {
    if (!window.confirm("정말로 기록을 삭제하시겠습니까?")) return;
    if (source === "archives") {
      await updateDoc(doc(db, "archives", id), { show: false });
      setRentals((prev) => prev.filter((r) => r.id !== id));
    } else {
      // requests 컬렉션의 대기중 요청 삭제(취소)
      await deleteDoc(doc(db, "requests", id));
      setRentals((prev) => prev.filter((r) => r.id !== id));
    }
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
              <th>차 이름</th>
              <th>대여기간</th>
              <th>상태</th>
              <th>평점</th>
              <th>자세히</th>
              <th>삭제</th>
            </tr>
          </thead>
          <tbody>
            {rentals.map((r) => (
              <tr key={r.id}>
                <td>{r.carName}</td>
                <td>
                  {formatDate(r.startTime)} ~ {formatDate(r.endTime)}
                </td>
                <td>{r.status}</td>
                {/* 평점: 완료일 때만, 대기중/사용중/거부는 "-" */}
                <td>
                  {r.status === "완료" ? (
                    r.rate == null ? (
                      <select
                        onChange={(e) =>
                          handleRate(r.id, Number(e.target.value))
                        }
                        defaultValue=""
                      >
                        <option value="" disabled>
                          평점 선택
                        </option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {"⭐️".repeat(n)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <StarRating rate={r.rate} />
                    )
                  ) : (
                    "-"
                  )}
                </td>
                {/* 자세히 보기 */}
                <td>
                  <button onClick={() => setDetail(r)}>자세히</button>
                </td>
                {/* 삭제: source 따라 다르게 처리 */}
                <td>
                  <button onClick={() => handleDelete(r.id, r.source)}>
                    {r.status === "대기중" ? "요청 취소" : "삭제"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* 상세/모달 */}
      {detail && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ minWidth: 360 }}
          >
            <button className="close-button" onClick={closeDetail}>
              X
            </button>
            <h4>대여 상세 정보</h4>
            <p>
              <b>제조사:</b> {detail.carBrand}
            </p>
            <p>
              <b>차 이름:</b> {detail.carName}
            </p>
            <p>
              <b>차량번호:</b> {detail.carNumber}
            </p>
            <p>
              <b>대여 기간:</b> {formatDate(detail.startTime)} ~{" "}
              {formatDate(detail.endTime)}
            </p>
            <p>
              <b>요금:</b> {detail.totalFee}원
            </p>
            <p>
              <b>장소:</b> {detail.address || "-"}
            </p>
            <p>
              <b>상태:</b> {detail.status}
            </p>
            <p>
              <b>태그:</b> {detail.tags && detail.tags.join(", ")}
            </p>
            {detail.status === "사용중" && (
              <div className="centered" style={{ marginTop: 20 }}>
                <button className="btn" onClick={() => handleFinish(detail)}>
                  사용 완료로 처리
                </button>
              </div>
            )}
            {detail.status === "완료" && detail.rate == null && (
              <div style={{ marginTop: 12 }}>
                <strong>평점:</strong>
                <select
                  onChange={(e) =>
                    handleRate(detail.id, Number(e.target.value))
                  }
                  defaultValue=""
                >
                  <option value="" disabled>
                    평점 선택
                  </option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {"★".repeat(n)} ({n})
                    </option>
                  ))}
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
