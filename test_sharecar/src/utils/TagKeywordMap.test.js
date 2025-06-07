import "@testing-library/jest-dom";
import tagToKeywordMap from "./tagKeywordMap";

describe("tagToKeywordMap", () => {
  it("특정 태그에 대한 키워드 배열을 반환한다", () => {
    expect(tagToKeywordMap["#가족과 함께"]).toContain("키즈카페");
    expect(tagToKeywordMap["#커플 데이트"]).toEqual(
      expect.arrayContaining(["데이트 명소", "야경 명소"])
    );
  });

  it("존재하지 않는 태그는 undefined를 반환한다", () => {
    expect(tagToKeywordMap["#없는태그"]).toBeUndefined();
  });
});
