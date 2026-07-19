import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const heicToMock = vi.fn();

vi.mock("heic-to/csp", () => ({
  heicTo: heicToMock,
}));

const createImageBitmapMock = vi.fn();

import {
  HEIC_CONVERT_TIMEOUT_MS,
  IMAGE_UPLOAD_ACCEPT,
  isAcceptableImageFile,
  isHeicFile,
  prepareImageForUpload,
} from "@/lib/image-upload-client";

describe("isHeicFile", () => {
  it("detects HEIC by extension", () => {
    const file = new File([new Uint8Array([1])], "IMG_1234.HEIC", { type: "" });
    expect(isHeicFile(file)).toBe(true);
  });

  it("detects HEIF by MIME type", () => {
    const file = new File([new Uint8Array([1])], "photo", { type: "image/heif" });
    expect(isHeicFile(file)).toBe(true);
  });

  it("does not flag JPEG", () => {
    const file = new File([new Uint8Array([1])], "photo.jpg", { type: "image/jpeg" });
    expect(isHeicFile(file)).toBe(false);
  });
});

describe("isAcceptableImageFile", () => {
  it("accepts HEIC iPhone captures with empty MIME", () => {
    const file = new File([new Uint8Array([1])], "IMG_5678.heic", { type: "" });
    expect(isAcceptableImageFile(file)).toBe(true);
  });

  it("accepts standard images", () => {
    const file = new File([new Uint8Array([1])], "photo.png", { type: "image/png" });
    expect(isAcceptableImageFile(file)).toBe(true);
  });

  it("rejects non-images", () => {
    const file = new File([new Uint8Array([1])], "doc.pdf", { type: "application/pdf" });
    expect(isAcceptableImageFile(file)).toBe(false);
  });
});

describe("prepareImageForUpload", () => {
  beforeEach(() => {
    heicToMock.mockReset();
    createImageBitmapMock.mockReset();
    vi.stubGlobal("createImageBitmap", createImageBitmapMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("passes through non-HEIC files unchanged", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
    const result = await prepareImageForUpload(file);
    expect(result).toBe(file);
    expect(heicToMock).not.toHaveBeenCalled();
    expect(createImageBitmapMock).not.toHaveBeenCalled();
  });

  it("converts HEIC to JPEG via heic-to when native decode fails", async () => {
    const heic = new File([new Uint8Array([1])], "IMG_0001.heic", { type: "image/heic" });
    const jpegBlob = new Blob([new Uint8Array([9, 9, 9])], { type: "image/jpeg" });
    createImageBitmapMock.mockRejectedValue(new Error("unsupported"));
    heicToMock.mockResolvedValue(jpegBlob);

    const result = await prepareImageForUpload(heic);
    expect(heicToMock).toHaveBeenCalledWith({
      blob: heic,
      type: "image/jpeg",
      quality: 0.9,
    });
    expect(result.name).toBe("IMG_0001.jpg");
    expect(result.type).toBe("image/jpeg");
  });

  it("rejects empty conversion output with a friendly error", async () => {
    const heic = new File([new Uint8Array([1])], "IMG_0001.heic", { type: "image/heic" });
    createImageBitmapMock.mockRejectedValue(new Error("unsupported"));
    heicToMock.mockResolvedValue(new Blob([], { type: "image/jpeg" }));

    await expect(prepareImageForUpload(heic)).rejects.toThrow(
      "Couldn't convert this iPhone photo",
    );
  });

  it("rejects on conversion timeout", async () => {
    vi.useFakeTimers();
    const heic = new File([new Uint8Array([1])], "IMG_0001.heic", { type: "image/heic" });
    createImageBitmapMock.mockRejectedValue(new Error("unsupported"));
    heicToMock.mockImplementation(() => new Promise(() => {}));

    const promise = prepareImageForUpload(heic);
    const assertion = expect(promise).rejects.toThrow("Couldn't convert this iPhone photo");
    await vi.advanceTimersByTimeAsync(HEIC_CONVERT_TIMEOUT_MS);
    await assertion;
  });
});

describe("IMAGE_UPLOAD_ACCEPT", () => {
  it("includes HEIC extensions for file picker", () => {
    expect(IMAGE_UPLOAD_ACCEPT).toContain(".heic");
    expect(IMAGE_UPLOAD_ACCEPT).toContain("image/heic");
  });
});
