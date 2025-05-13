import React, { useEffect } from 'react';

const KakaoMapComponent = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=294730ead0a126e12dd4041524aff75d&autoload=false`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById('map');
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 3,
        };
        new window.kakao.maps.Map(container, options);
      });
    };
  }, []);

  return (
    <>
      <h2>카카오 지도 테스트</h2>
      <div id="map" style={{ width: '100%', height: '400px' }}></div>
    </>
  );
};

export default KakaoMapComponent;
