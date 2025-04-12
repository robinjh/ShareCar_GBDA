import React, { useState } from 'react';

function RequestManager() {
  const [requests, setRequests] = useState([
    { id: 1, name: '아이오닉5', approved: false },
    { id: 2, name: 'Kona EV', approved: false },
  ]);

  const handleApprove = (id) => {
    setRequests(requests.map((req) =>
      req.id === id ? { ...req, approved: true } : req
    ));
  };

  return (
    <>
      {requests.length === 0 && <p>요청이 없습니다.</p>}
      <ul>
        {requests.map((req) => (
          <li key={req.id}>
            {req.name} - {req.approved
              ? <span style={{ color: 'green' }}>승인됨</span>
              : <button className="action-button" onClick={() => handleApprove(req.id)}>승인하기</button>}
          </li>
        ))}
      </ul>
    </>
  );
}

export default RequestManager;
