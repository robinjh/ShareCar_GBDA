import { useEffect } from "react";

const useKakaoLoader = (onLoad) => {
  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      onLoad();
      return;
    }

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.REACT_APP_KAKAO_MAP_KEY}&libraries=services&autoload=false`;
    script.async = true;

    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        onLoad();
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [onLoad]);
};

export default useKakaoLoader; 