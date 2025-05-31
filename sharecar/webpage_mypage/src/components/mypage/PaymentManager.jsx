import React, { useState } from "react";
import { useEffect } from "react";
import "../../styles/PaymentManager.css"; // 새로 만든 스타일 파일 import
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useContext } from "react";
import { UserContext } from "../../UserContext";

function PaymentManager() {
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [modalType, setModalType] = useState(null); // 'card' 또는 'account'
  const [form, setForm] = useState({});
  const { user } = useContext(UserContext);
  const maskCardNumber = (num) => {
  if (!num) return "";
  return num.replace(/^(\d{4})\d{8}(\d{4})$/, "$1-****-****-$2");
};

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const paymentMethods = userSnap.data().paymentMethods || [];
        // 배열을 타입별로 분리
        setCards(paymentMethods.filter((pm) => pm.type === "card"));
        setAccounts(paymentMethods.filter((pm) => pm.type === "account"));
      }
    };
    fetchPayments();
  }, [user]);

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
      name === "number" || name === "cvc"
        ? value.replace(/[^\d]/g, "") // 숫자만 남김
        : name === "bankNumber"
        ? value.replace(/[^\d]/g, "")
        : name === "expiry"
        ? value.replace(/[^\d\/]/g, "") // 숫자 + 슬래시만 허용
        : value;
    setForm((prev) => ({ ...prev, [name]: cleanedValue }));
  };

  const handleSubmit = async () => {
    const requiredFields =
      modalType === "card"
        ? ["company", "number", "expiry", "owner", "cvc"]
        : ["bank", "number", "owner"];

    const hasEmpty = requiredFields.some((field) => !form[field]?.trim());
    if (hasEmpty) {
      alert("⚠️ 모든 항목을 입력해주세요.");
      return;
    }

    // 등록할 결제수단 객체에 type 필드 추가
    const newPaymentMethod = {
      ...form,
      type: modalType,
    };

    // Firestore 배열에 추가
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        paymentMethods: arrayUnion(newPaymentMethod),
      });
      // state에도 반영
      if (modalType === "card") setCards((prev) => [...prev, newPaymentMethod]);
      else setAccounts((prev) => [...prev, newPaymentMethod]);
    }
    closeModal();
  };

  const handleDelete = async (pmObj) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      paymentMethods: arrayRemove(pmObj),
    });
    // state에서도 반영
    if (pmObj.type === "card")
      setCards((prev) => prev.filter((c) => c !== pmObj));
    else setAccounts((prev) => prev.filter((a) => a !== pmObj));
  };

  return (
    <div className="payment-manager">
      <h4>등록된 카드</h4>
      <ul>
        {cards.length === 0 && (
          <li className="no-method">등록된 카드가 없습니다.</li>
        )}
        {cards.map((card, idx) => (
          <li key={idx}>
            • {card.company} / {maskCardNumber(card.number)} / {card.owner}
            <button onClick={() => handleDelete(card)} className="delete-btn">
              삭제
            </button>
          </li>
        ))}
      </ul>

      <h4>등록된 계좌</h4>
      <ul>
        {accounts.length === 0 && (
          <li className="no-method">등록된 계좌가 없습니다.</li>
        )}
        {accounts.map((account, idx) => (
          <li key={idx}>
            • {account.bank} / {account.number} / {account.owner}
            <button
              onClick={() => handleDelete(account)}
              className="delete-btn"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>

      {/* 등록 버튼 */}
      <div className="payment-btn-row">
        <button className="btn" onClick={() => openModal("card")}>
          카드 등록
        </button>
        <button className="btn" onClick={() => openModal("account")}>
          계좌 등록
        </button>
      </div>
      {/* 등록 모달 */}
      {modalType && (
        <div className="modal-overlay">
          <div className="modal payment-modal">
            <button className="close-button" onClick={closeModal}>
              X
            </button>
            <h4>{modalType === "card" ? "카드 등록" : "계좌 등록"}</h4>
            <div className="modal-form">
              {modalType === "card" ? (
                <>
                  <select
                    className="input"
                    name="company"
                    defaultValue=""
                    onChange={handleInputChange}
                  >
                    <option value="" disabled>
                      카드사 선택
                    </option>
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
                    value={form.number || ""}
                    maxLength={16}
                    pattern="\d*"
                    onChange={handleInputChange}
                  />
                  <input
                    className="input"
                    type="text"
                    name="expiry"
                    placeholder="유효기간 (MM/YY)"
                    value={form.expiry || ""}
                    maxLength={5}
                    onChange={handleInputChange}
                  />
                  <input
                    className="input"
                    name="owner"
                    placeholder="소유자명"
                    maxLength={20}
                    value={form.owner || ""}
                    onChange={handleInputChange}
                  />
                  <input
                    className="input"
                    type="text"
                    name="cvc"
                    placeholder="CVC (3자리)"
                    value={form.cvc || ""}
                    maxLength={3}
                    pattern="\d*"
                    onChange={handleInputChange}
                  />
                </>
              ) : (
                <>
                  <select
                    className="input"
                    name="bank"
                    onChange={handleInputChange}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      은행 선택
                    </option>
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
                    value={form.number || ""}
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
                    value={form.owner || ""}
                    onChange={handleInputChange}
                  />
                </>
              )}
              <button
                className="btn"
                onClick={handleSubmit}
                style={{ marginTop: 16 }}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PaymentManager;
