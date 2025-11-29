<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# FEEDPRISM - SPAYCE INTEGRATION GUIDE

**Complete Guide for Integrating FeedPrism into Spayce Flutter App**

***

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Backend API Setup](#backend-api-setup)
4. [Flutter Service Layer](#flutter-service-layer)
5. [UI Integration](#ui-integration)
6. [State Management](#state-management)
7. [Complete Code Examples](#complete-code-examples)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

***

## 1. Architecture Overview

### Integration Strategy

FeedPrism integrates into Spayce as a **specialized Email Source Provider** that demonstrates superior content extraction and organization.

```
┌───────────────────────────────────────────────────────────────┐
│                        SPAYCE APP                              │
│                  (Flutter Multi-Source Platform)               │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Source Aggregation Layer                 │    │
│  │                                                        │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │    │
│  │  │  Files  │  │  Apps   │  │  Web    │  │ Email  │ │    │
│  │  │ Source  │  │ Source  │  │ Source  │  │ (Feed  │ │    │
│  │  │         │  │         │  │         │  │ Prism) │ │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └────┬───┘ │    │
│  │                                                │      │    │
│  └────────────────────────────────────────────────┼──────┘    │
│                                                    │           │
│                   ┌────────────────────────────────┘           │
│                   │                                            │
│  ┌────────────────▼──────────────────────────────────────┐   │
│  │          FeedPrism Integration Module               │   │
│  │                                                        │   │
│  │  • API Service (HTTP Client)                          │   │
│  │  • Data Models (Events/Courses/Blogs/Actions)         │   │
│  │  • Widget Components (Feed Cards)                     │   │
│  │  • State Management (Provider/Riverpod)               │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Unified Content Feed UI                    │   │
│  │                                                        │   │
│  │  Shows all sources in single scrollable feed:          │   │
│  │  • Files from Google Drive                             │   │
│  │  • Apps from connected services                        │   │
│  │  • Web bookmarks                                       │   │
│  │  • Email (FeedPrism structured content) ✨             │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                   FEEDPRISM BACKEND                            │
│               (Docker Container / Cloud Hosted)                │
│                                                                │
│  • FastAPI REST API (Port 8000)                               │
│  • Qdrant Vector Database (Port 6333)                         │
│  • LLM Extraction Pipeline                                     │
│  • Hybrid Search Engine                                        │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```


### Key Integration Points

| Component | Purpose | Implementation |
| :-- | :-- | :-- |
| **API Service** | Communication with FeedPrism backend | `feedprism_service.dart` |
| **Data Models** | Strongly-typed Dart classes | `feedprism_models.dart` |
| **Widget Components** | UI cards for content types | `feedprism_widgets.dart` |
| **State Provider** | Reactive state management | `feedprism_provider.dart` |
| **Settings Integration** | User configuration | `spayce_settings.dart` |


***

## 2. Prerequisites

### System Requirements

```yaml
# Flutter SDK
flutter: ">=3.16.0"
dart: ">=3.2.0"

# Minimum Android/iOS versions
android:
  minSdkVersion: 24  # Android 7.0+
ios:
  platform: 13.0     # iOS 13.0+
```


### Dependencies

Add to `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP client
  http: ^1.1.0
  dio: ^5.4.0  # Alternative with better features
  
  # State management (choose one)
  provider: ^6.1.1
  # OR
  riverpod: ^2.4.9
  flutter_riverpod: ^2.4.9
  
  # JSON serialization
  json_annotation: ^4.8.1
  
  # Utilities
  intl: ^0.18.1  # Date formatting
  url_launcher: ^6.2.2  # Open links
  share_plus: ^7.2.1  # Share functionality
  flutter_markdown: ^0.6.18  # Markdown rendering

dev_dependencies:
  build_runner: ^2.4.6
  json_serializable: ^6.7.1
  mockito: ^5.4.4  # For testing
```

Install dependencies:

```bash
flutter pub get
flutter pub run build_runner build
```


### FeedPrism Backend Setup

Ensure FeedPrism is running and accessible:

```bash
# Local development
docker-compose up -d

# Verify health
curl http://localhost:8000/api/health

# Get URL for Flutter config
# Local: http://10.0.2.2:8000 (Android emulator)
# Local: http://localhost:8000 (iOS simulator)
# Production: https://your-feedprism-url.com
```


***

## 3. Backend API Setup

### API Configuration Class

**File: `lib/services/feedprism/config.dart`**

```dart
/// FeedPrism API Configuration
class FeedPrismConfig {
  // Base URLs for different environments
  static const String localAndroidEmulator = 'http://10.0.2.2:8000';
  static const String localIOSSimulator = 'http://localhost:8000';
  static const String localPhysicalDevice = 'http://192.168.1.x:8000'; // Replace with your IP
  static const String production = 'https://api.feedprism.your-domain.com';
  
  // Current environment
  static String get baseUrl {
    // Auto-detect or use environment variable
    const environment = String.fromEnvironment('FEEDPRISM_ENV', defaultValue: 'local');
    
    switch (environment) {
      case 'production':
        return production;
      case 'local':
      default:
        // Auto-detect platform for local development
        return _getLocalUrl();
    }
  }
  
  static String _getLocalUrl() {
    // This is a simplified version - in production, detect actual platform
    // For now, return Android emulator URL as default
    return localAndroidEmulator;
  }
  
  // API endpoints
  static const String healthEndpoint = '/api/health';
  static const String feedEndpoint = '/api/feed';
  static const String searchEndpoint = '/api/search';
  static const String upcomingEndpoint = '/api/search/upcoming';
  static const String actionsEndpoint = '/api/actionable-items';
  static const String ingestEndpoint = '/api/ingest';
  static const String statsEndpoint = '/api/stats';
  
  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
```


### Network Configuration

**File: `lib/services/feedprism/network_client.dart`**

```dart
import 'package:dio/dio.dart';
import 'config.dart';

/// Configured HTTP client for FeedPrism API
class FeedPrismNetworkClient {
  static Dio? _instance;
  
  static Dio get instance {
    _instance ??= _createDio();
    return _instance!;
  }
  
  static Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: FeedPrismConfig.baseUrl,
        connectTimeout: FeedPrismConfig.connectionTimeout,
        receiveTimeout: FeedPrismConfig.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );
    
    // Add interceptors for logging and error handling
    dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
        logPrint: (obj) => print('[FeedPrism API] $obj'),
      ),
    );
    
    // Add error handling interceptor
    dio.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) {
          print('[FeedPrism API Error] ${error.message}');
          if (error.response != null) {
            print('[FeedPrism API Error Response] ${error.response?.data}');
          }
          handler.next(error);
        },
      ),
    );
    
    return dio;
  }
  
  static void resetInstance() {
    _instance = null;
  }
}
```


***

## 4. Flutter Service Layer

### Complete API Service

**File: `lib/services/feedprism/feedprism_api_service.dart`**

```dart
import 'package:dio/dio.dart';
import 'network_client.dart';
import 'config.dart';
import '../../models/feedprism_models.dart';

/// FeedPrism API Service
/// 
/// Handles all communication with FeedPrism backend
class FeedPrismApiService {
  final Dio _dio = FeedPrismNetworkClient.instance;
  
  // =========================================================================
  // HEALTH CHECK
  // =========================================================================
  
  /// Check if FeedPrism backend is healthy
  Future<HealthStatus> checkHealth() async {
    try {
      final response = await _dio.get(FeedPrismConfig.healthEndpoint);
      return HealthStatus.fromJson(response.data);
    } on DioException catch (e) {
      throw FeedPrismException.fromDioError(e);
    }
  }
  
  // =========================================================================
  // FEED OPERATIONS
  // =========================================================================
  
  /// Get all feed items
  Future<List<FeedItem>> getFeed() async {
    try {
      final response = await _dio.get(FeedPrismConfig.feedEndpoint);
      final List<dynamic> data = response.data;
      return data.map((item) => FeedItem.fromJson(item)).toList();
    } on DioException catch (e) {
      throw FeedPrismException.fromDioError(e);
    }
  }
  
  // =========================================================================
  // SEARCH OPERATIONS
  // =========================================================================
  
  /// Search for content
  Future<SearchResult> search({
    required String query,
    List<String>? entityTypes,
    String? timeFilter,
    int limit = 10,
  }) async {
    try {
      final response = await _dio.post(
        FeedPrismConfig.searchEndpoint,
        data: {
          'query': query,
          if (entityTypes != null) 'entity_types': entityTypes,
          if (timeFilter != null) 'time_filter': timeFilter,
          'limit': limit,
        },
      );
      return SearchResult.fromJson(response.data);
    } on DioException catch (e) {
      throw FeedPrismException.fromDioError(e);
    }
  }
  
  /// Get upcoming events
  Future<List<FeedItem>> getUpcomingEvents({
    String query = '',
    int days = 30,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        FeedPrismConfig.upcomingEndpoint,
        queryParameters: {
          'query': query,
          'days': days,
          'limit': limit,
        },
      );
      final data = response.data;
      final List<dynamic> results = data['results'] ?? [];
      return results.map((item) => FeedItem.fromJson(item)).toList();
    } on DioException catch (e) {
      throw FeedPrismException.fromDioError(e);
    }
  }
  
  // =========================================================================
  // ACTIONABLE ITEMS
  // =========================================================================
  
  /// Get actionable items
  Future<List<ActionItem>> getActionableItems({
    String? priority,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        FeedPrismConfig.actionsEndpoint,
        queryParameters: {
          if (priority != null) 'priority': priority,
          'limit': limit,
        },
      );
      final data = response.data;
      final List<dynamic> items = data['items'] ?? [];
      return items.map((item) => ActionItem.fromJson(item)).toList();
    } on DioException catch (e) {
      throw FeedPrismException.fromDioError(e);
    }
  }
  
  // =========================================================================
  // INGESTION
  // =========================================================================
  
  /// Trigger manual email ingestion
  Future<IngestionResult> triggerIngestion({
    int daysBack = 7,
    int maxEmails = 50,
  }) async {
    try {
      final response = await _dio.post(
        FeedPrismConfig.ingestEndpoint,
        data: {
          'days_back': daysBack,
          'max_emails': maxEmails,
        },
      );
      return IngestionResult.fromJson(response.data);
    } on DioException catch (e) {
      throw FeedPrismException.fromDioError(e);
    }
  }
  
  // =========================================================================
  // STATS
  // =========================================================================
  
  /// Get system statistics
  Future<SystemStats> getStats() async {
    try {
      final response = await _dio.get(FeedPrismConfig.statsEndpoint);
      return SystemStats.fromJson(response.data);
    } on DioException catch (e) {
      throw FeedPrismException.fromDioError(e);
    }
  }
}

// =============================================================================
// EXCEPTION HANDLING
// =============================================================================

class FeedPrismException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic originalError;
  
  FeedPrismException({
    required this.message,
    this.statusCode,
    this.originalError,
  });
  
  factory FeedPrismException.fromDioError(DioException error) {
    String message;
    
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
        message = 'Connection timeout. Please check your internet connection.';
        break;
      case DioExceptionType.sendTimeout:
        message = 'Send timeout. Please try again.';
        break;
      case DioExceptionType.receiveTimeout:
        message = 'Receive timeout. The server took too long to respond.';
        break;
      case DioExceptionType.badResponse:
        message = 'Server error: ${error.response?.statusCode}';
        break;
      case DioExceptionType.cancel:
        message = 'Request cancelled.';
        break;
      default:
        message = 'Network error. Please check your connection.';
    }
    
    return FeedPrismException(
      message: message,
      statusCode: error.response?.statusCode,
      originalError: error,
    );
  }
  
  @override
  String toString() => 'FeedPrismException: $message';
}
```


***

## 5. UI Integration

### Feed Widget for Spayce

**File: `lib/widgets/feedprism/feedprism_feed_widget.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/feedprism_provider.dart';
import '../../models/feedprism_models.dart';
import 'feed_cards.dart';

/// Main FeedPrism feed widget for Spayce integration
class FeedPrismFeedWidget extends StatefulWidget {
  final bool showHeader;
  final VoidCallback? onRefresh;
  
  const FeedPrismFeedWidget({
    Key? key,
    this.showHeader = true,
    this.onRefresh,
  }) : super(key: key);
  
  @override
  State<FeedPrismFeedWidget> createState() => _FeedPrismFeedWidgetState();
}

class _FeedPrismFeedWidgetState extends State<FeedPrismFeedWidget> {
  String _selectedFilter = 'all';
  
  @override
  void initState() {
    super.initState();
    // Load feed on init
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FeedPrismProvider>().loadFeed();
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Consumer<FeedPrismProvider>(
      builder: (context, provider, child) {
        return Column(
          children: [
            if (widget.showHeader) _buildHeader(provider),
            if (widget.showHeader) _buildFilterChips(),
            Expanded(
              child: _buildContent(provider),
            ),
          ],
        );
      },
    );
  }
  
  Widget _buildHeader(FeedPrismProvider provider) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          const Icon(Icons.email_outlined, size: 24),
          const SizedBox(width: 8),
          const Text(
            'Email (Structured)',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              provider.loadFeed();
              widget.onRefresh?.call();
            },
          ),
        ],
      ),
    );
  }
  
  Widget _buildFilterChips() {
    final filters = [
      {'id': 'all', 'label': 'All', 'icon': Icons.grid_view},
      {'id': 'event', 'label': 'Events', 'icon': Icons.event},
      {'id': 'course', 'label': 'Courses', 'icon': Icons.school},
      {'id': 'blog', 'label': 'Blogs', 'icon': Icons.article},
      {'id': 'action', 'label': 'Actions', 'icon': Icons.bolt},
    ];
    
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: filters.map((filter) {
          final isSelected = _selectedFilter == filter['id'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    filter['icon'] as IconData,
                    size: 16,
                    color: isSelected ? Colors.white : Colors.grey[700],
                  ),
                  const SizedBox(width: 4),
                  Text(filter['label'] as String),
                ],
              ),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  _selectedFilter = filter['id'] as String;
                });
              },
              selectedColor: Theme.of(context).primaryColor,
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : Colors.grey[700],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
  
  Widget _buildContent(FeedPrismProvider provider) {
    if (provider.isLoading && provider.feedItems.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (provider.error != null && provider.feedItems.isEmpty) {
      return _buildError(provider);
    }
    
    final filteredItems = _selectedFilter == 'all'
        ? provider.feedItems
        : provider.feedItems
            .where((item) => item.entityType == _selectedFilter)
            .toList();
    
    if (filteredItems.isEmpty) {
      return _buildEmptyState();
    }
    
    return RefreshIndicator(
      onRefresh: () => provider.loadFeed(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: filteredItems.length,
        itemBuilder: (context, index) {
          final item = filteredItems[index];
          return FeedItemCard(item: item);
        },
      ),
    );
  }
  
  Widget _buildError(FeedPrismProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load content',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              provider.error ?? 'Unknown error',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => provider.loadFeed(),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'No content found',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Try adjusting your filters',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }
}
```

Due to character limits, I'll create a separate response with the **Hackathon Submission Guide**. Would you like me to continue with:

1. ✅ Complete data models
2. ✅ State management provider
3. ✅ Custom feed card widgets
4. ✅ Integration into Spayce main app
5. ✅ Testing guide

And then the **complete Hackathon Submission Guide** as a separate document?

