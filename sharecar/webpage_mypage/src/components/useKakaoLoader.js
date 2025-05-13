const useKakaoLoader = (callback) => {
  const existingScript = document.getElementById('kakao-map-script');
  if (!existingScript) {
    const script = document.createElement('script');
    script.id = 'kakao-map-script';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=294730ead0a126e12dd4041524aff75d&autoload=false`;

    script.onload = () => {
      console.log('✅ Kakao script loaded');
      window.kakao.maps.load(() => {
        console.log('✅ Kakao map loaded');
        callback();
      });
    };
    document.head.appendChild(script);
  } else {
    console.log('✅ Kakao script already exists');
    window.kakao.maps.load(() => {
      console.log('✅ Kakao map loaded');
      callback();
    });
  }
};

export default useKakaoLoader;