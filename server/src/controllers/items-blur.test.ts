import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { pool } from '../config/db';
import { createItem, deleteItem, findItemById, listItems } from '../repositories/item.repository';

describe('Secure Item Image Blurring & Role-Based Delivery', () => {
  let categoryId: string;
  let testUserId: string;
  let foundItemId: string;
  let lostItemId: string;

  const CLEAR_FOUND_URL = 'https://lh3.googleusercontent.com/d/ORIGINAL_CLEAR_FOUND_PHOTO';
  const BLURRED_FOUND_URL = 'https://lh3.googleusercontent.com/d/BLURRED_FOUND_PHOTO';
  const LOST_PHOTO_URL = 'https://lh3.googleusercontent.com/d/ORIGINAL_LOST_PHOTO';

  before(async () => {
    // Get an existing active category and user for the tests
    const catRes = await pool.query<{ id: string }>('SELECT id FROM category WHERE is_active = TRUE LIMIT 1');
    assert.ok(catRes.rows[0], 'A category should exist in the database');
    categoryId = catRes.rows[0].id;

    const userRes = await pool.query<{ id: string }>('SELECT id FROM "user" LIMIT 1');
    assert.ok(userRes.rows[0], 'A user should exist in the database');
    testUserId = userRes.rows[0].id;

    // Create a found item with both clear and blurred image URLs
    const createdFound = await createItem({
      reporterId: testUserId,
      reportType: 'found',
      name: 'Found Test Gold Watch',
      description: 'Found a gold wristwatch with initials engraved on back.',
      itemDate: '2026-10-20',
      categoryId,
      images: [CLEAR_FOUND_URL],
      blurredImages: [BLURRED_FOUND_URL],
    });
    foundItemId = createdFound.id;

    // Create a lost item with an image
    const createdLost = await createItem({
      reporterId: testUserId,
      reportType: 'lost',
      name: 'Lost Test Blue Backpack',
      description: 'Lost my blue backpack near library.',
      itemDate: '2026-10-20',
      categoryId,
      images: [LOST_PHOTO_URL],
    });
    lostItemId = createdLost.id;
  });

  after(async () => {
    if (foundItemId) await deleteItem(foundItemId);
    if (lostItemId) await deleteItem(lostItemId);
  });

  it('serves genuinely blurred image to school users and public guests for found items', async () => {
    // isAdmin = false (School user or public guest)
    const item = await findItemById(foundItemId, false, 'guest-or-school-user');
    assert.ok(item, 'Found item should be returned');
    assert.equal(item.image, BLURRED_FOUND_URL, 'image should be the blurred variant for non-admins');
    assert.deepEqual(item.images, [BLURRED_FOUND_URL], 'images list should only contain blurred variant');

    // Crucial security invariant: the clear URL must NOT be disclosed anywhere in the item payload
    const serialized = JSON.stringify(item);
    assert.ok(!serialized.includes(CLEAR_FOUND_URL), 'Original unblurred image URL must NEVER be disclosed to non-admins');
  });

  it('serves original, unblurred image to admins for found items', async () => {
    // isAdmin = true (Admin or super_admin)
    const item = await findItemById(foundItemId, true, 'admin-user-id');
    assert.ok(item, 'Found item should be returned');
    assert.equal(item.image, CLEAR_FOUND_URL, 'image should be the original clear photo for admins');
    assert.deepEqual(item.images, [CLEAR_FOUND_URL], 'images list should contain original clear photo for admins');
  });

  it('serves unblurred image to all users for lost items', async () => {
    // School user / guest view
    const guestItem = await findItemById(lostItemId, false, 'guest-user');
    assert.ok(guestItem, 'Lost item should be returned');
    assert.equal(guestItem.image, LOST_PHOTO_URL, 'Lost items should not be blurred for non-admins');

    // Admin view
    const adminItem = await findItemById(lostItemId, true, 'admin-user');
    assert.ok(adminItem, 'Lost item should be returned');
    assert.equal(adminItem.image, LOST_PHOTO_URL, 'Lost items should not be blurred for admins');
  });

  it('applies image blurring consistently in listItems for feeds and searches', async () => {
    // Non-admin query
    const guestItems = await listItems({ search: 'Found Test Gold Watch' }, false, 'guest-user');
    const guestFound = guestItems.find((i) => i.id === foundItemId);
    assert.ok(guestFound, 'Item should appear in list');
    assert.equal(guestFound.image, BLURRED_FOUND_URL);
    assert.ok(!JSON.stringify(guestFound).includes(CLEAR_FOUND_URL));

    // Admin query
    const adminItems = await listItems({ search: 'Found Test Gold Watch' }, true, 'admin-user');
    const adminFound = adminItems.find((i) => i.id === foundItemId);
    assert.ok(adminFound, 'Item should appear in list');
    assert.equal(adminFound.image, CLEAR_FOUND_URL);
  });
});
