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
    <>
      <input
        type="text"
        placeholder="차량 이름 입력"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button className="action-button" onClick={handleAdd}>등록</button>
      <ul style={{ marginTop: '15px' }}>
        {vehicles.map((v, idx) => (
          <li key={idx}>{v}</li>
        ))}
      </ul>
    </>
  );
}

export default VehicleManager;
