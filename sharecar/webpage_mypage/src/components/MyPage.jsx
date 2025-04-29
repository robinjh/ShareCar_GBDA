import React, { useState } from 'react';
import Modal from './Modal';
import VehicleManager from './VehicleManager';
import PaymentManager from './PaymentManager';
import RequestManager from './RequestManager';
import '../styles/MyPage.css';

function MyPage({ isDarkMode, toggleMode }) {
  const [modalContent, setModalContent] = useState(null);

  const openModal = (key) => setModalContent(key);
  const closeModal = () => setModalContent(null);

  const menus = [
    { key: 'rental', label: '📜 대여 기록' },
    { key: 'vehicles', label: '🚗 차량 관리' },
    { key: 'requests', label: '📥 대여 요청' },
    { key: 'payments', label: '💳 결제 수단' },
  ];

  return (
    <div className="mypage-container">
      <div className="mypage-header-row">
        <h1 className="mypage-header">마이페이지</h1>
        <button
          className={`mode-toggle ${isDarkMode ? 'dark' : 'light'}`}
          onClick={toggleMode}
        >
          {isDarkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div className="mypage-menu-list">
        {menus.map((menu) => (
          <button
            key={menu.key}
            className="menu-button"
            onClick={() => openModal(menu.key)}
          >
            <div className="menu-label">{menu.label}</div>
            <div className="menu-description">
              클릭하여 {menu.label.replace(/^[^\s]+/, '').trim()}을 확인하거나 수정하세요.
            </div>
          </button>
        ))}
      </div>

      {modalContent && (
        <Modal
          title={menus.find((m) => m.key === modalContent).label}
          onClose={closeModal}
        >
          {modalContent === 'rental' && (
            <>
              <ul>
                <li>현대 아이오닉5 - 2024.02.13 ~ 2024.02.15</li>
                <li>기아 EV6 - 2024.03.01 ~ 2024.03.02</li>
              </ul>
            </>
          )}
          {modalContent === 'vehicles' && <VehicleManager />}
          {modalContent === 'payments' && <PaymentManager />}
          {modalContent === 'requests' && <RequestManager />}
        </Modal>
      )}
    </div>
  );
}

export default MyPage;
