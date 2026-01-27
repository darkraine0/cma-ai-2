# Chart Page Architecture

Professional, optimized structure for the community price analysis chart page.

## 📁 Structure

```
chart/
├── components/           # UI Components
│   ├── ChartHeader.tsx  # Hero header with image overlay
│   ├── PriceChart.tsx   # Main chart component
│   └── ChartEmptyState.tsx # Empty state UI
├── config/              # Configuration
│   └── chartConfig.ts   # Chart.js configuration
├── hooks/               # Custom Hooks
│   ├── useChartData.ts  # Chart data preparation
│   └── useChartFilters.ts # Filter state management
├── utils/               # Utilities
│   └── chartDataHelpers.ts # Data transformation utilities
└── page.tsx            # Main page component
```

## 🎯 Key Features

### **Separation of Concerns**
- **Components**: Pure UI components with minimal logic
- **Hooks**: Encapsulate business logic and state
- **Config**: Centralized configuration
- **Utils**: Reusable utility functions

### **Custom Hooks**

#### `useChartData`
Prepares chart data from plans and companies:
- Memoized dataset preparation
- Efficient data transformations
- Returns formatted chart data and empty state

#### `useChartFilters`
Manages filter state and plan filtering:
- Type selection (Now/Plan)
- URL parameter synchronization
- Memoized filtering logic

### **Utilities**

#### `chartDataHelpers.ts`
- `prepareChartDatasets`: Creates Chart.js datasets
- `extractUniqueSquareFootage`: Extracts x-axis values
- Type-safe data structures

#### `companyHelpers.ts` (shared)
- `extractCompanyName`: Normalizes company data
- `getCompanyNames`: Extracts company list
- Handles multiple data formats

### **Configuration**

#### `chartConfig.ts`
Centralized Chart.js configuration:
- Responsive settings
- Styling and colors
- Axis configuration
- Tooltip formatting

## 💡 Benefits

✅ **Maintainability**: Easy to find and update specific functionality
✅ **Testability**: Small, focused units that are easy to test
✅ **Reusability**: Utilities and hooks can be reused
✅ **Performance**: Proper memoization prevents unnecessary re-renders
✅ **Type Safety**: Full TypeScript coverage
✅ **Readability**: Clear separation of concerns
✅ **Scalability**: Easy to extend with new features

## 🔄 Data Flow

```
page.tsx
  ↓ (fetches data)
useCommunityData
  ↓ (extracts companies)
getCompanyNames
  ↓ (filters plans)
useChartFilters
  ↓ (prepares chart data)
useChartData
  ↓ (renders)
PriceChart
```

## 🎨 Component Hierarchy

```
ChartPage
├── ChartHeader
│   └── TypeTabs
└── PriceChart
    ├── Line (Chart.js)
    └── ChartEmptyState
```
