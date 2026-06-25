# Performance Optimization Plan

## Current Bundle Analysis

### Build Output Summary
- **Total JS Bundle**: 645.07 kB (gzip: 195.95 kB)
- **CSS Bundle**: 76.41 kB (gzip: 13.22 kB)

### Largest Chunks (Problem Areas)

1. **index-DEgCznst.js**: 645.07 kB (gzip: 195.95 kB)
   - Main application bundle
   - Contains React, Supabase, and all shared dependencies
   - **Issue**: Too large for initial load

2. **PieChart-BtBql1-P.js**: 374.65 kB (gzip: 102.89 kB)
   - Recharts library for analytics
   - **Issue**: Only used in Analytics/Admin pages but loaded eagerly

3. **Navbar-ifvJmy6v.js**: 155.11 kB (gzip: 50.21 kB)
   - Navigation component
   - **Issue**: Likely contains too many imports or heavy components

4. **DealRoomDetail-CIAFaqm5.js**: 62.94 kB (gzip: 16.67 kB)
   - Deal room detail page
   - **Issue**: Complex component with many features

## Optimization Strategies

### 1. Code Splitting Improvements

#### Split Recharts into Separate Chunk
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'recharts': ['recharts'],
        'supabase': ['@supabase/supabase-js'],
        'radix': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', /* ... */],
      }
    }
  }
}
```

#### Lazy Load Heavy Components
```typescript
// In Analytics.tsx and Admin.tsx
const PieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart })));
```

### 2. Dynamic Imports for Route-Based Splitting

Currently using lazy loading for pages, but can improve:
- Split admin-specific components separately
- Split analytics components separately
- Split deal room components separately

### 3. Tree Shaking Improvements

#### Remove Unused Radix Components
The project imports many Radix UI components but may not use all:
```bash
# Audit usage
npx depcheck
```

#### Replace Heavy Libraries
- Consider lighter alternatives to Recharts for simple charts
- Use Chart.js or lightweight SVG charts for basic visualizations

### 4. Component-Level Optimizations

#### Navbar Component (155 kB)
- Extract landing page specific components
- Lazy load admin-specific menu items
- Split icon imports (currently importing all lucide-react icons)

#### DealRoomDetail (62 kB)
- Split chat, documents, and analytics into separate chunks
- Lazy load video conferencing integration
- Dynamic import e-signature dialog

### 5. Bundle Analysis Tools

```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({ open: true, gzipSize: true })
  ]
})
```

### 6. Service Worker for Caching

Implement workbox for caching strategies:
- Cache vendor chunks (React, Supabase, Radix)
- Stale-while-revalidate for API calls
- Cache-first for static assets

## Expected Improvements

### Before Optimization
- Initial load: ~650 kB JS
- Time to Interactive: ~3-5s on 3G
- First Contentful Paint: ~2s

### After Optimization
- Initial load: ~300 kB JS (50% reduction)
- Time to Interactive: ~1.5-2s on 3G
- First Contentful Paint: ~1s

## Implementation Priority

### High Priority (Immediate Impact)
1. Split Recharts into separate chunk
2. Implement manual chunk splitting in vite.config.ts
3. Lazy load analytics components

### Medium Priority (Significant Improvement)
4. Optimize Navbar component
5. Split deal room features
6. Implement service worker caching

### Low Priority (Nice to Have)
7. Replace heavy chart libraries
8. Audit and remove unused dependencies
9. Implement prefetching for likely routes

## Monitoring

Add performance monitoring:
```typescript
// Add to App.tsx
useEffect(() => {
  const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  console.log('Load time:', perfData.loadEventEnd - perfData.fetchStart);
  console.log('DOM content loaded:', perfData.domContentLoadedEventEnd - perfData.fetchStart);
}, []);
```

## Next Steps
1. Install rollup-plugin-visualizer
2. Implement manual chunk splitting
3. Lazy load Recharts
4. Test bundle size improvements
5. Measure actual performance improvements
