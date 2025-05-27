import { useEffect } from 'react';

const useKakaoLoader = (callback) => {
  useEffect(() => {
    const scriptId = 'kakao-map-script';

    if (document.getElementById(scriptId)) {
      console.log("카카오맵 스크립트가 이미 존재합니다.");
      if (window.kakao && window.kakao.maps) {
        console.log("카카오맵이 이미 로드되어 있습니다.");
        callback();
      }
      return;
    }

    console.log("카카오맵 스크립트 로드 시작");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.REACT_APP_KAKAO_JS_KEY}&autoload=false&libraries=services`;
    
    script.onload = () => {
      console.log("카카오맵 스크립트 로드 완료");
      window.kakao.maps.load(() => {
        console.log("카카오맵 초기화 완료");
        callback();
      });
    };

    script.onerror = (error) => {
      console.error("카카오맵 스크립트 로드 실패:", error);
    };

    document.head.appendChild(script);
  }, [callback]);
};

export default useKakaoLoader; 