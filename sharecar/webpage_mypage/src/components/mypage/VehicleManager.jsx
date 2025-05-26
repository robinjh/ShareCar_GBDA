import React, { useState, useEffect, useContext } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { UserContext } from "../../UserContext";
import "../../styles/VehicleManager.css";

function VehicleManager() {
  const { user } = useContext(UserContext);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  // 차량 목록 불러오기 (신규 구조)
  useEffect(() => {
    if (!user) return;
    const fetchCars = async () => {
      const q = query(
        collection(db, "registrations"),
        where("hostID", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      setCars(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchCars();
  }, [user]);

  // 삭제 함수
  const handleDelete = async (id) => {
    if (!window.confirm("정말로 차량을 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "registrations", id));
    setCars((prev) => prev.filter((car) => car.id !== id));
  };

  return (
    <div>
      {loading ? (
        <p>로딩 중...</p>
      ) : cars.length === 0 ? (
        <p>등록한 차량이 없습니다.</p>
      ) : (
        <ul className="vehicle-list">
          {cars.map((car) => (
            <li key={car.id}>
              {car.carBrand} / {car.carName} / {car.carNumber} / {car.carType} /{" "}
              {car.rentalFee}원
              {car.tags && car.tags.length > 0 && <> / {car.tags.join(", ")}</>}
              <button
                className="delete-btn"
                onClick={() => handleDelete(car.id)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="vehicle-manager-bottom">
        <button
          className="btn"
          onClick={() => (window.location.href = "/register-car")}
        >
          차량 등록
        </button>
      </div>
    </div>
  );
}

export default VehicleManager;
