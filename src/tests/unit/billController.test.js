// src/tests/unit/billController.test.js
const billController = require('../../controllers/billController');
const billService = require('../../services/billService');
const { House, User, HouseService, Bill, Charge, Notification } = require('../../models');

// Mock billService for some tests
jest.mock('../../services/billService');

describe('Bill Controller Tests', () => {
  let testHouse;
  let testUsers = [];
  let testService;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(async () => {
    // Create test data
    testHouse = await House.create({
      name: `Test House ${Date.now()}`,
      address_line: '123 Test St',
      city: 'Test City',
      state: 'TX',
      zip_code: '12345',
      balance: 0,
      hsi: 0,
      ledger: 0
    });

    // Create test users
    for (let i = 0; i < 2; i++) {
      const user = await User.create({
        username: `test_user_${Date.now()}_${i}`,
        email: `test${Date.now()}_${i}@test.com`,
        password: 'testPassword123',
        houseId: testHouse.id,
        balance: 0,
        points: 0,
        credit: 0
      });
      testUsers.push(user);
    }

    // Create a service
    testService = await HouseService.create({
      name: 'Test Internet',
      status: 'active',
      type: 'fixed_recurring',
      houseId: testHouse.id,
      amount: 100,
      designatedUserId: testUsers[0].id
    });

    // Setup mock request and response
    mockReq = {
      params: { houseId: testHouse.id },
      body: {},
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  afterEach(async () => {
    try {
      // Clean up test data
      await Notification.destroy({ where: {} });
      await Charge.destroy({ where: {} });
      await Bill.destroy({ where: {} });
      
      if (testService?.id) {
        await HouseService.destroy({ where: { id: testService.id } });
      }
      
      for (const user of testUsers) {
        if (user?.id) {
          await User.destroy({ where: { id: user.id } });
        }
      }
      
      if (testHouse?.id) {
        await House.destroy({ where: { id: testHouse.id } });
      }
    } catch (error) {
      console.error('Error in test cleanup:', error);
    }
    
    // Reset test variables
    testHouse = null;
    testUsers = [];
    testService = null;
    
    jest.clearAllMocks();
  });

  test('should create a bill and distribute charges', async () => {
    mockReq.body = {
      houseServiceId: testService.id,
      amount: 100,
      billType: 'regular',
      dueDate: new Date(Date.now() + 86400000 * 14) // Due in 14 days
    };

    await billController.createBill(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Bill, charges, and notifications created successfully',
        bill: expect.any(Object),
        charges: expect.any(Array)
      })
    );

    // Verify bill was created in DB
    const bills = await Bill.findAll({
      where: { houseId: testHouse.id }
    });
    expect(bills.length).toBe(1);
    expect(Number(bills[0].amount)).toBe(100);
    expect(bills[0].billType).toBe('regular');

    // Verify charges were created
    const charges = await Charge.findAll({
      where: { billId: bills[0].id }
    });
    expect(charges.length).toBe(2); // One per user
    expect(Number(charges[0].amount)).toBe(50); // 100 / 2 = 50

    // Verify user balances were updated
    const updatedUsers = await Promise.all(
      testUsers.map(user => User.findByPk(user.id))
    );
    expect(parseFloat(updatedUsers[0].balance)).toBe(50);
    expect(parseFloat(updatedUsers[1].balance)).toBe(50);
  });

  test('should get bills for a house', async () => {
    // Create a test bill
    const bill = await Bill.create({
      houseId: testHouse.id,
      amount: 100,
      houseService_id: testService.id,
      name: 'Test Bill',
      status: 'pending',
      billType: 'regular'
    });

    // Create charges for the bill
    await Promise.all(testUsers.map(user => 
      Charge.create({
        userId: user.id,
        billId: bill.id,
        amount: 50,
        status: 'unpaid',
        name: 'Test Bill'
      })
    ));

    await billController.getBillsForHouse(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: bill.id,
          name: 'Test Bill',
          amount: expect.any(String), // Decimal is returned as string
          status: 'pending'
        })
      ])
    );
  });

  test('should generate fixed bills', async () => {
    // Mock billService.generateFixedRecurringBills
    billService.generateFixedRecurringBills.mockResolvedValueOnce({
      processedCount: 1,
      successCount: 1,
      failureCount: 0,
      results: [
        {
          serviceId: testService.id,
          serviceName: 'Test Internet',
          billId: 1,
          amount: 100,
          success: true
        }
      ]
    });

    await billController.generateFixedBills(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        processedCount: 1,
        successCount: 1,
        failureCount: 0
      })
    );
  });

  test('should submit variable bill amount', async () => {
    // Create a variable service
    const variableService = await HouseService.create({
      name: 'Test Electricity',
      status: 'active',
      type: 'variable_recurring',
      houseId: testHouse.id,
      designatedUserId: testUsers[0].id
    });

    mockReq.params = { serviceId: variableService.id };
    mockReq.body = {
      amount: 75,
      userId: testUsers[0].id
    };

    await billController.submitVariableBillAmount(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Variable bill created successfully',
        bill: expect.any(Object),
        charges: expect.any(Array)
      })
    );

    // Verify bill was created
    const bills = await Bill.findAll({
      where: { 
        houseService_id: variableService.id,
        billType: 'variable_recurring'
      }
    });
    expect(bills.length).toBe(1);
    expect(Number(bills[0].amount)).toBe(75);

    // Verify charges were created
    const charges = await Charge.findAll({
      where: { billId: bills[0].id }
    });
    expect(charges.length).toBe(2); // One per user
    expect(Number(charges[0].amount)).toBe(37.5); // 75 / 2 = 37.5

    // Clean up
    await variableService.destroy();
  });
});