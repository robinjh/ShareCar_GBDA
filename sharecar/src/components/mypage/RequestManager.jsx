import React, { useContext, useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { UserContext } from "../../UserContext";

  // archives로 복사 + 요청에서 삭제
  export const archiveRequest = async (req, resultStatus = "사용중") => {
    const now = new Date().toISOString();
    await setDoc(doc(db, "archives", req.id), {
      carNumber: req.carNumber,
      hostID: req.hostID,
      guestID: req.guestID,
      guestName: req.guestName,
      startTime: req.startTime,
      endTime: req.endTime,
      totalFee: req.totalFee,
      rentalFee: req.rentalFee,
      status: resultStatus, // "사용중" or "거부"
      tags: req.tags,
      rate: null,
      show: true,
      archivedAt: now,
      requestedAt: req.requestedAt || null,
    });
    await deleteDoc(doc(db, "requests", req.id));
  };

// 날짜 포맷
function formatDate(s) {
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
}

// 기간 겹침 판정
function isOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

function RequestManager() {
  const { user } = useContext(UserContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const closeDetail = () => setDetail(null);

  // 대기중인 내 차량의 대여 요청 불러오기
  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      const q = query(
        collection(db, "requests"),
        where("hostID", "==", user.uid),
        where("status", "==", "대기중")
      );
      const snapshot = await getDocs(q);
      setRequests(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
      setLoading(false);
    };
    fetchRequests();
  }, [user]);

  // 승인 처리 (겹치는 요청 자동 거부)
  const handleApprove = async (req) => {
    // 1. 차량 상태 갱신
    await updateDoc(doc(db, "registrations", req.carNumber), {
      status: "사용중",
      guestID: req.guestID,
      startTime: req.startTime,
      endTime: req.endTime,
    });

    // 2. "승인"된 요청 아카이브로 복사
    await archiveRequest(req, "사용중");

    // 3. 겹치는 기간의 같은 차량 다른 대기중 요청 모두 자동 거부 처리
    const q = query(
      collection(db, "requests"),
      where("carNumber", "==", req.carNumber),
      where("status", "==", "대기중")
    );
    const snap = await getDocs(q);
    const overlapReqs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter(
        (other) =>
          other.id !== req.id &&
          isOverlap(req.startTime, req.endTime, other.startTime, other.endTime)
      );
    for (const other of overlapReqs) {
      await archiveRequest(other, "거부");
    }

    // 4. 화면 갱신 (대기중 → 모두 삭제)
    setRequests((prev) =>
      prev.filter(
        (r) =>
          r.id === req.id // 내가 승인한 건 이미 아카이브로 이동
            ? false
            : !overlapReqs.some((orq) => orq.id === r.id) // 자동 거부된 것도 빼기
      )
    );
    alert("승인 및 겹치는 기간 요청 자동 거부 완료!");
  };

  // 거부 처리
  const handleReject = async (req) => {
    await archiveRequest(req, "거부");
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    alert("거부되었습니다.");
  };

  return (
    <div>
      <h2>내 차량에 온 대여 요청</h2>
      {loading ? (
        <p>로딩 중...</p>
      ) : requests.length === 0 ? (
        <p>현재 대기중인 대여 요청이 없습니다.</p>
      ) : (
        <ul className="request-list">
          {requests.map((req) => (
            <li key={req.id}>
              {req.carName} / {req.guestName} /{" "}
              {formatDate(req.startTime)} ~ {formatDate(req.endTime)}
              <button className="detail-btn" onClick={() => setDetail(req)}>
                자세히
              </button>
            </li>
          ))}
        </ul>
      )}
      {detail && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={closeDetail}>
              X
            </button>
            <h4>대여 요청 상세</h4>
            <p>
              <b>차 이름:</b> {detail.carName}
            </p>
            <p>
              <b>차량번호:</b> {detail.carNumber}
            </p>
            <p>
              <b>요청자:</b> {detail.guestName}
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
            <div className="centered" style={{ marginTop: 18 }}>
              <button
                className="accept-btn"
                onClick={() => handleApprove(detail)}
              >
                승인
              </button>
              <button
                className="reject-btn"
                onClick={() => handleReject(detail)}
                style={{ marginLeft: 8 }}
              >
                거부
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestManager;