import "@testing-library/jest-dom";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import PlaceRecommendation, {
  safePlaceName,
  clearMarkers,
  displayMarkers,
  handleListClick,
  handleInputKeyDownExport,
  setMapCenterIfOk,
} from "./PlaceRecommendation";
import * as kakaoSearch from "../../api/kakaoSearch";

jest.mock("../../api/kakaoSearch", () => ({
  searchPlacesByKeyword: jest.fn(),
}));

const defaultProps = {
  isDarkMode: false,
  address: "서울특별시 종로구 세종대로 110",
  tags: ["#커플 데이트"], // 실제 tagToKeywordMap에 있는 값
};

function createMapDiv() {
  const mapDiv = document.createElement("div");
  mapDiv.id = "map";
  document.body.appendChild(mapDiv);
}

beforeEach(() => {
  while (document.getElementById && document.getElementById("map")) {
    const elem = document.getElementById("map");
    if (elem && typeof elem.remove === "function") {
      elem.remove();
    } else if (elem && elem.parentNode) {
      elem.parentNode.removeChild(elem);
    } else {
      break;
    }
  }
  window.kakao = {
    maps: {
      LatLng: function (y, x) {
        return { y, x };
      },
      Map: function () {
        return {
          setCenter: jest.fn(),
          getCenter: jest.fn(() => ({ y: 37.5665, x: 126.978 })),
        };
      },
      Marker: function () {
        return { setMap: jest.fn() };
      },
      InfoWindow: function () {
        return { open: jest.fn(), close: jest.fn() };
      },
      event: { addListener: jest.fn() },
      services: {
        Geocoder: function () {
          return {
            addressSearch: jest.fn((address, cb) => cb([{ y: 1, x: 2 }], "OK")),
          };
        },
        Places: function () {
          return {
            keywordSearch: jest.fn((word, cb) => cb([], "OK")),
          };
        },
        Status: { OK: "OK" },
        SortBy: { DISTANCE: "DISTANCE" },
      },
    },
  };
});
afterEach(() => {
  while (document.getElementById && document.getElementById("map")) {
    const elem = document.getElementById("map");
    if (elem && typeof elem.remove === "function") {
      elem.remove();
    } else if (elem && elem.parentNode) {
      elem.parentNode.removeChild(elem);
    } else {
      break;
    }
  }
  jest.clearAllMocks();
  cleanup();
});

