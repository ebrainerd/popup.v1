import { describe, expect, it } from "vitest";
import {
  WIZARD_STEPS,
  canNavigateToStep,
  defaultWizardDraft,
  getStepValidation,
  inferCompletedSteps,
  markStepComplete,
  wizardDraftToSavePayload,
  wizardHasDraftContent,
} from "@/lib/shop-wizard";

describe("shop wizard", () => {
  it("orders banner and live stream before layout selection", () => {
    expect(WIZARD_STEPS.map((s) => s.id)).toEqual([
      "details",
      "products",
      "live",
      "layout",
      "schedule",
    ]);
  });

  it("requires a shop name on the details step", () => {
    const draft = defaultWizardDraft();
    expect(getStepValidation("details", draft).valid).toBe(false);
    expect(
      getStepValidation("details", { ...draft, name: "Summer drop" }).valid,
    ).toBe(true);
  });

  it("blocks jumping ahead until earlier steps are completed", () => {
    const draft = defaultWizardDraft();
    expect(canNavigateToStep(0, draft)).toBe(true);
    expect(canNavigateToStep(1, draft)).toBe(false);

    const withDetails = markStepComplete(
      { ...draft, name: "Summer drop" },
      "details",
    );
    expect(canNavigateToStep(1, withDetails)).toBe(true);
    expect(canNavigateToStep(2, withDetails)).toBe(false);
  });

  it("does not infer layout, live, or schedule from default draft values", () => {
    const completed = inferCompletedSteps({
      ...defaultWizardDraft(),
      name: "Summer drop",
      products: [
        {
          clientId: "p1",
          title: "Sticker",
          description: "",
          price: "5.00",
          quantity: "1",
          photo_urls: [],
          shippingRate: "0.00",
          auctionFields: {
            saleType: "buy_now",
            startingBid: "",
            minIncrement: "1.00",
            durationSeconds: 60,
            allowPrebids: true,
            suddenDeath: false,
          },
        },
      ],
    });
    expect(completed).toEqual(["details", "products"]);
  });

  it("filters untitled products from save payloads", () => {
    const payload = wizardDraftToSavePayload({
      ...defaultWizardDraft(),
      name: "Summer drop",
      products: [
        {
          clientId: "p1",
          title: "Sticker",
          description: "",
          price: "5.00",
          quantity: "1",
          shippingRate: "0.00",
          photo_urls: [],
          auctionFields: {
            saleType: "buy_now",
            startingBid: "",
            minIncrement: "1.00",
            durationSeconds: 60,
            allowPrebids: true,
            suddenDeath: false,
          },
        },
        {
          clientId: "p2",
          title: "",
          description: "",
          price: "",
          quantity: "1",
          shippingRate: "0.00",
          photo_urls: [],
          auctionFields: {
            saleType: "buy_now",
            startingBid: "",
            minIncrement: "1.00",
            durationSeconds: 60,
            allowPrebids: true,
            suddenDeath: false,
          },
        },
      ],
      completedSteps: ["details"],
    });

    expect(payload.products).toHaveLength(1);
    expect(payload.products[0]?.title).toBe("Sticker");
    expect(payload.completedSteps).toEqual(["details"]);
  });

  it("detects when a wizard has draftable content", () => {
    expect(wizardHasDraftContent(defaultWizardDraft())).toBe(false);
    expect(
      wizardHasDraftContent({ ...defaultWizardDraft(), name: "My drop" }),
    ).toBe(true);
  });
});
