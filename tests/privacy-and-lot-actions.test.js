import test from "node:test";
import assert from "node:assert/strict";
import { validateListingPrivacy } from "../src/lib/privacyRules.js";
import { updateLotDetails } from "../src/lib/lotActions.js";

test("validateListingPrivacy rejects phone numbers and emails in lot title", () => {
  const rejectedTitles = [
    { title: "Call 9876543210 for server racks", field: "title" },
    { title: "Surplus Laptops +91 98765 43210", field: "title" },
    { title: "Industrial Copper scrap 011-23456789", field: "title" },
    { title: "Circuit boards - email vendor@scrap.com", field: "title" }
  ];

  for (const item of rejectedTitles) {
    const res = validateListingPrivacy({ title: item.title, location: "Okhla Phase-2, New Delhi", notes: "Scrap" });
    assert.equal(res.ok, false, `Expected title "${item.title}" to be rejected`);
    assert.equal(res.field, item.field);
  }
});

test("validateListingPrivacy accepts legitimate industrial asset titles", () => {
  const allowedTitles = [
    "Telecom Server Racks - 42U",
    "Assorted Printed Circuit Boards (Grade A)",
    "Transformer Copper Winding 500kVA",
    "Lot 4, Phase-2 Surplus Inverters",
    "Used Industrial Lead-Acid Batteries (50 units)"
  ];

  for (const title of allowedTitles) {
    const res = validateListingPrivacy({
      title,
      location: "Plot 45, Sector 62, Noida",
      notes: "Commercial surplus"
    });
    assert.equal(res.ok, true, `Expected valid title "${title}" to be accepted`);
  }
});

test("validateListingPrivacy rejects phone numbers in location and notes", () => {
  const cases = [
    { location: "9876543210, Indirapuram", notes: "Call me" },
    { location: "Indirapuram, Ghaziabad", notes: "Call on 9812345678" },
    { location: "+91 98765 43210, Sector 18", notes: "" },
    { location: "Noida", notes: "Contact at +91-98765-43210" },
    { location: "Office: 011-23456789, Delhi", notes: "" }
  ];

  for (const c of cases) {
    const res = validateListingPrivacy(c);
    assert.equal(res.ok, false, `Expected ${JSON.stringify(c)} to be rejected as phone number`);
  }
});

test("validateListingPrivacy rejects email addresses in location and notes", () => {
  const check1 = validateListingPrivacy({ location: "test@domain.com, Noida", notes: "" });
  assert.equal(check1.ok, false);
  assert.equal(check1.field, "location");

  const check2 = validateListingPrivacy({ location: "Sector 62, Noida", notes: "Reach me at vendor@scrap.in" });
  assert.equal(check2.ok, false);
  assert.equal(check2.field, "notes");
});

test("validateListingPrivacy rejects exact residential addresses across multiple standard formats", () => {
  const residentialAddresses = [
    "Flat no 402, Tower B, Ghaziabad",
    "Flat #402, Lotus Boulevard",
    "Flat 402, Block C",
    "House 12, Street 3, Indirapuram",
    "House no 12, Street 3",
    "H.No 45, Sector 15, Faridabad",
    "H.No. 45, Sector 15",
    "H. No 45, Sector 15",
    "H. No. 45, Sector 15",
    "H No 45, Sector 15",
    "H-No 45, Sector 15",
    "Door #5, Anna Nagar, Chennai",
    "Door no 5, Anna Nagar",
    "Door 5, Anna Nagar",
    "Villa 8, Palm Meadows, Whitefield",
    "Room 101, Shanti Niwas, Mumbai",
    "Apt 302, Green Glen",
    "Apartment 14, Sunrise Towers",
    "Bungalow 7, Civil Lines"
  ];

  for (const addr of residentialAddresses) {
    const check = validateListingPrivacy({ location: addr, notes: "Scrap ready" });
    assert.equal(check.ok, false, `Expected residential address "${addr}" to be rejected`);
    assert.equal(check.field, "location");
  }
});

test("validateListingPrivacy accepts legitimate industrial plots and corridors", () => {
  const industrialAddresses = [
    "Plot 45, Sector 62, Noida 201301",
    "Plot No. 12, Phase-1, Peenya Industrial Area, Bengaluru 560058",
    "Okhla Industrial Area Phase-2, New Delhi 110020",
    "MIDC Bhosari, Pune",
    "Warehouse 4B, Sector 18, Gurugram",
    "Indirapuram, Ghaziabad",
    "Industrial Shed H-45, Phase 2, Okhla",
    "Block H, Sector 62, Noida"
  ];

  for (const addr of industrialAddresses) {
    const check = validateListingPrivacy({
      location: addr,
      notes: "Assorted circuit boards, servers, and power supply units."
    });
    assert.equal(check.ok, true, `Expected industrial address "${addr}" to be accepted`);
  }
});

test("updateLotDetails validates lot status eligibility", async () => {
  const ineligible = [
    "offer_submitted",
    "Offer submitted",
    "pickup_scheduled",
    "Pickup scheduled",
    "collected",
    "Collected",
    "recycling_review",
    "Recycling review",
    "recycled",
    "Recycled",
    "disputed",
    "Disputed"
  ];

  for (const status of ineligible) {
    await assert.rejects(
      () => updateLotDetails("lot-1", {
        title: "Circuit Boards",
        category: "Computers",
        weight: 100,
        location: "Okhla Industrial Area, New Delhi",
        currentStatus: status
      }),
      /Lots can only be edited while in open status/
    );
  }
});

test("updateLotDetails validates fields and privacy before attempting network requests", async () => {
  await assert.rejects(
    () => updateLotDetails("123", { title: "x", category: "Computers", weight: 10, location: "Delhi", currentStatus: "open" }),
    /Lot name must be between 2 and 100 characters/
  );

  await assert.rejects(
    () => updateLotDetails("123", { title: "Valid Title", category: "Computers", weight: 0, location: "Delhi", currentStatus: "open" }),
    /Enter a weight from 0.1 to 100,000 kg/
  );

  await assert.rejects(
    () => updateLotDetails("123", { title: "Valid Title", category: "Computers", weight: 10, location: "D", currentStatus: "open" }),
    /Pickup location must be between 2 and 160 characters/
  );

  await assert.rejects(
    () => updateLotDetails("123", { title: "Call 9876543210", category: "Computers", weight: 10, location: "Delhi", currentStatus: "open" }),
    /do not enter phone numbers in the lot title/
  );
});
