import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { searchPlacesByKeyword } from "../api/kakaoSearch";
import useKakaoLoader from "../utils/useKakaoLoader";
import tagToKeywordMap from "../utils/tagKeywordMap";
import SearchIcon from '@mui/icons-material/Search';
import "../styles/Common.css";
import "../styles/PlaceRecommendation.css";

function safePlaceName(name, maxLen = 16) {
  return name.length > maxLen ? name.slice(0, maxLen - 2) + "…" : name;
}

// 태그 정규화 함수
function normalizeTag(tag) {
  return tag.replace(/#/g, '').replace(/\s/g, '').toLowerCase();
}

// 정규화된 매핑 객체 생성
const normalizedTagToKeywordMap = {};
Object.keys(tagToKeywordMap).forEach(key => {
  normalizedTagToKeywordMap[normalizeTag(key)] = tagToKeywordMap[key];
});

function PlaceRecommendation({ isDarkMode, tags: propTags, address: propAddress }) {
  const location = useLocation();
  const [keyword, setKeyword] = useState("");
  const [places, setPlaces] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);
  const [tags, setTags] = useState([]);
  const [address, setAddress] = useState("");
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const isMounted = useRef(true);

  // URL 파라미터 또는 props에서 태그와 주소 가져오기
  useEffect(() => {
    if (propTags && propAddress) {
      // props로 전달된 경우
      setTags(propTags);
      setAddress(propAddress);
    } else {
      // URL 파라미터로 전달된 경우
      const searchParams = new URLSearchParams(location.search);
      try {
        const tagsParam = searchParams.get('tags');
        const addressParam = searchParams.get('address');
        
        if (tagsParam) {
          const decodedTags = JSON.parse(decodeURIComponent(tagsParam));
          setTags(decodedTags);
        }
        
        if (addressParam) {
          setAddress(decodeURIComponent(addressParam));
        }
      } catch (error) {
        console.error('URL 파라미터 파싱 실패:', error);
      }
    }
  }, [location.search, propTags, propAddress]);

  // 컴포넌트 마운트/언마운트 관리
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 카카오맵 로드
  useKakaoLoader(() => {
    if (!isMounted.current) return;
    setIsKakaoLoaded(true);
  });

  // 지도 초기화 함수
  const initializeMap = useCallback(() => {
    if (!isMounted.current || !isKakaoLoaded) return;

    const container = document.getElementById("map");
    if (!container) return;

    try {
      if (!mapRef.current) {
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.978),
          level: 4,
        };
        mapRef.current = new window.kakao.maps.Map(container, options);
      }

      if (address) {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, function (result, status) {
          if (!isMounted.current) return;
          
          if (status === window.kakao.maps.services.Status.OK) {
            const center = new window.kakao.maps.LatLng(result[0].y, result[0].x);
            mapRef.current && mapRef.current.setCenter(center);
            mapRef.current && mapRef.current.setLevel(4);
          } else {
            console.error('주소 검색 실패:', status);
          }
        });
      }
    } catch (error) {
      console.error("지도 초기화 중 오류 발생:", error);
    }
  }, [isKakaoLoaded, address]);

  // 지도 초기화
  useEffect(() => {
    if (isKakaoLoaded) {
      initializeMap();
    }
  }, [isKakaoLoaded, initializeMap]);

  // 검색 실행 함수
  const executeSearch = useCallback(() => {
    if (!isMounted.current || !isKakaoLoaded || !tags || !Array.isArray(tags) || tags.length === 0) return;
    if (!window.kakao?.maps?.services || !mapRef.current) return;

    // 주소로 좌표 가져오기
    const getCoordinates = () => {
      return new Promise((resolve, reject) => {
        if (!address) {
          resolve(null);
          return;
        }
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            resolve({
              lat: result[0].y,
              lng: result[0].x
            });
          } else {
            resolve(null);
          }
        });
      });
    };

    // 태그에서 키워드 추출
    const keywords = tags.map(tag => {
      const cleanTag = normalizeTag(tag);
      return normalizedTagToKeywordMap[cleanTag] || [];
    }).flat();

    // 중복 제거
    const uniqueKeywords = [...new Set(keywords)];
    if (uniqueKeywords.length === 0) return;

    // 주소 좌표 가져오기
    getCoordinates().then(coords => {
      // 각 키워드로 검색 실행
      const searchPromises = uniqueKeywords.map(keyword => {
        return new Promise((resolve) => {
          const places = new window.kakao.maps.services.Places();
          const options = {
            keyword: keyword,
            location: coords ? new window.kakao.maps.LatLng(coords.lat, coords.lng) : undefined,
            radius: 5000 // 5km 반경 내 검색
          };
          
          places.keywordSearch(keyword, (results, status) => {
            if (!isMounted.current) return;
            
            if (status === window.kakao.maps.services.Status.OK) {
              // 거리 정보가 있는 결과만 필터링
              const filteredResults = results.filter(place => place.distance !== undefined);
              resolve(filteredResults);
            } else {
              resolve([]);
            }
          }, options);
        });
      });

      // 모든 검색 결과 병합
      Promise.all(searchPromises).then(resultsArray => {
        if (!isMounted.current) return;
        
        const allResults = resultsArray.flat();
        // 중복 제거
        const uniqueResults = allResults.filter((place, index, self) =>
          index === self.findIndex(p => p.id === place.id)
        );

        // 거리순으로 정렬
        uniqueResults.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

        setPlaces(uniqueResults);
        
        if (uniqueResults.length > 0) {
          const bounds = new window.kakao.maps.LatLngBounds();
          uniqueResults.forEach(place => {
            const position = new window.kakao.maps.LatLng(place.y, place.x);
            bounds.extend(position);
          });
          mapRef.current.setBounds(bounds);
          
          if (uniqueResults.length === 1) {
            mapRef.current.setLevel(5);
          } else {
            const currentLevel = mapRef.current.getLevel();
            if (currentLevel > 4) {
              mapRef.current.setLevel(4);
            }
          }
          displayMarkers(uniqueResults);
        }
      }).catch(error => {
        console.error('검색 중 오류 발생:', error);
      });
    });
  }, [isKakaoLoaded, tags, address]);

  // 태그 변경 시 검색 실행
  useEffect(() => {
    if (isKakaoLoaded && tags && Array.isArray(tags) && tags.length > 0) {
      executeSearch();
    }
  }, [tags, isKakaoLoaded, executeSearch]);

  // 컴포넌트 마운트 시 지도 컨테이너 크기 조정
  useEffect(() => {
    const resizeMap = () => {
      if (mapRef.current) {
        mapRef.current.relayout();
      }
    };

    setTimeout(resizeMap, 100);
    window.addEventListener('resize', resizeMap);
    return () => window.removeEventListener('resize', resizeMap);
  }, []);

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

  return (
    <div className={`recommend-container ${isDarkMode ? "dark" : "light"}`}>
      <div className="recommend-map-container">
        <div id="map" className="recommend-map"></div>
      </div>
      <div className="recommend-list-container">
        <div className="recommend-list-header">
          <h2>추천 장소</h2>
          <div className="recommend-search">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="장소 검색"
              className={`recommend-search-input ${isDarkMode ? "dark" : "light"}`}
            />
            <button 
              onClick={handleInputSearch} 
              className="recommend-search-button"
              aria-label="장소 검색"
            >
              <SearchIcon />
            </button>
          </div>
        </div>
        <div className="recommend-list-scroll">
          <div className={`search-results ${isDarkMode ? "dark" : "light"}`}>
            {places.length === 0 ? (
              <div className="recommend-empty">
                검색 결과가 없습니다.
              </div>
            ) : (
              places.map((place, idx) => (
                <div
                  key={place.id}
                  className={`place-item ${isDarkMode ? "dark" : "light"} ${selectedIdx === idx ? "selected" : ""}`}
                  onClick={() => handleListClick(idx)}
                >
                  <div className="place-content">
                    <h3>{place.place_name}</h3>
                    <p>{place.road_address_name || place.address_name}</p>
                    <p>전화번호: {place.phone || '정보 없음'}</p>
                    <p>거리: {place.distance ? `${Math.round(place.distance)}m` : '정보 없음'}</p>
                  </div>
                  <a
                    href={place.place_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="place-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    카카오맵에서 보기
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlaceRecommendation;