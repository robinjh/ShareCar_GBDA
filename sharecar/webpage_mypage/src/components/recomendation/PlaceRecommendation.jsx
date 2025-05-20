import React, { useState, useEffect, useRef } from 'react';
import tagToKeywordMap from '../../utils/tagKeywordMap';
import { searchPlacesByKeyword } from '../../api/kakaoSearch';
import useKakaoLoader from './useKakaoLoader';

function PlaceRecommendation() {
  const [keyword, setKeyword] = useState('');
  const [places, setPlaces] = useState([]);
  const [isKakaoLoaded, setIsKakaoLoaded] = useState(false); // SDK 로드 완료 체크
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // ✅ SDK 로드 후에만 setIsKakaoLoaded(true)로!
  useKakaoLoader(() => {
    setIsKakaoLoaded(true);
  });

  // ✅ SDK가 로드된 후에만 지도 생성!
  useEffect(() => {
    if (!isKakaoLoaded) return;

    const container = document.getElementById('map');
    if (container && !mapRef.current) {
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780),
        level: 5,
      };
      mapRef.current = new window.kakao.maps.Map(container, options);
    }
  }, [isKakaoLoaded]); // ← isKakaoLoaded가 true일 때만 실행

  // 이하 동일
  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const displayMarkers = (places) => {
    if (!mapRef.current || !places || places.length === 0) return;
    clearMarkers();
    places.forEach((place) => {
      const marker = new window.kakao.maps.Marker({
        map: mapRef.current,
        position: new window.kakao.maps.LatLng(place.y, place.x),
      });
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:5px; font-size:13px;">${place.place_name}</div>`,
      });
      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(mapRef.current, marker);
      });
      markersRef.current.push(marker);
    });
    if (places[0]) {
      mapRef.current.setCenter(new window.kakao.maps.LatLng(places[0].y, places[0].x));
    }
  };

  const handleInputSearch = async () => {
    try {
      if (!keyword.trim()) return;
      const results = await searchPlacesByKeyword(keyword);
      setPlaces(results);
      displayMarkers(results);
    } catch (err) {
      console.error(err);
      alert('장소 검색 실패!');
    }
  };

  const handleTagSearch = () => {
    const selectedTag = '가족과 함께';
    const keywords = tagToKeywordMap[selectedTag] || [];
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      alert('지도가 완전히 로드되지 않았습니다. 새로고침 해주세요.');
      return;
    }
    const ps = new window.kakao.maps.services.Places();
    setPlaces([]); // 초기화
    let combined = [];
    let callCount = 0;
    keywords.forEach((word) => {
      ps.keywordSearch(word, (data, status) => {
        callCount += 1;
        if (status === window.kakao.maps.services.Status.OK) {
          combined = [...combined, ...data];
        }
        if (callCount === keywords.length) {
          setPlaces(combined);
          displayMarkers(combined);
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
