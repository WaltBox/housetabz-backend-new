# HouseTabz Backend Performance Improvements

## Overview
This guide outlines the performance optimizations implemented to address slow frontend loading times and improve overall API responsiveness.

## Key Issues Addressed

### 1. Database Performance
- **N+1 Query Problems**: Complex nested includes causing multiple DB round trips
- **Missing Indexes**: Added indexes on frequently queried fields
- **Over-fetching**: Loading unnecessary data in API responses
- **No Pagination**: All endpoints now support pagination

### 2. API Response Optimization
- **New Dashboard Service**: Single endpoint replacing multiple API calls
- **Response Caching**: In-memory caching for frequently accessed data
- **Compression**: Automatic gzip compression for large responses
- **Field Selection**: Clients can specify which fields they need

## New Optimized Endpoints

### 1. Dashboard API - `/api/dashboard`
**Single endpoint that replaces multiple calls:**

```javascript
// Old way - Multiple API calls:
GET /api/users/{id}
GET /api/houses/{id}/bills
GET /api/charges?userId={id}
GET /api/notifications?userId={id}
GET /api/houses/{id}

// New way - Single optimized call:
GET /api/dashboard
```

**Response includes everything the frontend needs:**
```json
{
  "user": { "finance": {...}, "totalOwed": 150.00 },
  "house": { "hsi": 75, "balance": 1200.00 },
  "charges": { "pending": [...], "totalOwed": 150.00 },
  "bills": { "recent": [...], "pendingCount": 3 },
  "services": { "active": [...] },
  "notifications": { "unread": [...] },
  "summary": { "houseHealth": "good" }
}
```

### 2. Optimized Bills API - `/api/houses/{id}/bills`
**Now supports pagination and filtering:**

```javascript
// With pagination and filtering:
GET /api/houses/123/bills?page=1&limit=20&status=pending&sortBy=dueDate

// Response includes pagination metadata:
{
  "bills": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "hasNext": true
  }
}
```

### 3. Financial Summary API - `/api/dashboard/financial-summary`
**Lightweight endpoint for quick financial data:**

```json
{
  "finance": { "balance": 50.00, "points": 125 },
  "pending": { "totalOwed": 75.00, "nextDueDate": "2024-03-15" }
}
```

## Database Improvements

### 1. New Indexes Added
Run the migration to add performance indexes:

```bash
npm run migrate:up -- --to=20250601000000-add-performance-indexes.js
```

**Indexes added:**
- `Bills`: (houseId, status), (houseId, createdAt), (status, dueDate)
- `Charges`: (userId, status), (billId, status), (status, dueDate) 
- `HouseServices`: (houseId, status), (designatedUserId, status)
- `Notifications`: (userId, isRead), (userId, createdAt)
- And more...

### 2. Query Optimization
**Before (N+1 queries):**
```javascript
// This caused multiple DB queries
const bills = await Bill.findAll({
  include: [
    { model: Charge, include: [{ model: User }] }
  ]
});
```

**After (Optimized):**
```javascript
// Separate efficient queries
const bills = await Bill.findAll({ attributes: [...] });
const charges = await Charge.findAll({ 
  where: { billId: billIds },
  group: ['billId', 'userId', 'status']
});
```

## Caching Implementation

### 1. In-Memory Caching
Automatic caching for frequently accessed endpoints:

```javascript
// Cache is automatically applied to:
- Dashboard data (60 seconds)
- Bills list (30 seconds) 
- House services (2 minutes)
- User finance (30 seconds)
```

### 2. Cache Headers
Responses include cache information:
```http
X-Cache: HIT  // or MISS
Cache-Control: private, max-age=60
ETag: "dashboard-123-1234567890"
```

### 3. Cache Invalidation
Cache is automatically cleared when data changes:

```javascript
// Manual invalidation (if needed)
const { invalidateCache } = require('./middleware/cache');
invalidateCache(`dashboard-${userId}-${houseId}`);
```

