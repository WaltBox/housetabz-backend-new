# Elastic Beanstalk Performance Analysis & Optimization Guide

## 🚨 Current Performance Issue
- **Dashboard Summary**: Local 89ms vs Production **7.6 seconds** (85x slower!)
- **Production API**: https://api.housetabz.com/api
- **Local API**: http://localhost:3004/api

## 🔍 Root Cause Analysis

### 1. **Database Connection Pooling** (Most Likely Culprit)
**Problem**: EB apps often don't configure connection pooling properly, causing:
- New connections created for each request
- Connection timeouts and delays
- Database connection limits being hit

**Current Configuration**:
```javascript
// src/config/database.js - No connection pooling configured
const sequelize = new Sequelize(envConfig.url, {
  dialect: envConfig.dialect,
  dialectOptions: envConfig.dialectOptions || {},
  logging: envConfig.logging || false,
});
```

**Solution**: Add connection pooling configuration

### 2. **Instance Type & Resources**
**Problem**: Small EB instances can become CPU/Memory bottlenecks
- t2.micro/t2.small instances are insufficient for production
- Node.js memory limits not optimized
- Single-threaded Node.js on small instances

**Recommended Instance Types**:
- **Minimum**: t3.small (2 vCPU, 2 GB RAM)
- **Recommended**: t3.medium (2 vCPU, 4 GB RAM)
- **High Traffic**: t3.large (2 vCPU, 8 GB RAM)

### 3. **Auto-Scaling Configuration**
**Problem**: Default EB auto-scaling might be too aggressive
- Scales down to 1 instance during low traffic
- Cold starts when traffic increases
- Health check delays

**Recommended Settings**:
- **Min instances**: 2 (for redundancy)
- **Max instances**: 5-10 (based on traffic)
- **Scaling triggers**: CPU > 70% or Response Time > 2s

### 4. **Network Latency (EB ↔ RDS)**
**Problem**: EB instance and RDS in different AZs
- Network latency between EB and RDS
- SSL handshake overhead
- Geographic separation

**Solution**: 
- Ensure EB and RDS are in same AZ
- Use RDS Proxy for connection pooling
- Consider read replicas for read-heavy operations

### 5. **Application Load Balancer Issues**
**Problem**: Default ALB configuration can add latency
- Health check intervals too frequent
- Sticky sessions not optimized
- Target group settings suboptimal

### 6. **Node.js Memory Management**
**Problem**: Default Node.js memory limits
- Garbage collection pauses
- Memory leaks causing slowdowns
- Insufficient heap size

**Solution**: Add memory optimization flags

### 7. **Environment Variables & Configuration**
**Problem**: Suboptimal production configuration
- Logging enabled in production
- No request timeout configuration
- Missing performance optimizations

## 🛠️ Immediate Performance Fixes

### 1. **Database Connection Pooling** (CRITICAL)
Add to `src/config/database.js`:

```javascript
const sequelize = new Sequelize(envConfig.url, {
  dialect: envConfig.dialect,
  dialectOptions: envConfig.dialectOptions || {},
  logging: envConfig.logging || false,
  pool: {
    max: 20,          // Maximum connections
    min: 5,           // Minimum connections
    acquire: 30000,   // 30 seconds to get connection
    idle: 10000,      // 10 seconds before releasing
    evict: 5000,      // Check for idle connections every 5s
  },
  retry: {
    max: 3,           // Retry failed connections
  },
});
```

### 2. **EB Configuration Files**
Create `.ebextensions/01-performance.config`:

```yaml
option_settings:
  # Instance configuration
  aws:autoscaling:launchconfiguration:
    InstanceType: t3.medium
    
  # Auto-scaling configuration
  aws:autoscaling:asg:
    MinSize: 2
    MaxSize: 10
    
  # Application configuration
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    NODE_OPTIONS: '--max-old-space-size=1024'
    
  # Health check configuration
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
    HealthCheckSuccessThreshold: Ok
    
  # Load balancer configuration
  aws:elbv2:loadbalancer:
    IdleTimeout: 300
    
  # Target group configuration
  aws:elbv2:listener:443:
    DefaultProcess: default
    
  aws:elbv2:targetgroup:default:
    HealthCheckInterval: 30
    HealthCheckPath: /api/health
    HealthCheckTimeout: 5
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 3
```

### 3. **Add Health Check Endpoint**
Create `src/routes/healthRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
```

### 4. **Optimize Production Configuration**
Update `src/config/config.js`:

```javascript
production: {
  url: process.env.DATABASE_URL,
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false, // Disable logging in production
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
    evict: 5000,
  },
  query: {
    timeout: 30000, // 30 second query timeout
  },
},
```

### 5. **Add Request Timeout Middleware**
Create `src/middleware/timeout.js`:

```javascript
module.exports = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    }, timeoutMs);
    
    res.on('finish', () => clearTimeout(timeout));
    next();
  };
};
```

## 📊 Performance Monitoring & Testing

### 1. **Real-time Performance Monitoring**
```bash
# Add to package.json scripts
"monitor": "NODE_ENV=production node src/scripts/performance-monitor.js"
```

### 2. **Database Query Monitoring**
Enable query logging temporarily:
```javascript
// In production config for debugging
logging: (sql, timing) => {
  if (timing > 1000) { // Log slow queries
    console.log(`SLOW QUERY (${timing}ms): ${sql}`);
  }
}
```

### 3. **Memory & CPU Monitoring**
```javascript
// Add to app.js
setInterval(() => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  console.log('Memory:', Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB');
}, 30000);
```

## 🚀 Advanced Optimizations

### 1. **RDS Proxy Implementation**
- Set up RDS Proxy for connection pooling
- Reduces connection overhead
- Improves failover handling

### 2. **Redis Caching Layer**
```javascript
// Add Redis for caching
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Cache dashboard data
const cachedData = await redis.get(`dashboard:${userId}`);
if (cachedData) {
  return JSON.parse(cachedData);
}
```

### 3. **CDN for Static Assets**
- Use CloudFront for static assets
- Reduce server load
- Improve global performance

### 4. **Database Optimization**
- Add read replicas for read-heavy operations
- Implement query result caching
- Optimize database indexes (already done)

## 🔧 Deployment Commands

```bash
# Deploy with new configuration
eb deploy --staged

# Check current instance type
eb status

# View logs
eb logs --all

# SSH into instance for debugging
eb ssh
```

## 📋 Performance Checklist

- [ ] Add database connection pooling
- [ ] Create EB performance configuration
- [ ] Add health check endpoint
- [ ] Upgrade to t3.medium instance
- [ ] Set min instances to 2
- [ ] Add request timeout middleware
- [ ] Enable performance monitoring
- [ ] Test with production load
- [ ] Monitor database query performance
- [ ] Consider RDS Proxy implementation

## 🎯 Expected Results

With these optimizations, you should see:
- **Dashboard response time**: 7.6s → **under 500ms**
- **Improved reliability**: Fewer timeouts and errors
- **Better scaling**: Handles traffic spikes smoothly
- **Lower costs**: More efficient resource usage

## 🚨 Immediate Actions Required

1. **Add connection pooling** (can be deployed immediately)
2. **Upgrade instance type** to t3.medium
3. **Set minimum instances** to 2
4. **Add performance monitoring**
5. **Test with production load**

This should resolve the 85x performance difference you're experiencing! 