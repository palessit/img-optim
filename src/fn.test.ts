import { createNewKey } from "./fn"

test("create key 'f_webp-w_500-h_300/pict.webp'", () => {
  expect(
    createNewKey({
      format: "webp",
      width: 500,
      height: 300,
      key: "pict.webp",
      quality: null,
    })
  ).toBe("f_webp-w_500-h_300/pict.webp")
})
test("create key 'f_webp-h_300/pict.webp'", () => {
  expect(
    createNewKey({
      format: "webp",
      width: null,
      height: 300,
      key: "pict.webp",
      quality: null,
    })
  ).toBe("f_webp-h_300/pict.webp")
})
test("create key 'f_webp-w_500-h_300/some-folder/pict.webp'", () => {
  expect(
    createNewKey({
      format: "webp",
      width: 500,
      height: 300,
      key: "some-folder/pict.webp",
      quality: null,
    })
  ).toBe("f_webp-w_500-h_300/some-folder/pict.webp")
})
test("create key 'f_webp-w_500-h_300/pict.webp'", () => {
  expect(
    createNewKey({
      format: "webp",
      width: 500,
      height: 300,
      key: "pict.webp",
      quality: 90,
    })
  ).toBe("f_webp-w_500-h_300-q_90/pict.webp")
})
