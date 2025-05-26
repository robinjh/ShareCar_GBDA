import React, { useState, useEffect, useRef } from "react";
import tagToKeywordMap from "../../utils/tagKeywordMap";
import { searchPlacesByKeyword } from "../../api/kakaoSearch";
import useKakaoLoader from "./useKakaoLoader";
import "../../styles/Common.css";
import "../../styles/PlaceRecommendation.css";

function safePlaceName(name, maxLen = 16) {
  return name.length > maxLen ? name.slice(0, maxLen - 2) + "…" : name;
}

function PlaceRecommendation({ isDarkMode, address, tags }) {
  const [keyword, setKeyword] = useState("");
  const [places, setPlaces] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useKakaoLoader(() => setIsKakaoLoaded(true));

  // 지도 최초 생성 및 중심 address로 맞추기
  useEffect(() => {
    if (!isKakaoLoaded) return;
    const container = document.getElementById("map");
    if (container && !mapRef.current) {
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 5,
      };
      mapRef.current = new window.kakao.maps.Map(container, options);
    }
    // address가 있을 때 지도의 중심을 address로
    if (isKakaoLoaded && address) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(address, function (result, status) {
        if (status === window.kakao.maps.services.Status.OK) {
          const center = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          mapRef.current && mapRef.current.setCenter(center);
        }
      });
    }
  }, [isKakaoLoaded, address]);

  const clearMarkers = () => {
    markersRef.current.forEach((obj) => obj.infowindow.close());
    markersRef.current.forEach((obj) => obj.marker.setMap(null));
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
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `
          <div style="
            color: #232323;
            text-align: center;
            font-size: 15px;
            font-weight: 600;
            min-width: 80px;
            max-width: 160px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">&nbsp;${safePlaceName(place.place_name)}&nbsp;</div>
        `,
      });
      marker.customIdx = idx;
      window.kakao.maps.event.addListener(marker, "click", () => {
        markersRef.current.forEach((obj) => obj.infowindow.close());
        infowindow.open(mapRef.current, marker);
        setSelectedIdx(idx);
      });
      markersRef.current.push({ marker, infowindow });
    });
    if (placesArr[0]) {
      mapRef.current.setCenter(
        new window.kakao.maps.LatLng(placesArr[0].y, placesArr[0].x)
      );
    }
  };

  const handleListClick = (idx) => {
    setSelectedIdx(idx);
    const place = places[idx];
    if (!place || !mapRef.current) return;
    mapRef.current.setCenter(new window.kakao.maps.LatLng(place.y, place.x));
    markersRef.current.forEach((obj) => obj.infowindow.close());
    if (markersRef.current[idx]) {
      markersRef.current[idx].infowindow.open(
        mapRef.current,
        markersRef.current[idx].marker
      );
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
      alert("장소 검색 실패!");
    }
  };

  // 엔터 검색 지원
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") handleInputSearch();
  };

  // 태그 기반 추천(최초 mount)
  useEffect(() => {
    if (!isKakaoLoaded || !tags || tags.length === 0) return;
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services)
      return;

    // tags에서 키워드 모두 추출
    let allKeywords = [];
    tags.forEach((tag) => {
      const key = tag;
      const keywords = tagToKeywordMap[key] || [];
      allKeywords = [...allKeywords, ...keywords];
    });
    // 중복 키워드 제거
    allKeywords = [...new Set(allKeywords)];

    // 모든 키워드로 병렬 검색
    const ps = new window.kakao.maps.services.Places();
    setPlaces([]);
    setSelectedIdx(null);

    const center = mapRef.current.getCenter();

    let combined = [];
    let callCount = 0;
    allKeywords.forEach((word) => {
      ps.keywordSearch(
        word,
        (data, status) => {
          callCount += 1;
          if (
            status === window.kakao.maps.services.Status.OK &&
            Array.isArray(data)
          ) {
            combined = [...combined, ...data];
          }
          // 모든 키워드 검색 끝나면 중복(place_id 기준) 제거 후 표시
          if (callCount === allKeywords.length) {
            const uniquePlaces = [];
            const seen = new Set();
            for (const p of combined) {
              if (!seen.has(p.id)) {
                uniquePlaces.push(p);
                seen.add(p.id);
              }
            }
            setPlaces(uniquePlaces);
            displayMarkers(uniquePlaces);
          }
        },
        {
          location: center, // **지도 중심 좌표**
          radius: 20000, // **반경 3km 내 장소만 검색**
          sort: window.kakao.maps.services.SortBy.DISTANCE, // 거리순 정렬(선택)
        }
      );
    });
    // eslint-disable-next-line
  }, [isKakaoLoaded, tags]);

  return (
    <div className={`recommend-container${isDarkMode ? " dark" : " light"}`}>
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
          <button className="recommend-btn" onClick={handleInputSearch}>
            검색
          </button>
        </div>
        <div className="recommend-list-scroll">
          <ul>
            {places.length === 0 ? (
              <li className={`recommend-empty${isDarkMode ? " dark" : ""}`}>
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
                    onClick={(e) => e.stopPropagation()}
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
