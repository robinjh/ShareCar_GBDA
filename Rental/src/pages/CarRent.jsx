import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CarRent.css";

const AVAILABLE_TAGS = [
  "데이트",
  "여행",
  "쇼핑",
  "맛집",
  "카페",
  "영화",
  "운동",
  "공부",
  "업무",
  "가족",
];

const CarRent = () => {
  const navigate = useNavigate();
  const [selectedTags, setSelectedTags] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [address, setAddress] = useState("");
  const [carId, setCarId] = useState("");

  const handleTagClick = (tag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTags || selectedTags.length === 0) {
      alert("태그를 1개 이상 선택해주세요.");
      return;
    }
    try {
      const response = await fetch("http://localhost:8080/api/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          carId: carId,
          startDate: startDate,
          endDate: endDate,
          tags: selectedTags,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert("대여 요청이 성공적으로 완료되었습니다!");
        // 장소 추천 페이지를 새 창으로 열기
        const tagsParam = encodeURIComponent(JSON.stringify(selectedTags));
        const addressParam = encodeURIComponent(address);
        window.open(
          `/place-recommendation?tags=${tagsParam}&address=${addressParam}`,
          "_blank"
        );
        navigate("/");
      } else {
        alert("대여 요청에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("대여 요청 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="car-rent-container" role="main">
      <h2>차량 대여</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="startDate">대여 기간</label>
          <div className="date-inputs">
            <input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              aria-label="대여 시작 시간"
            />
            <span>~</span>
            <input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              aria-label="대여 종료 시간"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="address">주소</label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="주소를 입력해주세요"
            required
            aria-label="대여 주소"
          />
        </div>

        <div className="form-group">
          <label id="tags-label">태그 선택</label>
          <div 
            className="tags-container" 
            role="group" 
            aria-labelledby="tags-label"
          >
            {AVAILABLE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-button ${selectedTags.includes(tag) ? "selected" : ""}`}
                onClick={() => handleTagClick(tag)}
                aria-pressed={selectedTags.includes(tag)}
                aria-label={`${tag} 태그 ${selectedTags.includes(tag) ? '선택됨' : '선택되지 않음'}`}
              >
                {tag}
              </button>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <div 
              className="selected-tags"
              role="status"
              aria-live="polite"
            >
              선택된 태그: {selectedTags.join(", ")}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="submit-button"
          aria-label="대여 요청하기"
        >
          대여 요청
        </button>
      </form>
    </div>
  );
};

export default CarRent; 