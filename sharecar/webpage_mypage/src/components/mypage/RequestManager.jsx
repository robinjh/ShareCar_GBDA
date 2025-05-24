import React, { useState } from 'react';
import '../../styles/Common.css';
import '../../styles/RentalHistory.css';  // 행 구분선 및 표 스타일 재활용

const sampleRequests = [
  {
    id: 1,
    user: '김철수',
    car: '현대 아이오닉5',
    start: '2024-05-01',
    end: '2024-05-03',
    location: '서울 강남구',
    price: '150,000원',
    status: '대기'
  },
  {
    id: 2,
    user: '이영희',
    car: '기아 EV6',
    start: '2024-05-10',
    end: '2024-05-12',
    location: '부산 해운대구',
    price: '140,000원',
    status: '대기'
  }
];

function RequestManager() {
  const [requests, setRequests] = useState(sampleRequests);
  const [selected, setSelected] = useState(null);

  const approveRequest = (id) => {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: '승인' } : r)
    );
    alert('요청이 승인되었습니다.');
    setSelected(null);
  };

  const rejectRequest = (id) => {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: '거부' } : r)
    );
    alert('요청이 거부되었습니다.');
    setSelected(null);
  };

  const closeModal = () => setSelected(null);

  return (
    <div className="rental-history-container">
      <table className="rental-history-table" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "20%" }}>요청자</th>
            <th style={{ width: "33%" }}>대여 기간</th>
            <th style={{ width: "27%" }}>지역</th>
            <th style={{ width: "20%" }}>작업</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(r => (
            <tr key={r.id}>
              <td style={{ whiteSpace: "nowrap" }}>{r.user}</td>
              <td style={{ whiteSpace: "nowrap" }}>{r.start} ~ {r.end}</td>
              <td style={{ whiteSpace: "nowrap" }}>{r.location}</td>
              <td>
                {r.status === '대기' ? (
                  <button className="btn" style={{ whiteSpace: "nowrap" }} onClick={() => setSelected(r)}>자세히 보기</button>
                ) : (
                  <span style={{
                    fontWeight: 'bold',
                    color: r.status === '승인' ? 'green' : 'red',
                    whiteSpace: "nowrap"
                  }}>
                    {r.status}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* 모달 */}
      {selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={closeModal}>X</button>
            <h4>요청 상세 정보</h4>
            <p><strong>요청자:</strong> {selected.user}</p>
            <p><strong>차량명:</strong> {selected.car}</p>
            <p><strong>대여 기간:</strong> {selected.start} ~ {selected.end}</p>
            <p><strong>지역:</strong> {selected.location}</p>
            <p><strong>요금:</strong> {selected.price}</p>
            {selected.status === '대기' && (
              <div style={{
                marginTop: '20px',
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                whiteSpace: 'nowrap'
              }}>
                <button className="btn" onClick={() => approveRequest(selected.id)}>승인</button>
                <button className="btn" onClick={() => rejectRequest(selected.id)}>거부</button>
              </div>
            )}
            {selected.status !== '대기' && (
              <div style={{ marginTop: 20, textAlign: "center", fontWeight: 600, color: selected.status === "승인" ? "green" : "red" }}>
                처리 결과: {selected.status}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestManager;