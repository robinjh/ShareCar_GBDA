import React, { useState } from 'react';
import Modal from './Modal';
import VehicleManager from './VehicleManager';
import PaymentManager from './PaymentManager';
import RequestManager from './RequestManager';
import RentalHistory from './RentalHistory';
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
    <div className={`mypage-container ${isDarkMode ? 'dark' : 'light'}`}>
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
          {modalContent === 'rental' && <RentalHistory />}
          {modalContent === 'vehicles' && <VehicleManager />}
          {modalContent === 'payments' && <PaymentManager />}
          {modalContent === 'requests' && <RequestManager />}
        </Modal>
      )}
    </div>
  );
}

export default MyPage;
