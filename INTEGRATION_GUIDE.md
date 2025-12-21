# Quick Integration Guide - New Features

## 🚀 Get Started Quickly

### 1. Mobile Responsive Components

#### Responsive Grid
Use for adaptive layouts that adjust to screen size:
```tsx
import { ResponsiveGrid, ResponsiveStat } from '@/components/admin/crm';

<ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 4 }} gap="md">
  <ResponsiveStat label="Leads" value={1234} change="+12%" />
  <ResponsiveStat label="Sales" value={567} change="+8%" />
</ResponsiveGrid>
```

#### Mobile Card
For expandable, touch-friendly content:
```tsx
import { MobileCard } from '@/components/admin/crm';

<MobileCard
  title="Lead Details"
  subtitle="John Doe"
  expandable={true}
  expanded={isExpanded}
  onToggle={() => setIsExpanded(!isExpanded)}
>
  <div>Lead information content</div>
</MobileCard>
```

#### Responsive Table
Automatically adapts to mobile/desktop:
```tsx
import { ResponsiveTable } from '@/components/admin/crm';

<ResponsiveTable
  columns={[
    { key: 'name', label: 'Name', mobile: true },
    { key: 'email', label: 'Email', mobile: true },
    { key: 'status', label: 'Status' },
  ]}
  data={leads}
  onRowClick={(row) => console.log(row)}
/>
```

---

### 2. Framer Motion Animations

#### Page Transitions
Smooth entrance animation for entire pages:
```tsx
import { AnimatedPage } from '@/lib/animations';

export default function AnalyticsPage() {
  return (
    <AnimatedPage>
      <h1>Analytics Dashboard</h1>
      {/* Page content */}
    </AnimatedPage>
  );
}
```

#### List Animations
Staggered animation for list items:
```tsx
import { AnimatedList, AnimatedItem } from '@/lib/animations';

<AnimatedList staggerDelay={0.1}>
  {items.map((item) => (
    <AnimatedItem key={item.id}>
      <div>{item.name}</div>
    </AnimatedItem>
  ))}
</AnimatedList>
```

#### Button Effects
Professional hover and tap effects:
```tsx
import { AnimatedButton } from '@/lib/animations';

<AnimatedButton className="bg-purple-500 text-white px-4 py-2 rounded">
  Click Me
</AnimatedButton>
```

#### Other Animations
```tsx
// Loading spinner
import { AnimatedLoadingSpinner } from '@/lib/animations';
<AnimatedLoadingSpinner />

// Pulsing element (for alerts)
import { Pulse } from '@/lib/animations';
<Pulse><div className="bg-red-500">Alert</div></Pulse>

// Expandable content
import { Collapse } from '@/lib/animations';
<Collapse isOpen={isOpen}>
  <div>Content</div>
</Collapse>
```

---

### 3. Performance Optimizations

#### Lazy Load Images
Next.js optimized images with lazy loading:
```tsx
import { OptimizedImage } from '@/lib/performance';

<OptimizedImage
  src="/dashboard-hero.jpg"
  alt="Dashboard"
  width={1200}
  height={600}
  priority={true}  // For above-the-fold images
/>
```

#### Lazy Load Content
Only load content when it comes into view:
```tsx
import { LazyLoad } from '@/lib/performance';

<LazyLoad fallback={<LoadingSpinner />}>
  <ExpensiveChart />
</LazyLoad>
```

#### Virtual List
Efficiently render 1000+ item lists:
```tsx
import { VirtualList } from '@/lib/performance';

<VirtualList
  items={largeArray}
  itemHeight={60}
  containerHeight={400}
  renderItem={(item, index) => (
    <div>{item.name}</div>
  )}
/>
```

#### Response Caching
Cache API responses:
```tsx
import { getCachedData, setCachedData } from '@/lib/performance';

// Get or fetch data
let leads = getCachedData('leads');
if (!leads) {
  leads = await fetch('/api/leads').then(r => r.json());
  setCachedData('leads', leads);
}
```

