import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

import { requestHash } from "./vision";
import type { VisionRequest } from "./types";

const base: VisionRequest = {
  cacheKey: "baseline:img_1819:W-01,W-02",
  imagePath: "/frames/img_1819.jpg",
  prompt: "classify these machines",
};

/** The hashing rule as it stood before `extraImagePaths` existed. */
function legacyHash(req: VisionRequest): string {
  const h = createHash("sha256");
  h.update(req.cacheKey);
  h.update("\0");
  h.update(req.prompt);
  h.update("\0");
  h.update(req.crop ? req.crop.join(",") : "full");
  return h.digest("hex").slice(0, 32);
}

test("requestHash is unchanged for requests without extra images (replay stays valid)", () => {
  assert.equal(requestHash(base), legacyHash(base));
  assert.equal(requestHash({ ...base, extraImagePaths: [] }), legacyHash(base));
  assert.equal(
    requestHash({ ...base, crop: [1, 2, 3, 4] }),
    legacyHash({ ...base, crop: [1, 2, 3, 4] }),
  );
});

test("requestHash changes once extra images are attached", () => {
  const withRefs = requestHash({ ...base, extraImagePaths: ["/annot.png"] });
  assert.notEqual(withRefs, legacyHash(base));
  // stable for the same refs, distinct for different refs
  assert.equal(withRefs, requestHash({ ...base, extraImagePaths: ["/annot.png"] }));
  assert.notEqual(withRefs, requestHash({ ...base, extraImagePaths: ["/annot.png", "/mask.png"] }));
});
