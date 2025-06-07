import "@testing-library/jest-dom";
import { searchPlacesByKeyword } from "./kakaoSearch";

global.fetch = jest.fn();

describe("searchPlacesByKeyword", () => {
  afterEach(() => jest.clearAllMocks());

  it("정상 검색 결과를 반환한다", async () => {
    const mockDocuments = [{ id: "1", place_name: "카페" }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ documents: mockDocuments }),
    });
    const result = await searchPlacesByKeyword("카페");
    expect(fetch).toHaveBeenCalled();
    expect(result).toEqual(mockDocuments);
  });

  it("API 오류시 예외를 던진다", async () => {
    fetch.mockResolvedValueOnce({ ok: false });
    await expect(searchPlacesByKeyword("카페")).rejects.toThrow("검색 실패");
  });
});