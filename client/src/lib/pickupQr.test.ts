import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPickupQrUrl,
  formatPickupReferenceCode,
  parsePickupQrPayload,
} from "./pickupQr.ts";

const SAMPLE_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

describe("pickupQr", () => {
  it("builds direct admin URLs for claims and returns", () => {
    assert.equal(
      buildPickupQrUrl("https://foundit.wmsu.edu.ph/", "claim", SAMPLE_ID),
      `https://foundit.wmsu.edu.ph/admin/claims/${SAMPLE_ID}`,
    );
    assert.equal(
      buildPickupQrUrl("http://localhost:5173", "return", SAMPLE_ID),
      `http://localhost:5173/admin/returns/${SAMPLE_ID}`,
    );
  });

  it("formats an 8-character uppercase reference code that matches UUID prefix", () => {
    const code = formatPickupReferenceCode(SAMPLE_ID);
    assert.equal(code, "F47AC10B");
    assert.equal(SAMPLE_ID.toLowerCase().includes(code.toLowerCase()), true);
  });

  it("parses valid same-origin full URLs and relative admin paths", () => {
    assert.deepEqual(
      parsePickupQrPayload(
        `http://localhost:5173/admin/claims/${SAMPLE_ID}`,
        "http://localhost:5173",
      ),
      {
        kind: "claim",
        requestId: SAMPLE_ID,
        targetPath: `/admin/claims/${SAMPLE_ID}`,
      },
    );
    assert.deepEqual(
      parsePickupQrPayload(`/admin/returns/${SAMPLE_ID}?source=qr`),
      {
        kind: "return",
        requestId: SAMPLE_ID,
        targetPath: `/admin/returns/${SAMPLE_ID}`,
      },
    );
  });

  it("rejects cross-origin URLs, non-UUID IDs, and unrelated paths", () => {
    assert.equal(
      parsePickupQrPayload(
        `https://evil.example.com/admin/claims/${SAMPLE_ID}`,
        "http://localhost:5173",
      ),
      null,
    );
    assert.equal(
      parsePickupQrPayload(
        "http://localhost:5173/admin/claims/not-a-uuid",
        "http://localhost:5173",
      ),
      null,
    );
    assert.equal(
      parsePickupQrPayload(
        `http://localhost:5173/dashboard/items/${SAMPLE_ID}`,
        "http://localhost:5173",
      ),
      null,
    );
    assert.equal(parsePickupQrPayload("javascript:alert(1)"), null);
    assert.equal(parsePickupQrPayload(""), null);
  });
});
