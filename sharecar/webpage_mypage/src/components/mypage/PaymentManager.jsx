import React, { useState } from 'react';
import '../../styles/Common.css';

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
    const cleanedValue =
      name === 'number' || name === 'cvc'
        ? value.replace(/[^\d]/g, '') // 숫자만 남김
        : name === 'bankNumber'
          ? value.replace(/[^\d]/g, '')
          : name === 'expiry'
            ? value.replace(/[^\d\/]/g, '') // 숫자 + 슬래시만 허용
            : value;

    setForm((prev) => ({ ...prev, [name]: cleanedValue }));
  };

  const handleSubmit = () => {
    const requiredFields =
      modalType === 'card'
        ? ['company', 'number', 'expiry', 'owner', 'cvc']
        : ['bank', 'number', 'owner'];

    const hasEmpty = requiredFields.some((field) => !form[field]?.trim());
    if (hasEmpty) {
      alert('⚠️ 모든 항목을 입력해주세요.');
      return;
    }

    if (modalType === 'card') {
      setCards((prev) => [...prev, form]);
    } else {
      setAccounts((prev) => [...prev, form]);
    }
    closeModal();
  };

  return (
    <div>
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
                <select className="input" name="company" defaultValue="" onChange={handleInputChange}>
                  <option value="" disabled>카드사 선택</option>
                  <option value="국민카드">국민카드</option>
                  <option value="신한카드">신한카드</option>
                  <option value="삼성카드">삼성카드</option>
                  <option value="현대카드">현대카드</option>
                  <option value="롯데카드">롯데카드</option>
                  <option value="하나카드">하나카드</option>
                  <option value="우리카드">우리카드</option>
                  <option value="비자카드">비자카드</option>
                  <option value="마스터카드">마스터카드</option>
                  <option value="아멕스">아멕스</option>
                  <option value="카카오뱅크카드">카카오뱅크카드</option>
                  <option value="토스카드">토스카드</option>
                </select>
                <input
                  className="input"
                  type="text"
                  name="number"
                  placeholder="카드번호 (숫자 16자리)"
                  value={form.number || ''}
                  maxLength={16}
                  pattern="\d*"
                  onChange={handleInputChange}
                />
                <input
                  className="input"
                  type="text"
                  name="expiry"
                  placeholder="유효기간 (MM/YY)"
                  value={form.expiry || ''}
                  maxLength={5}
                  onChange={handleInputChange}
                />
                <input
                  className="input"
                  name="owner"
                  placeholder="소유자명"
                  maxLength={20}
                  onChange={handleInputChange}
                />
                <input
                  className="input"
                  type="text"
                  name="cvc"
                  placeholder="CVC (3자리)"
                  value={form.cvc || ''}
                  maxLength={3}
                  pattern="\d*"
                  onChange={handleInputChange}
                />
              </>
            ) : (
              <>
                <select className="input" name="bank" onChange={handleInputChange} defaultValue="">
                  <option value="" disabled>은행 선택</option>
                  <option value="국민은행">국민은행</option>
                  <option value="신한은행">신한은행</option>
                  <option value="우리은행">우리은행</option>
                  <option value="카카오뱅크">카카오뱅크</option>
                  <option value="IBK기업은행">IBK기업은행</option>
                  <option value="농협은행">농협은행</option>
                  <option value="SC제일은행">SC제일은행</option>
                  <option value="토스뱅크">토스뱅크</option>
                  <option value="부산은행">부산은행</option>
                  <option value="대구은행">대구은행</option>
                  <option value="광주은행">광주은행</option>
                </select>
                <input
                  className="input"
                  type="text"
                  name="number"
                  value={form.number || ''}
                  placeholder="계좌번호 (12~14자리)"
                  minLength={12}
                  maxLength={14}
                  pattern="\d*"
                  onChange={handleInputChange}
                />
                <input
                  className="input"
                  name="owner"
                  placeholder="예금주명"
                  maxLength={20}
                  onChange={handleInputChange}
                />
              </>
            )}

            <div style={{ marginTop: '20px' }}>
              <button className="btn" onClick={handleSubmit}>등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentManager;
