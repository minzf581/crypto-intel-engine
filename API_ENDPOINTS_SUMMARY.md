# 🚀 Crypto Intelligence Engine - Complete API Endpoints List

## 📋 Overview

Below is a comprehensive list of all available API endpoints in the system, organized by category:

## 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Function | Auth |
|------|------|------|------|
| POST | `/register` | User registration | ❌ |
| POST | `/login` | User login | ❌ |

## 👤 User Management (`/api/users`)

| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/me` | Get current user information | ✅ |
| PUT | `/assets` | Update user selected assets | ✅ |

## 💰 Asset Management (`/api/assets`)

| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/` | Get all cryptocurrency assets | ❌ |
| GET | `/:id` | Get single asset details | ❌ |

## 📊 Dashboard Data (`/api/dashboard`)

| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/data` | Get dashboard data (prices, price changes) | ❌ |
| POST | `/trigger-price-check` | Manually trigger price check (testing) | ❌ |

## 🎯 Signal Analysis (`/api/signals`)

| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/` | Get signal list | ❌ |
| GET | `/:id` | Get single signal details | ❌ |

## 📈 Advanced Analysis (`/api/analysis`)

| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/data-sources/status` | Get data source status | ✅ |
| GET | `/comprehensive/:symbol` | Get comprehensive analysis for specific asset | ✅ |
| POST | `/test-signals` | Generate test signals (development mode) | ✅ |

## 🔔 Notification Management (`/api/notifications`)

| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/` | Get user notification list | ✅ |
| GET | `/unread-count` | Get unread notification count | ✅ |
| PUT | `/:id/read` | Mark notification as read | ✅ |
| PUT | `/mark-all-read` | Mark all notifications as read | ✅ |
| GET | `/settings` | Get notification settings | ✅ |
| POST | `/settings` | Update notification settings | ✅ |
| DELETE | `/settings/:id` | Delete notification setting | ✅ |

## 🚀 Enhanced Notification Features (`/api/notifications-enhanced`)

### 📈 Volume Analysis
| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/volume/:symbol` | Get volume analysis for specific asset | ✅ |
| GET | `/volume-unusual` | Get assets with unusual volume | ✅ |
| POST | `/volume/analyze` | Manually trigger volume analysis | ✅ |

### 📰 News Analysis
| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/news` | Get news analysis data | ✅ |
| GET | `/news/sentiment-trends` | Get sentiment trend analysis | ✅ |
| GET | `/news/portfolio-impact` | Get portfolio news impact | ✅ |
| POST | `/news/analyze` | Manually trigger news analysis | ✅ |

### 📋 Notification History and Management
| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/history` | Get notification history | ✅ |
| GET | `/grouped` | Get grouped notifications | ✅ |
| PUT | `/settings` | Update enhanced notification settings | ✅ |
| POST | `/fcm-token` | Register FCM push token | ✅ |
| POST | `/test` | Create test notification | ✅ |

## 🔧 Enhanced Data Features (`/api/enhanced`)

### 💹 Multi-Source Data Analysis
| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/data/enhanced-prices` | Get enhanced price data with volume analysis | ✅ |
| GET | `/data/volume-analysis` | Get volume analysis | ✅ |

### 📰 News and Narrative Analysis
| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/news/latest` | Get latest crypto news (with sentiment analysis) | ✅ |
| GET | `/news/signals` | Get news-based trading signals | ✅ |
| GET | `/news/narratives` | Get market narrative analysis | ✅ |

### 🔔 Enhanced Notifications
| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/notifications/groups` | Get notification groups | ✅ |
| GET | `/notifications/history` | Get notification history (with filters) | ✅ |

### 📊 Analytics and Statistics
| Method | Endpoint | Function | Auth |
|------|------|------|------|
| GET | `/analytics/signals` | Get signal statistics analysis | ✅ |

## 📱 Frontend Integration Needed

### 🎯 Currently Missing Dashboard Features:

1. **Volume Analysis Panel**
   - Real-time volume monitoring
   - Unusual volume detection
   - Volume trend charts

2. **News Analysis Panel**
   - Latest cryptocurrency news
   - Sentiment analysis results
   - News impact on portfolio

3. **Data Source Status Monitoring**
   - Online status of each data source
   - Data update timestamps
   - Service health checks

4. **Enhanced Notification Center**
   - Grouped notification display
   - Notification history viewing
   - Quick action buttons

5. **Comprehensive Analysis View**
   - Detailed asset analysis
   - Signal statistics
   - Performance metrics

6. **Advanced Settings Panel**
   - Notification preferences
   - Push notification configuration
   - Data source configuration

## 🎨 Suggested Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│                   Dashboard Header                   │
│  [Data Source Status] [Last Update] [Manual Refresh] │
├─────────────────────────────────────────────────────┤
│                 Real-time Price Cards                │
│  [BTC] [ETH] [SOL] [ADA] ... (prices, price changes) │
├─────────────────────────────────────────────────────┤
│  Volume Analysis   │  News Analysis   │ Notification  │
│  ├Unusual Volume   │  ├Latest News    │ Center        │
│  ├Volume Trends    │  ├Sentiment      │ ├Unread       │
│  └Detection Results│  └Impact Assess  │ ├History      │
│                    │                  │ └Quick Actions│
├─────────────────────────────────────────────────────┤
│                 Signal Analysis Area                 │
│  [Latest Signals] [Signal Filter] [Statistics] [Performance] │
├─────────────────────────────────────────────────────┤
│                Advanced Features Panel               │
│  [Comprehensive Analysis] [Custom Alerts] [Data Export] [Settings] │
└─────────────────────────────────────────────────────┘
```

## 🔄 Next Action Items

1. Create volume analysis component
2. Create news analysis component  
3. Create data source status component
4. Create enhanced notification center component
5. Integrate all components into dashboard page
6. Add real-time data update functionality
7. Test all feature integrations 