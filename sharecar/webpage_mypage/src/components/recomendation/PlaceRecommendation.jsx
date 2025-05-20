import React, { useState, useEffect, useRef } from 'react';
import tagToKeywordMap from '../../utils/tagKeywordMap';
import { searchPlacesByKeyword } from '../../api/kakaoSearch';
import useKakaoLoader from './useKakaoLoader';
import '../../styles/PlaceRecommendation.css';

function PlaceRecommendation({ isDarkMode }) {
  const [keyword, setKeyword] = useState('');
  const [places, setPlaces] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useKakaoLoader(() => {
    setIsKakaoLoaded(true);
  });

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
    markersRef.current.forEach(obj => obj.marker.setMap(null));
    markersRef.current = [];
  };

  const displayMarkers = (places) => {
    if (!mapRef.current || !places || places.length === 0) return;
    clearMarkers();
    places.forEach((place, idx) => {
      const marker = new window.kakao.maps.Marker({
        map: mapRef.current,
        position: new window.kakao.maps.LatLng(place.y, place.x),
      });
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:5px; font-size:13px;">${place.place_name}</div>`,
      });
      marker.customIdx = idx;
      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(mapRef.current, marker);
        setSelectedIdx(idx);
      });
      markersRef.current.push({ marker, infowindow });
    });
    if (places[0]) {
      mapRef.current.setCenter(new window.kakao.maps.LatLng(places[0].y, places[0].x));
    }
  };

  const handleListClick = (idx) => {
    setSelectedIdx(idx);
    const place = places[idx];
    if (!place || !mapRef.current) return;
    mapRef.current.setCenter(new window.kakao.maps.LatLng(place.y, place.x));
    markersRef.current.forEach((obj, i) => {
      if (i === idx) {
        obj.infowindow.open(mapRef.current, obj.marker);
      } else {
        obj.infowindow.close();
      }
    });
  };

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

  const handleTagSearch = () => {
    const selectedTag = '가족과 함께';
    const keywords = tagToKeywordMap[selectedTag] || [];
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      alert('지도가 완전히 로드되지 않았습니다. 새로고침 해주세요.');
      return;
    }
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
  };

  return (
    <div className={`recommend-container${isDarkMode ? ' dark' : ' light'}`}>
      <div className="recommend-list">
        <h2>장소 추천</h2>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            className="recommend-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 커플 데이트, 조용한 카페 등"
          />
          <button className="recommend-btn" onClick={handleInputSearch}>직접 검색</button>
          <button className="recommend-btn" onClick={handleTagSearch}>태그 기반 추천</button>
        </div>
        <ul>
          {places.length === 0 ? (
            <li style={{ color: isDarkMode ? '#aaa' : '#888', textAlign: 'center', marginTop: 32 }}>
              검색 결과가 없습니다.
            </li>
          ) : (
            places.map((place, idx) => (
              <li
                key={place.id}
                className={selectedIdx === idx ? "selected" : ""}
                onClick={() => handleListClick(idx)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{place.place_name}</div>
                  <div style={{ fontSize: 13, color: isDarkMode ? '#eee' : '#888' }}>
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
      <div className="recommend-map-area">
        <div
          id="map"
          style={{
            width: '100%',
            height: '100%',
            minHeight: 500,
          }}
        />
      </div>
    </div>
  );
}

export default PlaceRecommendation;
