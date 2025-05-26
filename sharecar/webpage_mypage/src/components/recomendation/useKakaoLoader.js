import { useEffect } from 'react';

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
  }, [callback]);
};

export default useKakaoLoader;