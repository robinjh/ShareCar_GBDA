import React, { useState } from 'react';
import '../../styles/MyPage.css'; // 기존 스타일과 통일

// 샘플 대여 요청 데이터
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

  // 승인 처리
  const approveRequest = (id) => {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: '승인' } : r)
    );
    alert('요청이 승인되었습니다.');
    setSelected(null);
  };

  // 거부 처리
  const rejectRequest = (id) => {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: '거부' } : r)
    );
    alert('요청이 거부되었습니다.');
    setSelected(null);
  };

  // 모달만 닫기
  const closeModal = () => setSelected(null);

  return (
    <div>
      <h3>📥 대여 요청 목록</h3>
      <table className="rental-table">
        <thead>
          <tr>
            <th>요청자</th>
            <th>대여 기간</th>
            <th>지역</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(r => (
            <tr key={r.id}>
              <td>{r.user}</td>
              <td>{r.start} ~ {r.end}</td>
              <td>{r.location}</td>
              <td>
                {/* 상태에 따라 버튼 또는 승인/거부 표시 */}
                {r.status === '대기' ? (
                  <button onClick={() => setSelected(r)}>자세히 보기</button>
                ) : (
                  <span style={{ fontWeight: 'bold', color: r.status === '승인' ? 'green' : 'red' }}>
                    {r.status}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 자세히 보기 모달 */}
      {selected && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close-button" onClick={closeModal}>X</button>
            <h4>요청 상세 정보</h4>
            <p><strong>요청자:</strong> {selected.user}</p>
            <p><strong>차량명:</strong> {selected.car}</p>
            <p><strong>대여 기간:</strong> {selected.start} ~ {selected.end}</p>
            <p><strong>지역:</strong> {selected.location}</p>
            <p><strong>요금:</strong> {selected.price}</p>

            {selected.status === '대기' && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="action-button" onClick={() => approveRequest(selected.id)}>승인</button>
                <button className="action-button" onClick={() => rejectRequest(selected.id)}>거부</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestManager;
