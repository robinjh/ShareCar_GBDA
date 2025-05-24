import React, { useState, useEffect, useRef } from 'react';
import tagToKeywordMap from '../../utils/tagKeywordMap';
import { searchPlacesByKeyword } from '../../api/kakaoSearch';
import useKakaoLoader from './useKakaoLoader';
import '../../styles/PlaceRecommendation.css';

function PlaceRecommendation({ isDarkMode, carTag }) {
  const [keyword, setKeyword] = useState('');
  const [places, setPlaces] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useKakaoLoader(() => setIsKakaoLoaded(true));

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
  }, [isKakaoLoaded]);

  const clearMarkers = () => {
    markersRef.current.forEach(obj => obj.infowindow.close());
    markersRef.current.forEach(obj => obj.marker.setMap(null));
    markersRef.current = [];
  };

  // 마커 + InfoWindow
  const displayMarkers = (placesArr) => {
    clearMarkers();
    if (!mapRef.current || !placesArr || placesArr.length === 0) return;
    placesArr.forEach((place, idx) => {
      const marker = new window.kakao.maps.Marker({
        map: mapRef.current,
        position: new window.kakao.maps.LatLng(place.y, place.x),
      });
      // InfoWindow는 기본만!
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div>${place.place_name}</div>`,
      });
      marker.customIdx = idx;
      window.kakao.maps.event.addListener(marker, 'click', () => {
        markersRef.current.forEach(obj => obj.infowindow.close());
        infowindow.open(mapRef.current, marker);
        setSelectedIdx(idx);
      });
      markersRef.current.push({ marker, infowindow });
    });
    if (placesArr[0]) {
      mapRef.current.setCenter(new window.kakao.maps.LatLng(placesArr[0].y, placesArr[0].x));
    }
  };

  const handleListClick = (idx) => {
    setSelectedIdx(idx);
    const place = places[idx];
    if (!place || !mapRef.current) return;
    mapRef.current.setCenter(new window.kakao.maps.LatLng(place.y, place.x));
    markersRef.current.forEach(obj => obj.infowindow.close());
    if (markersRef.current[idx]) {
      markersRef.current[idx].infowindow.open(mapRef.current, markersRef.current[idx].marker);
    }
  };

  // 직접 검색
  const handleInputSearch = async () => {
    try {
      if (!keyword.trim()) return;
      const results = await searchPlacesByKeyword(keyword);
      setPlaces(results);
      setSelectedIdx(null);
      displayMarkers(results);
    } catch (err) {
      console.error(err);
      alert('장소 검색 실패!');
    }
  };

  // 엔터 검색 지원
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') handleInputSearch();
  };

  // 태그 기반 추천(초기 mount)
  useEffect(() => {
    if (!isKakaoLoaded) return;
    const selectedTag = carTag || '가족과 함께';
    const keywords = tagToKeywordMap[selectedTag] || [];
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) return;
    const ps = new window.kakao.maps.services.Places();
    setPlaces([]);
    setSelectedIdx(null);
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
  }, [isKakaoLoaded, carTag]);

  return (
    <div className={`recommend-container${isDarkMode ? ' dark' : ' light'}`}>
      <div className="recommend-list">
        <h2>장소 추천</h2>
        <div className="recommend-search-group">
          <input
            type="text"
            className="recommend-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="예: 커플 데이트, 조용한 카페 등"
          />
          <button className="recommend-btn" onClick={handleInputSearch}>검색</button>
        </div>
        <div className="recommend-list-scroll">
          <ul>
            {places.length === 0 ? (
              <li className={`recommend-empty${isDarkMode ? ' dark' : ''}`}>
                검색 결과가 없습니다.
              </li>
            ) : (
              places.map((place, idx) => (
                <li
                  key={place.id}
                  className={selectedIdx === idx ? "selected" : ""}
                  onClick={() => handleListClick(idx)}
                >
                  <div className="recommend-item-text">
                    <div>{place.place_name}</div>
                    <div className="recommend-address">
                      {place.road_address_name || place.address_name}
                    </div>
                  </div>
                  <a
                    href={place.place_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="recommend-link"
                    onClick={e => e.stopPropagation()}
                  >
                    카카오맵에서 보기
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      <div className="recommend-map-area">
        <div id="map" className="recommend-map" />
      </div>
    </div>
  );
}

export default PlaceRecommendation;