---

## 📱 Responsive Breakpoints

The components use Tailwind CSS breakpoints:
- **Mobile**: Default (< 768px)
- **Tablet**: `md:` prefix (768px - 1024px)
- **Desktop**: `lg:` prefix (1024px+)

Example custom responsive styling:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
  {/* 1 col mobile, 2 cols tablet, 4 cols desktop */}
</div>
```

---

## 🎨 Customization

### Custom Grid Layout
```tsx
<ResponsiveGrid
  cols={{ mobile: 1, tablet: 3, desktop: 5 }}
  gap="lg"
  className="custom-class"
>
  {/* content */}
</ResponsiveGrid>
```

### Custom Animation Variants
```tsx
import { slideLeftVariants } from '@/lib/animations';

<motion.div variants={slideLeftVariants} initial="hidden" animate="visible">
  Slides in from left
</motion.div>
```

### Custom Cache Duration
```tsx
// Cache for 15 minutes instead of 5
const cachedData = getCachedData('key', 15 * 60 * 1000);
```

---

## ⚡ Performance Tips

1. **Use `priority` for above-the-fold images**
   ```tsx
   <OptimizedImage src="hero.jpg" priority={true} />
   ```

2. **Lazy load below-the-fold content**
   ```tsx
   <LazyLoad>
     <ExpensiveComponent />
   </LazyLoad>
   ```

3. **Use VirtualList for large data grids**
   ```tsx
   // For 100+ rows
   <VirtualList items={data} itemHeight={60} />
   ```

4. **Cache API responses**
   ```tsx
   // Avoid refetching same data
   const cached = getCachedData('api-key');
   ```

5. **Batch animations**
   ```tsx
   // Use AnimatedList for staggered items instead of individual animations
   <AnimatedList>
     {items.map(item => <AnimatedItem>{item}</AnimatedItem>)}
   </AnimatedList>
   ```

---

## 📊 Responsive Example Page

```tsx
'use client';

import { useState } from 'react';
import {
  ResponsiveGrid,
  ResponsiveTable,
  ResponsiveStat,
  MobileMenu,
} from '@/components/admin/crm';
import { AnimatedPage, AnimatedList, AnimatedItem } from '@/lib/animations';
import { OptimizedImage, LazyLoad } from '@/lib/performance';

export default function SalesPage() {
  const [view, setView] = useState('overview');

  return (
    <AnimatedPage>
      {/* Mobile Menu for View Selection */}
      <MobileMenu
        items={[
          { label: 'Overview', active: view === 'overview', onClick: () => setView('overview') },
          { label: 'Details', active: view === 'details', onClick: () => setView('details') },
        ]}
      />

      {/* Stat Cards Grid */}
      <AnimatedList>
        <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 4 }}>
          <AnimatedItem>
            <ResponsiveStat label="Total Sales" value="$45,234" change="+12%" />
          </AnimatedItem>
          <AnimatedItem>
            <ResponsiveStat label="This Month" value="$8,234" change="+5%" />
          </AnimatedItem>
        </ResponsiveGrid>
      </AnimatedList>

      {/* Lazy Load Table */}
      <LazyLoad>
        <ResponsiveTable columns={columns} data={sales} />
      </LazyLoad>
    </AnimatedPage>
  );
}
```

---

## 🔧 Troubleshooting

**Issue**: Mobile components not responsive
- **Solution**: Ensure Tailwind CSS is configured in `tailwind.config.js`

**Issue**: Animations not smooth
- **Solution**: Check if Framer Motion is installed (`npm list framer-motion`)

**Issue**: Images not lazy loading
- **Solution**: Verify Next.js Image component is being used

**Issue**: Virtual list flickering
- **Solution**: Ensure `itemHeight` matches actual rendered item height

---

## 📚 Further Reading

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)

---

**Happy coding!** 🎉