describe("PlaceRecommendation - branch coverage", () => {
  it("safePlaceName - maxLen 분기", () => {
    expect(safePlaceName("짧은이름", 10)).toBe("짧은이름");
    expect(safePlaceName("12345678901234567890", 10)).toBe("12345678…");
  });

  it("clearMarkers - 마커와 infowindow close/setMap 호출", () => {
    const close = jest.fn();
    const setMap = jest.fn();
    const markersRef = {
      current: [{ marker: { setMap }, infowindow: { close } }],
    };
    clearMarkers(markersRef);
    expect(close).toHaveBeenCalled();
    expect(setMap).toHaveBeenCalled();
    expect(markersRef.current).toEqual([]);
  });

  it("handleListClick - places 비어있을 때 return", () => {
    const setSelectedIdx = jest.fn();
    const mapRef = { current: {} };
    handleListClick(0, [], setSelectedIdx, mapRef, { current: [] });
    expect(setSelectedIdx).toHaveBeenCalledWith(0);
  });

  it("handleListClick - markersRef.current[idx] undefined", () => {
    const setSelectedIdx = jest.fn();
    const mapRef = { current: { setCenter: jest.fn() } };
    const markersRef = { current: [undefined] };
    const places = [{ place_name: "테스트", y: 1, x: 2 }];
    expect(() =>
      handleListClick(0, places, setSelectedIdx, mapRef, markersRef)
    ).not.toThrow();
  });

  it("handleListClick - markersRef.current[idx]가 있을 때 infowindow.open 호출", () => {
    const setSelectedIdx = jest.fn();
    const mapRef = { current: { setCenter: jest.fn() } };
    const open = jest.fn();
    const close = jest.fn();
    const marker = {};
    const infowindow = { open, close };
    const markersRef = { current: [{ marker, infowindow }] };
    const places = [{ place_name: "카페", y: 1, x: 2 }];
    window.kakao = { maps: { LatLng: function () {} } };
    handleListClick(0, places, setSelectedIdx, mapRef, markersRef);
    expect(open).toHaveBeenCalled();
  });

  it("displayMarkers - place undefined", () => {
    const mapRef = { current: { setCenter: jest.fn() } };
    const markersRef = { current: [] };
    expect(() =>
      displayMarkers([undefined], mapRef, markersRef, jest.fn())
    ).not.toThrow();
  });

  it("displayMarkers - placesArr[0] falsy", () => {
    const mapRef = { current: { setCenter: jest.fn() } };
    const markersRef = { current: [] };
    expect(() =>
      displayMarkers([], mapRef, markersRef, jest.fn())
    ).not.toThrow();
    expect(mapRef.current.setCenter).not.toHaveBeenCalled();
  });

  it("displayMarkers - placesArr[0]가 있을 때 mapRef.current.setCenter 호출", () => {
    const setSelectedIdx = jest.fn();
    const mapRef = { current: { setCenter: jest.fn() } };
    const markersRef = { current: [] };
    const placesArr = [{ place_name: "카페", y: 1, x: 2 }];
    displayMarkers(placesArr, mapRef, markersRef, setSelectedIdx);
    expect(mapRef.current.setCenter).toHaveBeenCalled();
  });

  it("태그 기반 추천 - tags undefined/empty/allKeywords 0개", () => {
    createMapDiv();
    render(<PlaceRecommendation {...defaultProps} tags={undefined} />);
    createMapDiv();
    render(<PlaceRecommendation {...defaultProps} tags={[]} />);
    createMapDiv();
    render(<PlaceRecommendation {...defaultProps} tags={["#없는태그"]} />);
  });

  it("태그 기반 추천 - center 없음", () => {
    createMapDiv();
    window.kakao.maps.Map = jest.fn(() => ({
      getCenter: () => undefined,
      setCenter: jest.fn(),
    }));
    render(<PlaceRecommendation {...defaultProps} />);
  });

  it("태그 기반 추천 - keywordSearch status !== OK", () => {
    window.kakao.maps.services.Places = function () {
      return { keywordSearch: (word, cb) => cb([], "FAIL") };
    };
    render(<PlaceRecommendation {...defaultProps} />);
  });

  it("태그 기반 추천 - keywordSearch data 배열 아님", () => {
    window.kakao.maps.services.Places = function () {
      return { keywordSearch: (word, cb) => cb("not-an-array", "OK") };
    };
    render(<PlaceRecommendation {...defaultProps} />);
  });

  it("태그 기반 추천 - seen.has true(중복)", () => {
    window.kakao.maps.services.Places = function () {
      return {
        keywordSearch: (word, cb) =>
          cb(
            [
              {
                id: "dup",
                place_name: "a",
                y: 1,
                x: 2,
                place_url: "u",
                address_name: "a",
                road_address_name: "r",
              },
              {
                id: "dup",
                place_name: "a",
                y: 1,
                x: 2,
                place_url: "u",
                address_name: "a",
                road_address_name: "r",
              },
            ],
            "OK"
          ),
      };
    };
    render(<PlaceRecommendation {...defaultProps} />);
  });

  it("태그 기반 추천 - 콜백, 모든 분기 진입 및 displayMarkers 호출", async () => {
    createMapDiv();
    const keywordSearchMock = jest.fn((word, cb) => {
      cb(
        [
          {
            id: "x1",
            place_name: "카페1",
            y: 1,
            x: 2,
            place_url: "u",
            address_name: "a",
            road_address_name: "r",
          },
          {
            id: "x2",
            place_name: "카페2",
            y: 2,
            x: 3,
            place_url: "u",
            address_name: "b",
            road_address_name: "r",
          },
        ],
        "OK"
      );
    });
    window.kakao.maps.services.Places = function () {
      return { keywordSearch: keywordSearchMock };
    };
    render(<PlaceRecommendation {...defaultProps} />);
    await waitFor(() => {
      expect(keywordSearchMock).toHaveBeenCalled();
    });
  });

  it("태그 기반 추천 - 중복 id 걸러내는 seen.has 분기까지 커버", () => {
    createMapDiv();
    window.kakao.maps.services.Places = function () {
      return {
        keywordSearch: (word, cb) => {
          if (word === "데이트 명소") {
            cb(
              [
                {
                  id: "dup",
                  place_name: "카페A",
                  y: 1,
                  x: 2,
                  place_url: "u",
                  address_name: "a",
                  road_address_name: "r",
                },
                {
                  id: "dup",
                  place_name: "카페A",
                  y: 1,
                  x: 2,
                  place_url: "u",
                  address_name: "a",
                  road_address_name: "r",
                },
              ],
              "OK"
            );
          } else {
            cb(
              [
                {
                  id: "other",
                  place_name: "카페B",
                  y: 3,
                  x: 4,
                  place_url: "u",
                  address_name: "b",
                  road_address_name: "r",
                },
              ],
              "OK"
            );
          }
        },
      };
    };
    render(
      <PlaceRecommendation
        {...defaultProps}
        tags={["#커플 데이트", "#데이트 명소"]}
      />
    );
  });

  // ===== [주소검색 status OK 분기 및 지도 중심 이동, setIsMapCentered true 커버] =====
  it("주소검색 status OK일 때 지도 중심 이동, setIsMapCentered true", () => {
    createMapDiv();
    const setIsMapCentered = jest.fn();
    const setCenter = jest.fn();
    window.kakao.maps.services.Geocoder = function () {
      return {
        addressSearch: (address, cb) => cb([{ y: 35.1, x: 129.1 }], "OK"),
      };
    };
    window.kakao.maps.Map = jest.fn(() => ({
      setCenter,
      getCenter: jest.fn(() => ({ y: 35.1, x: 129.1 })),
    }));
    render(
      <PlaceRecommendation
        {...defaultProps}
        address="부산시 해운대구 센텀서로 30"
      />
    );
    expect(setCenter).toHaveBeenCalled();
  });

  // ===== [handleInputSearch - 정상 검색 성공/실패/공백 분기] =====
  it("handleInputSearch - 정상 검색 시 분기들 커버", async () => {
    createMapDiv();
    const mockResults = [
      {
        id: "5",
        place_name: "테스트카페",
        y: 37.5665,
        x: 126.978,
        place_url: "https://place.map.kakao.com/5",
        address_name: "주소대체",
      },
    ];
    kakaoSearch.searchPlacesByKeyword.mockResolvedValueOnce(mockResults);
    render(<PlaceRecommendation {...defaultProps} />);
    fireEvent.change(
      screen.getByPlaceholderText("예: 커플 데이트, 조용한 카페 등"),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("검색"));
    await waitFor(() => {
      expect(kakaoSearch.searchPlacesByKeyword).toHaveBeenCalled();
      expect(screen.getByText("테스트카페")).toBeInTheDocument();
    });
  });

  it("handleInputSearch - 검색 실패 시 alert 호출", async () => {
    createMapDiv();
    kakaoSearch.searchPlacesByKeyword.mockRejectedValueOnce(new Error("fail"));
    window.alert = jest.fn();
    render(<PlaceRecommendation {...defaultProps} />);
    fireEvent.change(
      screen.getByPlaceholderText("예: 커플 데이트, 조용한 카페 등"),
      { target: { value: "실패케이스" } }
    );
    fireEvent.click(screen.getByText("검색"));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("장소 검색 실패!");
    });
  });

  it("handleInputSearch - keyword가 공백일 때 분기 커버", async () => {
    createMapDiv();
    render(<PlaceRecommendation {...defaultProps} />);
    fireEvent.change(
      screen.getByPlaceholderText("예: 커플 데이트, 조용한 카페 등"),
      { target: { value: "   " } }
    );
    fireEvent.click(screen.getByText("검색"));
    // 아무 일도 안 하면 커버
  });

  // ===== [places.map 및 li 클릭 분기 커버] =====
  it("places.map 렌더, li 클릭시 handleListClick & selected 분기 커버", async () => {
    createMapDiv();
    const mockResults = [
      {
        id: "5",
        place_name: "테스트카페",
        y: 37.5665,
        x: 126.978,
        place_url: "https://place.map.kakao.com/5",
        address_name: "주소대체",
      },
    ];
    kakaoSearch.searchPlacesByKeyword.mockResolvedValueOnce(mockResults);
    render(<PlaceRecommendation {...defaultProps} />);
    fireEvent.change(
      screen.getByPlaceholderText("예: 커플 데이트, 조용한 카페 등"),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("검색"));
    await waitFor(() => {
      const li = screen.getByText("테스트카페").closest("li");
      expect(li).not.toBeNull();
      fireEvent.click(li);
      expect(li).toHaveClass("selected");
    });
  });
  it("카카오맵 링크 클릭 시 stopPropagation 커버 (이벤트 mock)", async () => {
    createMapDiv();
    const mockResults = [
      {
        id: "5",
        place_name: "테스트카페",
        y: 37.5665,
        x: 126.978,
        place_url: "https://place.map.kakao.com/5",
        address_name: "주소대체",
      },
    ];
    kakaoSearch.searchPlacesByKeyword.mockResolvedValueOnce(mockResults);
    render(<PlaceRecommendation {...defaultProps} />);
    fireEvent.change(
      screen.getByPlaceholderText("예: 커플 데이트, 조용한 카페 등"),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("검색"));
    await waitFor(() => {
      const link = screen.getByText("카카오맵에서 보기").closest("a");
      expect(link).not.toBeNull();
      // 실제 click이벤트에 stopPropagation mock을 넣으려면 createEvent로 직접 이벤트 객체를 만들어야 함
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      event.stopPropagation = jest.fn();
      link.dispatchEvent(event);
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  // ===== [다크모드(dark) 분기, recommend-container/empty 커버] =====
  it("다크모드 분기 및 검색결과 없음 li, recommend-container dark 커버", () => {
    createMapDiv();
    render(
      <PlaceRecommendation
        {...defaultProps}
        isDarkMode={true}
        tags={[]} // 검색 결과 없음
      />
    );
    expect(document.querySelector(".recommend-container.dark")).not.toBeNull();
    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
    const li = document.querySelector(".recommend-empty.dark");
    expect(li).not.toBeNull();
  });

  // ===== [마커 클릭시 forEach(마커로그 및 close) 분기 커버] =====
  it("마커 클릭시 forEach(마커로그 및 close) 분기 커버", () => {
    createMapDiv();
    const setSelectedIdx = jest.fn();
    const setCenter = jest.fn();
    const open = jest.fn();
    const close = jest.fn();
    const marker = { setMap: jest.fn() };
    const infowindow = { open, close };
    const markersRef = { current: [{ marker, infowindow }] };
    window.kakao = {
      maps: {
        Marker: function () {
          return marker;
        },
        LatLng: function () {},
        InfoWindow: function () {
          return infowindow;
        },
        event: {
          addListener: (marker, event, cb) => cb(),
        },
      },
    };
    displayMarkers(
      [{ id: "unique", place_name: "카페", y: 1, x: 2 }],
      { current: { setCenter } },
      markersRef,
      setSelectedIdx
    );
    expect(close).toHaveBeenCalled();
  });

  // ===== [Enter키 입력시 handleInputSearch 호출 분기 커버] =====
  it("Enter키 입력시 handleInputSearch 호출 분기 커버", async () => {
    createMapDiv();
    const mockResults = [
      {
        id: "5",
        place_name: "테스트카페",
        y: 37.5665,
        x: 126.978,
        place_url: "https://place.map.kakao.com/5",
        address_name: "주소대체",
      },
    ];
    kakaoSearch.searchPlacesByKeyword.mockResolvedValueOnce(mockResults);
    render(<PlaceRecommendation {...defaultProps} />);
    fireEvent.change(
      screen.getByPlaceholderText("예: 커플 데이트, 조용한 카페 등"),
      { target: { value: "테스트" } }
    );
    fireEvent.keyDown(
      screen.getByPlaceholderText("예: 커플 데이트, 조용한 카페 등"),
      { key: "Enter" }
    );
    await waitFor(() => {
      expect(screen.getByText("테스트카페")).toBeInTheDocument();
    });
  });

  it("displayMarkers - 마커 클릭 이벤트로 forEach 분기 직접 트리거", () => {
    createMapDiv();
    const setSelectedIdx = jest.fn();
    const setCenter = jest.fn();
    const open = jest.fn();
    const close = jest.fn();
    const marker = { setMap: jest.fn() };
    const infowindow = { open, close };
    const markersRef = { current: [{ marker, infowindow }] };
    let eventCallback; // 콜백 보관

    window.kakao = {
      maps: {
        Marker: function () {
          return marker;
        },
        LatLng: function () {},
        InfoWindow: function () {
          return infowindow;
        },
        event: {
          addListener: jest.fn((marker, event, cb) => {
            eventCallback = cb;
          }),
        },
      },
    };

    displayMarkers(
      [{ id: "unique", place_name: "카페", y: 1, x: 2 }],
      { current: { setCenter } },
      markersRef,
      setSelectedIdx
    );

    // 실제 마커 클릭 이벤트를 강제로 트리거!
    if (eventCallback) eventCallback();

    // 이제 forEach 분기, close 호출이 무조건 실행됨!
    expect(close).toHaveBeenCalled();
  });

  it("setMapCenterIfOk - status === OK 분기 커버", () => {
    window.kakao = {
      maps: {
        services: { Status: { OK: "OK" } },
        LatLng: function (y, x) {
          return { y, x };
        },
      },
    };
    const mapRef = { current: { setCenter: jest.fn() } };
    const setIsMapCentered = jest.fn();
    setMapCenterIfOk("OK", [{ y: 1, x: 2 }], mapRef, setIsMapCentered);
    expect(mapRef.current.setCenter).toHaveBeenCalled();
    expect(setIsMapCentered).toHaveBeenCalledWith(true);
  });
  it("setMapCenterIfOk - status !== OK 분기 커버", () => {
    window.kakao = {
      maps: {
        services: { Status: { OK: "OK" } },
        LatLng: function (y, x) {
          return { y, x };
        },
      },
    };
    const mapRef = { current: { setCenter: jest.fn() } };
    const setIsMapCentered = jest.fn();
    setMapCenterIfOk("FAIL", [{ y: 1, x: 2 }], mapRef, setIsMapCentered);
    expect(mapRef.current.setCenter).not.toHaveBeenCalled();
    expect(setIsMapCentered).not.toHaveBeenCalled();
  });

  it("handleInputKeyDownExport - 엔터일 때 handleInputSearch 호출", () => {
    const handleInputSearch = jest.fn();
    handleInputKeyDownExport({ key: "Enter" }, handleInputSearch);
    expect(handleInputSearch).toHaveBeenCalled();
  });

  it("handleInputKeyDownExport - 엔터 아닐 때 handleInputSearch 미호출(else 분기)", () => {
    const handleInputSearch = jest.fn();
    handleInputKeyDownExport({ key: "Tab" }, handleInputSearch);
    expect(handleInputSearch).not.toHaveBeenCalled();
  });

  it("center가 없을 때 else 분기 커버", () => {
    // map div 생성
    const mapDiv = document.createElement("div");
    mapDiv.id = "map";
    document.body.appendChild(mapDiv);

    // window.kakao 및 maps, Map 등 mock 세팅
    window.kakao = {
      maps: {
        Map: jest.fn(() => ({
          getCenter: jest.fn(() => undefined), // center가 undefined 반환
          setCenter: jest.fn(),
        })),
        services: {
          Places: function () {
            return { keywordSearch: jest.fn() };
          },
          Status: { OK: "OK" },
          SortBy: { DISTANCE: "DISTANCE" },
          Geocoder: function () {
            return { addressSearch: jest.fn() };
          },
        },
        LatLng: function (y, x) {
          return { y, x };
        },
      },
    };

    // 나머지 props는 정상 실행되는 값
    render(
      <PlaceRecommendation
        isKakaoLoaded={true}
        tags={["#커플 데이트"]}
        isMapCentered={true}
      />
    );

    // 정리
    mapDiv.remove();
  });
});
