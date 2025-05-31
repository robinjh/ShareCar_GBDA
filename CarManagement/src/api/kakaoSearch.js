export async function searchPlacesByKeyword(keyword) {
    const REST_API_KEY = "c1f4a0f381cea0c37990da77e2f0e1c1";
  
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}`,
      {
        headers: {
          Authorization: `KakaoAK ${REST_API_KEY}`,
        },
      }
    );
  
    if (!res.ok) throw new Error('검색 실패');
    const data = await res.json();
    return data.documents;
  }