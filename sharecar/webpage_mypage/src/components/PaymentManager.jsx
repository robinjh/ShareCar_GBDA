import React, { useState } from 'react';
import '../styles/MyPage.css'; // 스타일 통일

function PaymentManager() {
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [modalType, setModalType] = useState(null); // 'card' 또는 'account'
  const [form, setForm] = useState({});

  const openModal = (type) => {
    setModalType(type);
    setForm({});
  };

  const closeModal = () => {
    setModalType(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (modalType === 'card') {
      setCards(prev => [...prev, form]);
    } else if (modalType === 'account') {
      setAccounts(prev => [...prev, form]);
    }
    closeModal();
  };

  return (
    <div>
      <h3>💳 결제 수단 관리</h3>

      {/* 카드 목록 */}
      <h4>카드 목록</h4>
      {cards.length === 0 ? (
        <p className="mypage-placeholder">등록된 카드가 없습니다.</p>
      ) : (
        <ul>
          {cards.map((card, index) => (
            <li key={index}>
              {card.company} 카드 - {card.number}
            </li>
          ))}
        </ul>
      )}

      {/* 계좌 목록 */}
      <h4>계좌 목록</h4>
      {accounts.length === 0 ? (
        <p className="mypage-placeholder">등록된 계좌가 없습니다.</p>
      ) : (
        <ul>
          {accounts.map((account, index) => (
            <li key={index}>
              {account.bank} - {account.number}
            </li>
          ))}
        </ul>
      )}

      {/* 등록 버튼들 */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button className="action-button" onClick={() => openModal('card')}>카드 등록</button>
        <button className="action-button" onClick={() => openModal('account')}>계좌 등록</button>
      </div>

      {/* 등록 모달 */}
      {modalType && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close-button" onClick={closeModal}>X</button>
            <h4>{modalType === 'card' ? '카드 등록' : '계좌 등록'}</h4>

            {modalType === 'card' ? (
              <>
                <input
                  name="company"
                  placeholder="카드사"
                  maxLength={20}
                  onChange={handleInputChange}
                /><br />
                <input
                  name="number"
                  placeholder="카드번호 (숫자 16자리)"
                  maxLength={16}
                  pattern="\d*"
                  onChange={handleInputChange}
                /><br />
                <input
                  name="expiry"
                  placeholder="유효기간 (MM/YY)"
                  maxLength={5}
                  onChange={handleInputChange}
                /><br />
                <input
                  name="owner"
                  placeholder="소유자명"
                  maxLength={20}
                  onChange={handleInputChange}
                /><br />
                <input
                  name="cvc"
                  placeholder="CVC (3자리)"
                  maxLength={3}
                  pattern="\d*"
                  onChange={handleInputChange}
                /><br />
              </>
            ) : (
              <>
                <input name="bank" placeholder="은행명" onChange={handleInputChange} /><br />
                <input name="number" placeholder="계좌번호" onChange={handleInputChange} /><br />
                <input name="owner" placeholder="예금주" onChange={handleInputChange} /><br />
              </>
            )}

            <div style={{ marginTop: '20px' }}>
              <button className="action-button" onClick={handleSubmit}>등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentManager;
