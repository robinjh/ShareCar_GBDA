import React, { useState } from 'react';
import Modal from './Modal';
import VehicleManager from './VehicleManager';
import PaymentManager from './PaymentManager';
import RequestManager from './RequestManager';
import RentalHistory from './RentalHistory';
import '../../styles/MyPage.css';

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
    <div className={isDarkMode ? "dark card" : "light card"}>
      <div className="flex-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="bold" style={{ fontSize: "2rem", margin: 0 }}>마이페이지</h1>
      </div>

      <div className="flex-col" style={{ gap: 18, marginTop: 24 }}>
        {menus.map(menu => (
          <button
            key={menu.key}
            className="btn"
            onClick={() => openModal(menu.key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "18px 24px",
              border: `1.5px solid ${isDarkMode ? 'var(--color-border-dark)' : 'var(--color-border)'}`,
              background: "inherit",
              boxShadow: "none"
            }}
          >
            <div className="menu-title">{menu.label}</div>
            <div className="menu-desc">
              클릭하여 {menu.label.replace(/^[^\s]+/, '').trim()}을 확인하거나 수정하세요.
            </div>
          </button>
        ))}
      </div>

      <Modal
        isOpen={!!modalContent}
        onClose={closeModal}
        title={menus.find(m => m.key === modalContent)?.label}
      >
        {modalContent === 'rental' && <RentalHistory />}
        {modalContent === 'vehicles' && <VehicleManager />}
        {modalContent === 'payments' && <PaymentManager />}
        {modalContent === 'requests' && <RequestManager />}
      </Modal>
    </div>
  );
}

export default MyPage;