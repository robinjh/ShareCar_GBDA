import React, { useState, useEffect, useContext } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { UserContext } from "../../UserContext"; // user 가져오는 곳
import '../../styles/Common.css';

function VehicleManager() {
  const { user } = useContext(UserContext);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  // 차량 목록 불러오기
  useEffect(() => {
    if (!user) return;
    const fetchCars = async () => {
      const q = query(
        collection(db, "registrations"),
        where("4_statusInfo.hostID", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      setCars(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchCars();
  }, [user]);

  // 삭제 함수
  const handleDelete = async (id) => {
    if (!window.confirm("정말로 차량을 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "registrations", id));
    setCars(prev => prev.filter(car => car.id !== id));
  };

  return (
    <div>
      <h2>내 차량 목록</h2>
      {loading ? (
        <p>로딩 중...</p>
      ) : cars.length === 0 ? (
        <p>등록한 차량이 없습니다.</p>
      ) : (
        <ul>
          {cars.map(car => (
            <li key={car.id}>
              {/* 안전하게 중첩 map 접근 + 기본값 처리 */}
              {car["1_basicInfo"]?.name || "차명 없음"} /
              {car["1_basicInfo"]?.carNumber || "번호 없음"} /
              {car["1_basicInfo"]?.rentalFee || "요금 없음"}원 /
              상태: {car["4_statusInfo"]?.status || "정보 없음"}
              <button onClick={() => handleDelete(car.id)}>삭제</button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => window.location.href = "/register-car"}>
        차량 등록
      </button>
    </div>
  );
}

export default VehicleManager;