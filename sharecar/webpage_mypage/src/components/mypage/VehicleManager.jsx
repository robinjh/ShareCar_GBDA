import React, { useState } from 'react';
import '../../styles/Common.css';

function VehicleManager() {
  const [vehicles, setVehicles] = useState([]);
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      setVehicles([...vehicles, input]);
      setInput('');
    }
  };

  return (
    <div className="section">
      <h3>차량 관리</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px' }}>
        <input
          className="input"
          type="text"
          placeholder="차량 이름 입력"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn" onClick={handleAdd}>등록</button>
      </div>
      <ul style={{ marginTop: '15px' }}>
        {vehicles.map((v, idx) => (
          <li key={idx}>{v}</li>
        ))}
      </ul>
    </div>
  );
}

export default VehicleManager;
