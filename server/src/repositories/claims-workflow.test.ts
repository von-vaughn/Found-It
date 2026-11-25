import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { pool } from "../config/db";
import { migrate } from "../db/migrate";
import {
  createItem,
  findItemById,
  findItemOwner,
  listItems,
  sendFinderReminder,
  updateOsaReceipt,
} from "./item.repository";
import { listNotificationsForUser } from "./notification.repository";
import {
  AnotherClaimAlreadyApprovedError,
  createClaim,
  createReturnRequest,
  findClaimableItem,
  findClaimById,
  updateClaimStatusById,
  updateReturnOsaReceipt,
  updateReturnStatusById,
} from "./request.repository";
import { createUser } from "./user.repository";
import { hashPassword } from "../utils/password";

describe("Claim Finder Alert & Deferred Competing-Claim Rejection Workflow", () => {
  const RUN = Date.now();
  const createdUserIds: string[] = [];
  const createdItemIds: string[] = [];

  let categoryId = "";
  let adminId = "";
  let finderId = "";
  let claimantAId = "";
  let claimantBId = "";

  before(async () => {
    await migrate();
    const { rows: catRows } = await pool.query<{ id: string }>(
      `SELECT id FROM category WHERE is_active = TRUE LIMIT 1`,
    );
    assert.ok(catRows[0], "Expected at least one active category in DB");
    categoryId = catRows[0].id;

    const passwordHash = await hashPassword("TestPassword123!");
    const admin = await createUser({
      firstName: "Workflow",
      lastName: "Admin",
      email: `wf.admin.${RUN}@wmsu.edu.ph`,
      passwordHash,
      role: "admin",
      isVerified: true,
    });
    const finder = await createUser({
      firstName: "Workflow",
      lastName: "Finder",
      email: `wf.finder.${RUN}@wmsu.edu.ph`,
      passwordHash,
      role: "school_user",
      isVerified: true,
    });
    const claimantA = await createUser({
      firstName: "Workflow",
      lastName: "ClaimantA",
      email: `wf.claima.${RUN}@wmsu.edu.ph`,
      passwordHash,
      role: "school_user",
      isVerified: true,
    });
    const claimantB = await createUser({
      firstName: "Workflow",
      lastName: "ClaimantB",
      email: `wf.claimb.${RUN}@wmsu.edu.ph`,
      passwordHash,
      role: "school_user",
      isVerified: true,
    });

    adminId = admin.id;
    finderId = finder.id;
    claimantAId = claimantA.id;
    claimantBId = claimantB.id;
    createdUserIds.push(adminId, finderId, claimantAId, claimantBId);
  });

  after(async () => {
    if (createdItemIds.length > 0) {
      await pool.query(
        `DELETE FROM report WHERE id IN (SELECT report_id FROM item WHERE id = ANY($1::uuid[]))`,
        [createdItemIds],
      );
    }
    if (createdUserIds.length > 0) {
      await pool.query(`DELETE FROM notification WHERE user_id = ANY($1::uuid[])`, [
        createdUserIds,
      ]);
      await pool.query(`DELETE FROM "user" WHERE id = ANY($1::uuid[])`, [
        createdUserIds,
      ]);
    }
    await pool.end();
  });

  it("notifies the finder on claim submission only when received_by_osa is false", async () => {
    const unreceivedItem = await createItem({
      reporterId: finderId,
      reportType: "found",
      name: `Unreceived Wallet ${RUN}`,
      description: "Found a wallet near the library stairs.",
      itemDate: "2026-11-20",
      itemTime: "10:00",
      categoryId,
      color: "Black",
      location: "Library stairs",
      importantDetails: "Small sticker inside.",
    });
    createdItemIds.push(unreceivedItem.id);

    const claim1 = await createClaim({
      userId: claimantAId,
      itemId: unreceivedItem.id,
      claimantTitle: "My Black Wallet",
      color: "Black",
      dateLost: "2026-11-20",
      timeLost: "09:30",
      location: "Library stairs",
      details: "Dropped my black wallet near the library.",
      importantDetails: "Has a small sticker inside.",
    });
    assert.ok(claim1);

    const finderNotifsAfterUnreceived = await listNotificationsForUser(finderId);
    const surrenderNotif = finderNotifsAfterUnreceived.find(
      (n) =>
        n.itemId === unreceivedItem.id &&
        n.kind === "claim" &&
        n.event === "submitted",
    );
    assert.ok(
      surrenderNotif,
      "Expected finder to receive surrender notification when received_by_osa is false",
    );
    assert.equal(surrenderNotif.title, "Someone claimed your found item");

    // Now test an item already marked received_by_osa = true
    const receivedItem = await createItem({
      reporterId: finderId,
      reportType: "found",
      name: `Received Tumbler ${RUN}`,
      description: "Found a navy tumbler at the gym bleachers.",
      itemDate: "2026-11-20",
      itemTime: "11:00",
      categoryId,
      color: "Navy",
      location: "Gym bleachers",
      importantDetails: "Dent on lid.",
    });
    createdItemIds.push(receivedItem.id);
    await updateOsaReceipt(receivedItem.id, true, adminId);

    const claim2 = await createClaim({
      userId: claimantAId,
      itemId: receivedItem.id,
      claimantTitle: "My Navy Tumbler",
      color: "Navy",
      dateLost: "2026-11-20",
      timeLost: "10:30",
      location: "Gym bleachers",
      details: "Left my navy tumbler on the bleachers.",
      importantDetails: "Has a dent on the lid.",
    });
    assert.ok(claim2);

    const finderNotifsAfterReceived = await listNotificationsForUser(finderId);
    const unexpectedNotif = finderNotifsAfterReceived.find(
      (n) =>
        n.itemId === receivedItem.id &&
        n.kind === "claim" &&
        n.event === "submitted",
    );
    assert.equal(
      unexpectedNotif,
      undefined,
      "Finder should not receive a surrender alert when item is already received by OSA",
    );
  });

  it("keeps competing claims pending on Approved, blocks double approval, recovers on Reject, and auto-rejects on Claimed", async () => {
    const item = await createItem({
      reporterId: finderId,
      reportType: "found",
      name: `Competing Claims Bag ${RUN}`,
      description: "Gray backpack found at CCS hallway.",
      itemDate: "2026-11-20",
      itemTime: "13:00",
      categoryId,
      color: "Gray",
      location: "CCS hallway",
      importantDetails: "Keychain on front zipper.",
    });
    createdItemIds.push(item.id);
    await updateOsaReceipt(item.id, true, adminId);

    const claimA = await createClaim({
      userId: claimantAId,
      itemId: item.id,
      claimantTitle: "Gray Backpack A",
      color: "Gray",
      dateLost: "2026-11-20",
      timeLost: "12:00",
      location: "CCS hallway",
      details: "Left my gray backpack in the hallway.",
      importantDetails: "Keychain on front zipper.",
    });
    const claimB = await createClaim({
      userId: claimantBId,
      itemId: item.id,
      claimantTitle: "Gray Backpack B",
      color: "Gray",
      dateLost: "2026-11-20",
      timeLost: "12:15",
      location: "CCS hallway",
      details: "Misplaced my gray backpack near CCS.",
      importantDetails: "Silver keychain on front pocket.",
    });
    assert.ok(claimA && claimB);

    // 1. Approve Claim A with pickup instructions -> Claim B must remain Pending, and the Found post must stay visible & claimable
    const approvedA = await updateClaimStatusById(
      claimA.id,
      "approved",
      undefined,
      "Bring your school ID to OSA Window 2 before 5 PM.",
    );
    assert.equal(approvedA?.status, "approved");
    assert.equal(
      approvedA?.approvalInstructions,
      "Bring your school ID to OSA Window 2 before 5 PM.",
    );
    const claimantANotifsOnApprove = await listNotificationsForUser(claimantAId);
    const approvedNotif = claimantANotifsOnApprove.find(
      (n) => n.requestId === claimA.id && n.event === "approved",
    );
    assert.ok(
      approvedNotif?.message.includes(
        "Bring your school ID to OSA Window 2 before 5 PM.",
      ),
      "Approval notification should include OSA pickup instructions",
    );

    const publicFeedWhileApproved = await listItems({}, false, claimantBId);
    const visibleItemWhileApproved = publicFeedWhileApproved.find(
      (entry) => entry.id === item.id,
    );
    assert.ok(
      visibleItemWhileApproved,
      "Found item must remain visible in public/user feed while a claim is only approved",
    );
    assert.equal(visibleItemWhileApproved.isClaimed, false);

    const claimableWhileApproved = await findClaimableItem(item.id);
    assert.ok(
      claimableWhileApproved,
      "Other users must still be able to submit a claim while an approved claim is pending pickup",
    );

    const claimBAfterApproveA = await findClaimById(claimB.id);
    assert.equal(
      claimBAfterApproveA?.status,
      "pending",
      "Competing claim B must stay pending when claim A is only approved",
    );

    // 2. Attempting to approve Claim B while Claim A is still approved must fail
    await assert.rejects(
      () => updateClaimStatusById(claimB.id, "approved"),
      AnotherClaimAlreadyApprovedError,
    );

    // 3. Reject Approved Claim A (no-show / failed in-person check) -> Claim B can now be approved
    const rejectedA = await updateClaimStatusById(
      claimA.id,
      "rejected",
      "Claimant failed in-person verification.",
    );
    assert.equal(rejectedA?.status, "rejected");

    const approvedB = await updateClaimStatusById(claimB.id, "approved");
    assert.equal(approvedB?.status, "approved");

    // Create a third pending claim C (from claimantA, allowed since claimA is rejected and count=1 < 2)
    const claimC = await createClaim({
      userId: claimantAId,
      itemId: item.id,
      claimantTitle: "Gray Backpack A retry",
      color: "Gray",
      dateLost: "2026-11-20",
      timeLost: "12:05",
      location: "CCS hallway",
      details: "Submitting updated proof for my gray backpack.",
      importantDetails: "Sticker inside laptop sleeve.",
    });
    assert.ok(claimC);

    // 4. Mark Claim B as Claimed -> remaining Pending Claim C is auto-rejected & notified,
    // and the Found post is now hidden from public/user feeds with isClaimed = true
    const claimedB = await updateClaimStatusById(claimB.id, "claimed");
    assert.equal(claimedB?.status, "claimed");

    const publicFeedAfterClaimed = await listItems({}, false, claimantAId);
    assert.equal(
      publicFeedAfterClaimed.some((entry) => entry.id === item.id),
      false,
      "Found item must be hidden from public/user feed once marked claimed",
    );
    const claimedItemDetail = await findItemById(item.id, false, claimantAId);
    assert.equal(claimedItemDetail?.isClaimed, true);
    assert.equal(await findClaimableItem(item.id), null);

    const claimCAfterClaimed = await findClaimById(claimC.id);
    assert.equal(claimCAfterClaimed?.status, "rejected");
    assert.equal(
      claimCAfterClaimed?.rejectionReason,
      "This item has already been claimed by its verified owner.",
    );

    const claimantANotifs = await listNotificationsForUser(claimantAId);
    const autoRejectNotif = claimantANotifs.find(
      (n) => n.requestId === claimC.id && n.event === "rejected",
    );
    assert.ok(
      autoRejectNotif,
      "Expected auto-rejected claimant to receive a rejection notification on Claimed",
    );
  });

  it("enforces 3-hour cooldown on manual OSA finder reminders and tracks pending-request ownership lock", async () => {
    const item = await createItem({
      reporterId: finderId,
      reportType: "found",
      name: `Remind Finder Calculator ${RUN}`,
      description: "Scientific calculator found at Engineering lobby.",
      itemDate: "2026-11-20",
      itemTime: "08:30",
      categoryId,
      color: "Black",
      location: "Engineering lobby",
      importantDetails: "Name sticker removed.",
    });
    createdItemIds.push(item.id);

    const ownerBeforeClaim = await findItemOwner(item.id);
    assert.equal(ownerBeforeClaim?.hasPendingRequest, false);

    const claim = await createClaim({
      userId: claimantAId,
      itemId: item.id,
      claimantTitle: "My Casio Calculator",
      color: "Black",
      dateLost: "2026-11-20",
      timeLost: "08:00",
      location: "Engineering lobby",
      details: "Left my scientific calculator on the lobby bench.",
      importantDetails: "Battery cover has tape.",
    });
    assert.ok(claim);

    const ownerWithPending = await findItemOwner(item.id);
    assert.equal(ownerWithPending?.hasPendingRequest, true);

    const firstReminder = await sendFinderReminder(item.id);
    assert.equal(firstReminder.status, "sent");

    const secondReminder = await sendFinderReminder(item.id);
    assert.equal(secondReminder.status, "cooldown");

    const finderNotifs = await listNotificationsForUser(finderId);
    const manualReminder = finderNotifs.find(
      (n) =>
        n.itemId === item.id &&
        n.title === "Reminder: surrender found item to OSA",
    );
    assert.ok(manualReminder, "Finder should receive the manual OSA reminder");
  });

  it("aligns Return lifecycle with Claims: keeps Lost post & competing returns active on Approved, enforces exclusivity, and auto-rejects on Returned", async () => {
    const lostItem = await createItem({
      reporterId: finderId,
      reportType: "lost",
      name: `Lost Watch ${RUN}`,
      description: "Silver wristwatch lost near the cafeteria.",
      itemDate: "2026-11-20",
      itemTime: "09:00",
      categoryId,
      color: "Silver",
      location: "Cafeteria",
      importantDetails: "Engraved initials on clasp.",
    });
    createdItemIds.push(lostItem.id);

    const retA = await createReturnRequest({
      userId: claimantAId,
      itemId: lostItem.id,
      claimantTitle: "Silver Watch A",
      color: "Silver",
      dateLost: "2026-11-20",
      timeLost: "10:00",
      location: "Cafeteria",
      details: "Found a silver wristwatch by the counter.",
      importantDetails: "Engraved initials on clasp.",
    });
    const retB = await createReturnRequest({
      userId: claimantBId,
      itemId: lostItem.id,
      claimantTitle: "Silver Watch B",
      color: "Silver",
      dateLost: "2026-11-20",
      timeLost: "10:30",
      location: "Cafeteria",
      details: "Picked up a silver watch near table 4.",
      importantDetails: "Metal strap.",
    });
    assert.ok(retA && retB);

    await updateReturnOsaReceipt(retA.id, true);
    await updateReturnOsaReceipt(retB.id, true);

    const approvedA = await updateReturnStatusById(retA.id, "approved");
    assert.equal(approvedA?.status, "approved");

    // Lost post stays visible & returnable while Return A is only Approved, and Return B stays Pending
    const feedWhileApproved = await listItems({}, false, claimantBId);
    assert.ok(feedWhileApproved.some((entry) => entry.id === lostItem.id));
    assert.ok(await findClaimableItem(lostItem.id));
    assert.equal((await findClaimById(retB.id))?.status, "pending");

    // Double approval must fail
    await assert.rejects(
      () => updateReturnStatusById(retB.id, "approved"),
      AnotherClaimAlreadyApprovedError,
    );

    // Reject Return A -> auto-published as a found item and Return B can be approved
    const rejectedA = await updateReturnStatusById(retA.id, "rejected");
    assert.equal(rejectedA?.status, "rejected");
    assert.ok(rejectedA?.publishedItemId);
    createdItemIds.push(rejectedA.publishedItemId);

    const approvedB = await updateReturnStatusById(retB.id, "approved");
    assert.equal(approvedB?.status, "approved");

    // Mark Return B as Returned -> Lost post is hidden
    const returnedB = await updateReturnStatusById(retB.id, "returned");
    assert.equal(returnedB?.status, "returned");

    assert.equal((await findClaimById(retA.id))?.status, "rejected");
    const feedAfterReturned = await listItems({}, false, claimantAId);
    assert.equal(
      feedAfterReturned.some((entry) => entry.id === lostItem.id),
      false,
    );
    assert.equal(await findClaimableItem(lostItem.id), null);
  });
});
