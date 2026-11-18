const { test, expect } = require('@playwright/test');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { User, MenuItem, Station, Setting, Order } = require('../models');

const testMongoUri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/smart_canteen_test';
const email = 'ci-student@nie.ac.in';
const password = 'test-password-123';
let menuItem;

test.beforeAll(async () => {
  const databaseName = new URL(testMongoUri).pathname.replace(/^\//, '');
  if (databaseName !== 'smart_canteen_test') {
    throw new Error(`Refusing to clear database "${databaseName}". Tests only use smart_canteen_test.`);
  }

  await mongoose.connect(testMongoUri);
  await mongoose.connection.dropDatabase();

  await User.create({
    name: 'CI Test Student',
    email,
    usn: '4NI21CS001',
    emailVerified: true,
    passwordHash: await bcrypt.hash(password, 4),
    role: 'student'
  });

  menuItem = await MenuItem.create({
    name: 'Test Veg Burger',
    price: 60,
    category: 'Meals',
    slots: ['morning', 'afternoon', 'evening'],
    prepTimeMins: 5,
    stationType: 'general',
    available: true
  });

  await Station.create({ name: 'Test Kitchen', type: 'general', availableAt: new Date(0) });
  await Setting.create({
    _id: 'menuTimings',
    value: { morning: '00:00', afternoon: '00:01', evening: '00:02', closing: '23:59' }
  });
});

test.afterAll(async () => {
  await mongoose.disconnect();
});

test('rejects an order with a quantity above the allowed limit', async ({ request }) => {
  const loginResponse = await request.post('/api/auth/student/login', {
    data: { identifier: email, password }
  });
  expect(loginResponse.status()).toBe(200);
  const { token } = await loginResponse.json();

  const response = await request.post('/api/orders', {
    headers: { Authorization: `Bearer ${token}` },
    data: { items: [{ id: String(menuItem._id), qty: 11 }] }
  });

  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({
    message: 'One of the items is unavailable or has a bad quantity.'
  });
});

test('logs in, places an order, and reads the saved order back', async ({ request }) => {
  const loginResponse = await request.post('/api/auth/student/login', {
    data: { identifier: email, password }
  });
  expect(loginResponse.status()).toBe(200);
  const { token } = await loginResponse.json();

  const orderResponse = await request.post('/api/orders', {
    headers: { Authorization: `Bearer ${token}` },
    data: { items: [{ id: String(menuItem._id), qty: 2 }] }
  });

  expect(orderResponse.status()).toBe(201);
  const createdOrder = await orderResponse.json();
  expect(createdOrder.orderId).toMatch(/^CAN\d+$/);
  expect(createdOrder.total).toBe(120);
  expect(createdOrder.status).toMatch(/^(placed|queued)$/);
  expect(createdOrder.items).toHaveLength(1);
  expect(createdOrder.items[0]).toMatchObject({ name: 'Test Veg Burger', price: 60, qty: 2 });

  const savedOrder = await Order.findById(createdOrder._id).lean();
  expect(savedOrder).not.toBeNull();

  const mineResponse = await request.get('/api/orders/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(mineResponse.status()).toBe(200);
  expect((await mineResponse.json()).map((order) => order.orderId)).toContain(createdOrder.orderId);
});
