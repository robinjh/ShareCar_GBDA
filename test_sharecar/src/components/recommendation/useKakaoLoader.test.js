import "@testing-library/jest-dom";
import { renderHook } from "@testing-library/react";
import useKakaoLoader from "./useKakaoLoader";

describe("useKakaoLoader else 분기", () => {
  let script;

  beforeEach(() => {
    // 각 테스트가 직접 script 조작할 수 있게 초기화만
    script = null;
    delete window.kakao;
  });

  afterEach(() => {
    // script가 실제로 있을 때만 제거
    const exist = document.getElementById("kakao-map-script");
    if (exist && exist.parentNode) {
      exist.parentNode.removeChild(exist);
    }
    delete window.kakao;
  });

  it("이미 script 있고, window.kakao나 window.kakao.maps 없으면 callback 호출 안됨", () => {
    // script 미리 추가
    script = document.createElement("script");
    script.id = "kakao-map-script";
    document.body.appendChild(script);

    // window.kakao 없음
    const callback = jest.fn();
    renderHook(() => useKakaoLoader(callback));
    expect(callback).not.toHaveBeenCalled();

    // window.kakao는 있으나 maps가 없음
    window.kakao = {};
    const callback2 = jest.fn();
    renderHook(() => useKakaoLoader(callback2));
    expect(callback2).not.toHaveBeenCalled();
  });

  it("이미 script 있고, window.kakao와 window.kakao.maps 있으면 callback 호출", () => {
    // script 미리 추가
    script = document.createElement("script");
    script.id = "kakao-map-script";
    document.body.appendChild(script);

    window.kakao = { maps: { load: jest.fn() } };
    const callback = jest.fn();
    renderHook(() => useKakaoLoader(callback));
    expect(callback).toHaveBeenCalled();
  });

  it("스크립트가 없으면 스크립트 추가 및 onload에서 window.kakao.maps.load 호출", () => {
    // script 미리 제거(없는 상태)
    const exist = document.getElementById("kakao-map-script");
    if (exist && exist.parentNode) {
      exist.parentNode.removeChild(exist);
    }
    window.kakao = { maps: { load: jest.fn() } };
    const callback = jest.fn();

    renderHook(() => useKakaoLoader(callback));

    // 새 script가 head에 추가됐는지 확인
    const createdScript = document.getElementById("kakao-map-script");
    expect(createdScript).toBeTruthy();

    // onload 실행 시 window.kakao.maps.load가 callback을 인자로 호출
    createdScript.onload();
    expect(window.kakao.maps.load).toHaveBeenCalledWith(callback);
  });
});