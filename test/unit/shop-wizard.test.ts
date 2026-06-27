import { describe, expect, it } from "vitest";
import {
  canNavigateToStep,
  defaultWizardDraft,
  getStepValidation,
  inferCompletedSteps,
  markStepComplete,
} from "@/lib/shop-wizard";

describe("shop wizard", () => {
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

  it("infers completed steps for prefilled drafts", () => {
    const draft = inferCompletedSteps({
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
    expect(draft).toContain("details");
    expect(draft).toContain("products");
  });
});
