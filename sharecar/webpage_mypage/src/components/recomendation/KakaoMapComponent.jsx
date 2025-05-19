import React from 'react';
import useKakaoLoader from './useKakaoLoader';

const KakaoMapComponent = () => {
  // useKakaoLoader를 바로 호출!
  useKakaoLoader(() => {
    const container = document.getElementById('map');
    const options = {
      center: new window.kakao.maps.LatLng(37.5665, 126.9780),
      level: 3,
    };
    new window.kakao.maps.Map(container, options);
  });

  return (
    <>
      <h2>카카오 지도 테스트</h2>
      <div id="map" style={{ width: '100%', height: '400px' }} />
    </>
  );
};

export default KakaoMapComponent;