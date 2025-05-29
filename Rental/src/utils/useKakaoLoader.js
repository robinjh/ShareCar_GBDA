import { useEffect } from "react";

// 전역 상태로 스크립트 로드 상태 관리
let isScriptLoading = false;
let scriptLoadPromise = null;
let isKakaoInitialized = false;

const useKakaoLoader = (callback) => {
  useEffect(() => {
    const scriptId = 'kakao-map-script';

    if (document.getElementById(scriptId)) {
      if (window.kakao && window.kakao.maps) callback();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.REACT_APP_KAKAO_JS_KEY}&autoload=false&libraries=services`;
    script.onload = () => window.kakao.maps.load(callback);
    document.head.appendChild(script);

    // 컴포넌트 언마운트 시 정리
    return () => {
      // 스크립트는 제거하지 않음 (다른 컴포넌트에서 사용할 수 있음)
    };
  }, [callback]);
};

export default useKakaoLoader; 