// components/Modal.jsx
import React from 'react';
import '../styles/MyPage.css'; // 모달 스타일 포함되어 있다고 가정

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="close-button" onClick={onClose}>X</button>
        <div className="modal-content">
          <h3>{title}</h3>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