## Response Optimization

### 1. Field Selection
Clients can specify which fields they need:

```javascript
// Only get specific fields:
GET /api/houses/123/bills?fields=id,name,amount,status

// Nested fields:
GET /api/houses/123/bills?fields=id,name,houseServiceModel.name
```

### 2. Compression
Automatic gzip compression for responses > 1KB:

```http
Content-Encoding: gzip
Content-Type: application/json
```

### 3. Response Timing
Monitor API performance with timing headers:

```http
X-Response-Time: 145ms
X-Memory-Delta: 2.5KB
```

## Migration Guide for Frontend

### 1. Replace Multiple API Calls
**Old frontend code:**
```javascript
// Multiple API calls on page load
const [user, bills, charges, house] = await Promise.all([
  api.get(`/users/${userId}`),
  api.get(`/houses/${houseId}/bills`),
  api.get(`/charges?userId=${userId}`),
  api.get(`/houses/${houseId}`)
]);
```

**New optimized code:**
```javascript
// Single API call
const dashboard = await api.get('/dashboard');
// All data is now in dashboard.data
```

### 2. Implement Pagination
**Add pagination to bill lists:**
```javascript
const [bills, setBills] = useState([]);
const [pagination, setPagination] = useState({});

const loadBills = async (page = 1) => {
  const response = await api.get(`/houses/${houseId}/bills?page=${page}&limit=20`);
  setBills(response.bills);
  setPagination(response.pagination);
};
```

### 3. Use Field Selection
**Only request fields you need:**
```javascript
// For a bill summary view, only get essential fields:
const response = await api.get(`/houses/${houseId}/bills?fields=id,name,amount,status,dueDate`);
```

## Performance Monitoring

### 1. Response Time Headers
Monitor API performance:
```javascript
// Check response headers
response.headers['x-response-time']; // "145ms"
response.headers['x-cache']; // "HIT" or "MISS"
```

### 2. Slow Query Logging
Slow requests (>1 second) are automatically logged:
```
Slow request: GET /api/houses/123/bills - 1205.50ms, Memory: 5.2MB
```

### 3. Cache Statistics
Monitor cache performance:
```javascript
const { cache } = require('./middleware/cache');
console.log(cache.getStats()); // { size: 45, maxSize: 1000 }
```

## Expected Performance Improvements

### Before Optimization:
- Dashboard load: 5-8 API calls, 2-5 seconds
- Bills page: Complex includes, 1-3 seconds  
- N+1 queries on user lists
- No caching, full data transfer

### After Optimization:
- Dashboard load: 1 API call, 200-500ms
- Bills page: Paginated, 100-300ms
- Optimized queries with indexes
- 60-90% cache hit rate expected
- 50-70% reduction in data transfer

## Next Steps

### 1. Add Redis (Optional)
For production scaling, replace in-memory cache with Redis:

```bash
npm install redis
```

### 2. Database Query Monitoring
Add query logging to identify remaining slow queries:

```javascript
// In database.js
const sequelize = new Sequelize(envConfig.url, {
  logging: (sql, timing) => {
    if (timing > 100) { // Log slow queries
      console.warn(`Slow query (${timing}ms): ${sql}`);
    }
  },
  benchmark: true
});
```

### 3. Frontend Optimizations
- Implement response caching in frontend
- Use field selection strategically
- Add loading states for better UX
- Consider virtual scrolling for large lists

## Usage Examples

### Frontend Integration
```javascript
// Example React component using new dashboard API
const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
        setDashboardData(response.data);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <UserBalance finance={dashboardData.user.finance} />
      <HouseOverview house={dashboardData.house} />
      <PendingCharges charges={dashboardData.charges.pending} />
      <RecentBills bills={dashboardData.bills.recent} />
    </div>
  );
};
```

This optimization should significantly improve your frontend loading times while maintaining the robust functionality needed for your vision of revolutionizing shared expense management! 