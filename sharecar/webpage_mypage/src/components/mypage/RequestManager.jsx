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
      setRequests(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })));
      setLoading(false);
    };
    fetchRequests();
  }, [user]);

  // archives로 복사 + 요청에서 삭제
  const archiveRequest = async (req, resultStatus = "사용중") => {
    const now = new Date().toISOString();
    await setDoc(doc(db, "archives", req.id), {
      carNumber: req.carNumber,
      hostID: req.hostID,
      requesterID: req.requesterID,
      guestName: req.guestName || req.requesterName,
      startTime: req.startTime,
      endTime: req.endTime,
      fee: req.fee,
      status: resultStatus, // "사용중" or "거부"
      tags: req.tags,
      rate: null,
      show: true,
      archivedAt: now,
      requestedAt: req.requestedAt || null,
    });
    await deleteDoc(doc(db, "requests", req.id));
  };

  // 승인 처리 (겹치는 요청 자동 거부)
  const handleApprove = async (req) => {
    // 1. 차량 상태 갱신
    await updateDoc(doc(db, "registrations", req.carNumber), {
      status: "사용중",
      guestID: req.requesterID,
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
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(other =>
        other.id !== req.id && isOverlap(
          req.startTime, req.endTime,
          other.startTime, other.endTime
        )
      );
    for (const other of overlapReqs) {
      await archiveRequest(other, "거부");
    }

    // 4. 화면 갱신 (대기중 → 모두 삭제)
    setRequests(prev => prev.filter(r =>
      r.id === req.id // 내가 승인한 건 이미 아카이브로 이동
      ? false
      : !overlapReqs.some(orq => orq.id === r.id) // 자동 거부된 것도 빼기
    ));
    alert("승인 및 겹치는 기간 요청 자동 거부 완료!");
  };

  // 거부 처리
  const handleReject = async (req) => {
    await archiveRequest(req, "거부");
    setRequests(prev => prev.filter(r => r.id !== req.id));
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
          {requests.map(req => (
            <li key={req.id}>
              {req.carNumber} / {req.guestName || req.requesterName} / {formatDate(req.startTime)} ~ {formatDate(req.endTime)}
              <button className="accept-btn" onClick={() => handleApprove(req)}>승인</button>
              <button className="reject-btn" onClick={() => handleReject(req)}>거부</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RequestManager;