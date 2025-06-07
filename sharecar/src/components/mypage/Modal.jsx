import React from "react";
import "../../styles/Modal.css";

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()} // 클릭 버블링 방지(모달 외 클릭 시 닫힘)
      >
        <button className="close-button" onClick={onClose}>×</button>
        {title && <h2 style={{ marginBottom: 18 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export default Modal;