import React, { useState } from 'react';
import { searchPlacesByKeyword } from '../../api/kakaoSearch';
import tagToKeywordMap from '../../utils/tagKeywordMap';

function PlaceRecommendation() {
  const [keyword, setKeyword] = useState('');
  const [places, setPlaces] = useState([]);

  const displayMarkers = (places) => {
    if (!places || places.length === 0) return;

    const container = document.getElementById('map');
    const options = {
      center: new window.kakao.maps.LatLng(places[0].y, places[0].x),
      level: 3,
    };
    const map = new window.kakao.maps.Map(container, options);

    places.forEach((place) => {
      const marker = new window.kakao.maps.Marker({
        map,
        position: new window.kakao.maps.LatLng(place.y, place.x),
      });

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:5px; font-size:13px;">${place.place_name}</div>`,
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker);
      });
    });
  };

  // ✅ 입력 기반 검색
  const handleInputSearch = async () => {
    try {
      const results = await searchPlacesByKeyword(keyword);
      setPlaces(results);
      displayMarkers(results);
    } catch (err) {
      console.error(err);
      alert('장소 검색 실패!');
    }
  };

  // ✅ 태그 기반 추천
  const handleTagSearch = () => {
    const selectedTag = '가족과 함께'; // 추후 props나 state로 교체 가능
    const keywords = tagToKeywordMap[selectedTag] || [];
    const ps = new window.kakao.maps.services.Places();

    setPlaces([]); // 초기화

    keywords.forEach((word) => {
      ps.keywordSearch(word, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          setPlaces(prev => [...prev, ...data]);
          displayMarkers(data);
        }
      });
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>장소 추천</h2>
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="예: 커플 데이트, 조용한 카페 등"
      />
      <button onClick={handleInputSearch} style={{ marginRight: '10px' }}>
        직접 검색
      </button>
      <button onClick={handleTagSearch}>태그 기반 추천</button>

      <ul style={{ marginTop: '20px' }}>
        {places.map((place) => (
          <li key={place.id}>
            <strong>{place.place_name}</strong> - {place.address_name}
          </li>
        ))}
      </ul>

      <div
        id="map"
        style={{
          width: '100%',
          height: '400px',
          marginTop: '20px',
          border: '1px solid #ccc',
        }}
      ></div>
    </div>
  );
}

export default PlaceRecommendation;
