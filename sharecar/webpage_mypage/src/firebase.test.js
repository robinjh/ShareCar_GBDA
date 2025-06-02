import "@testing-library/jest-dom";
import { auth, db } from "./firebase";

describe("firebase.js", () => {
  it("should export auth and db objects", () => {
    expect(auth).toBeDefined();
    expect(db).toBeDefined();
  });
});