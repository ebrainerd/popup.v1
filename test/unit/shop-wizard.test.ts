import { describe, expect, it } from "vitest";
import {
  WIZARD_STEPS,
  canNavigateToStep,
  defaultWizardDraft,
  duplicateWizardProduct,
  getStepValidation,
  inferCompletedSteps,
  markStepComplete,
  wizardDraftToSavePayload,
  wizardHasDraftContent,
  wizardProductToPayload,
} from "@/lib/shop-wizard";

describe("shop wizard", () => {
  it("orders banner and live stream before layout, then schedule last", () => {
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
            endsWithShop: false,
            allowPrebids: true,
            suddenDeath: false,
          },
        },
      ],
    });
    expect(completed).toEqual(["details", "products"]);
  });

  it("validates the schedule step only when a valid window is set", () => {
    const base = { ...defaultWizardDraft(), name: "Summer drop" };
    expect(getStepValidation("schedule", base).valid).toBe(false);

    const withSchedule = {
      ...base,
      scheduleSet: true,
      scheduleTimezone: "UTC",
      startLocal: "2099-06-01T18:00",
      endLocal: "2099-06-01T20:00",
    };
    expect(getStepValidation("schedule", withSchedule).valid).toBe(true);

    const backwards = { ...withSchedule, endLocal: "2099-06-01T17:00" };
    expect(getStepValidation("schedule", backwards).valid).toBe(false);
  });

  it("carries schedule into the finish payload when set", () => {
    const payload = wizardDraftToSavePayload({
      ...defaultWizardDraft(),
      name: "Summer drop",
      scheduleSet: true,
      scheduleTimezone: "America/Los_Angeles",
      startLocal: "2099-06-01T18:00",
      endLocal: "2099-06-01T20:00",
    });
    expect(payload.scheduleSet).toBe(true);
    expect(payload.scheduleTimezone).toBe("America/Los_Angeles");
    expect(payload.startAt).not.toBe("");
    expect(payload.endAt).not.toBe("");
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
            endsWithShop: false,
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
            endsWithShop: false,
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

  it("duplicates a wizard product with a new clientId and no dbId", () => {
    const source = {
      clientId: "orig-1",
      dbId: "db-uuid",
      title: "Blue tee",
      description: "Cotton, size M",
      price: "24.00",
      quantity: "5",
      shippingRate: "4.50",
      photo_urls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      auctionFields: {
        saleType: "auction" as const,
        startingBid: "10.00",
        minIncrement: "2.00",
        durationSeconds: 120,
        endsWithShop: false,
        allowPrebids: false,
        suddenDeath: true,
      },
    };
    const clone = duplicateWizardProduct(source);

    expect(clone.clientId).not.toBe(source.clientId);
    expect(clone.dbId).toBeUndefined();
    expect(clone.title).toBe("Blue tee (copy)");
    expect(clone.description).toBe(source.description);
    expect(clone.price).toBe(source.price);
    expect(clone.quantity).toBe(source.quantity);
    expect(clone.shippingRate).toBe(source.shippingRate);
    expect(clone.photo_urls).toEqual(source.photo_urls);
    expect(clone.photo_urls).not.toBe(source.photo_urls);
    expect(clone.auctionFields).toEqual(source.auctionFields);
    expect(wizardProductToPayload(clone).id).toBeUndefined();
  });

  it("accepts until-shop-closes auction length in product validation", () => {
    const draft = markStepComplete(
      {
        ...defaultWizardDraft(),
        name: "Summer drop",
        products: [
          {
            clientId: "p1",
            title: "Rare print",
            description: "",
            price: "50.00",
            quantity: "1",
            shippingRate: "0.00",
            photo_urls: [],
            auctionFields: {
              saleType: "auction" as const,
              startingBid: "50.00",
              minIncrement: "5.00",
              durationSeconds: 60,
              endsWithShop: true,
              allowPrebids: true,
              suddenDeath: false,
            },
          },
        ],
      },
      "details",
    );
    expect(getStepValidation("products", draft).valid).toBe(true);
    expect(wizardProductToPayload(draft.products[0]!)).toMatchObject({
      auction_duration_seconds: null,
      auction_ends_with_shop: true,
    });
  });
});
