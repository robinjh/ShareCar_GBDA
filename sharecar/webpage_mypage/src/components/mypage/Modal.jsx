import React from "react";
import "../../styles/Common.css";

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="close-button" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}

export default Modal;