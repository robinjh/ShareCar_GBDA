import React, { useState } from 'react';

function PaymentManager() {
  const [cards, setCards] = useState([]);
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      setCards([...cards, input]);
      setInput('');
    }
  };

  return (
    <>
      <input
        type="text"
        placeholder="카드 번호 입력"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button className="action-button" onClick={handleAdd}>추가</button>
      <ul style={{ marginTop: '15px' }}>
        {cards.map((c, idx) => (
          <li key={idx}>{c}</li>
        ))}
      </ul>
    </>
  );
}

export default PaymentManager;
