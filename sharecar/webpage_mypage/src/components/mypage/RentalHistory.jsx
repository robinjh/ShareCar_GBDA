import React, { useState } from 'react';
import '../../styles/Common.css';
import '../../styles/RentalHistory.css';

const sampleRentals = [
  {
    id: 1,
    car: '현대 아이오닉5',
    from: '2024-02-13',
    to: '2024-02-15',
    rating: 0,
    location: '서울 강남구',
    price: '120,000원',
  },
  {
    id: 2,
    car: '기아 EV6',
    from: '2024-03-01',
    to: '2024-03-02',
    rating: 4,
    location: '부산 해운대구',
    price: '90,000원',
  }
];

function RentalHistory() {
  const [rentals, setRentals] = useState(sampleRentals);
  const [selected, setSelected] = useState(null);

  const updateRating = (id, value) => {
    setRentals(prev =>
      prev.map(r =>
        r.id === id && r.rating === 0 ? { ...r, rating: Number(value) } : r
      )
    );
  };

  const deleteRental = (id) => {
    setRentals(prev => prev.filter(r => r.id !== id));
  };

  const deleteAll = () => setRentals([]);

  return (
    <div className="rental-history-container">
      <table className="rental-history-table" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "23%" }}>차량명</th>
            <th style={{ width: "27%" }}>기간</th>
            <th style={{ width: "17%" }}>평점</th>
            <th style={{ width: "33%" }}>작업</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map(r => (
            <tr key={r.id}>
              <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.car}</td>
              <td style={{ whiteSpace: "nowrap" }}>{r.from} ~ {r.to}</td>
              <td>
                <select
                  className="input"
                  value={r.rating}
                  onChange={e => updateRating(r.id, e.target.value)}
                  disabled={r.rating !== 0}
                  style={{ minWidth: 80, textAlign: "center" }}
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{'⭐'.repeat(n)}</option>
                  ))}
                </select>
              </td>
              <td>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", whiteSpace: "nowrap" }}>
                  <button className="btn" onClick={() => setSelected(r)}>자세히 보기</button>
                  <button className="btn" onClick={() => deleteRental(r.id)}>삭제</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rentals.length > 0 && (
        <div className="rental-table-bottom" style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <button className="btn" onClick={deleteAll}>전체 삭제</button>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelected(null)}>X</button>
            <h4>{selected.car} 상세 정보</h4>
            <p>대여 기간: {selected.from} ~ {selected.to}</p>
            <p>지역: {selected.location}</p>
            <p>요금: {selected.price}</p>
            <p>현재 평점: {'⭐'.repeat(selected.rating)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RentalHistory;