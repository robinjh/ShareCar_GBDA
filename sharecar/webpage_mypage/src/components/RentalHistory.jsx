import React, { useState } from 'react';
import '../styles/rentalTable.css';
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
      prev.map(r => r.id === id ? { ...r, rating: Number(value) } : r)
    );
  };

  const deleteRental = (id) => {
    setRentals(prev => prev.filter(r => r.id !== id));
  };

  const deleteAll = () => setRentals([]);

  return (
    <div>
      <table className="rental-table">
        <thead>
          <tr>
            <th>차량명</th>
            <th>기간</th>
            <th>평점</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map(r => (
            <tr key={r.id}>
              <td>{r.car}</td>
              <td>{r.from} ~ {r.to}</td>
              <td>
              <select value={r.rating} onChange={e => updateRating(r.id, e.target.value)} 
                disabled={r.rating !== 0}> // ⭐ 이미 값이 있으면 비활성화
               
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{'⭐'.repeat(n)}</option>
                  ))}
                </select>
              </td>
              <td>
                <div className="action-buttons">
                  <button onClick={() => setSelected(r)}>자세히 보기</button>
                  <button onClick={() => deleteRental(r.id)}>삭제</button>
                </div>
             </td>
             </tr>
        ))}
        </tbody>
      </table>
      {rentals.length > 0 && (
        <button onClick={deleteAll} style={{ marginTop: '10px' }}>전체 삭제</button>
      )}

      {selected && (
        <div className="modal-overlay">
          <div className="modal">
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