# 🎨 UI Components & Patterns Guide

## Form Components

### Input Field with Icon (Signup)
```jsx
<div>
  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
    Full Name *
  </label>
  <input
    type="text"
    id="name"
    name="name"
    value={formData.name}
    onChange={handleInputChange}
    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent transition-colors ${
      errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`}
    placeholder="Enter your full name"
  />
  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
</div>
```

### Password Field with Toggle
```jsx
<div>
  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
    Password *
  </label>
  <div className="relative">
    <input
      type={showPassword ? 'text' : 'password'}
      id="password"
      name="password"
      value={formData.password}
      onChange={handleInputChange}
      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent ${
        errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'
      }`}
      placeholder="Create a password"
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
    >
      {showPassword ? '👁️‍🗨️' : '👁️'}
    </button>
  </div>
  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
</div>
```

### Select Dropdown
```jsx
<div>
  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
    Country
  </label>
  <select
    id="country"
    name="country"
    value={formData.country}
    onChange={handleInputChange}
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
  >
    <option value="">Select Country</option>
    {countries.map((country) => (
      <option key={country} value={country}>
        {country}
      </option>
    ))}
  </select>
</div>
```

### Checkbox
```jsx
<label className="flex items-start space-x-3 cursor-pointer">
  <input
    type="checkbox"
    name="agreeToTerms"
    checked={formData.agreeToTerms}
    onChange={handleInputChange}
    className="mt-1 w-5 h-5 border-gray-300 rounded text-yoga-600 focus:ring-yoga-500 cursor-pointer"
  />
  <span className="text-sm text-gray-600">
    I agree to the{' '}
    <Link href="/terms" className="text-yoga-600 hover:text-yoga-700 font-medium">
      Terms and Conditions
    </Link>
  </span>
</label>
```

## Alert & Status Components

### Success Message
```jsx
<div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
  <span className="text-green-600 text-xl">✓</span>
  <span className="text-green-800 font-medium">
    Account created successfully!
  </span>
</div>
```

### Error Message
```jsx
<div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
  <span className="text-red-600 text-xl">⚠</span>
  <span className="text-red-800 font-medium">
    Invalid email or password
  </span>
</div>
```

### Field Error
```jsx
{errors.email && (
  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
)}
```

## Button Components

### Primary Button
```jsx
<button
  type="submit"
  disabled={isSubmitting}
  className="w-full bg-gradient-to-r from-yoga-600 to-yoga-700 text-white py-3 px-4 rounded-lg font-bold hover:from-yoga-700 hover:to-yoga-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
>
  {isSubmitting ? (
    <>
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
      <span>Processing...</span>
    </>
  ) : (
    <>
      <span>👤</span>
      <span>Sign Up</span>
    </>
  )}
</button>
```

### Secondary Link Button
```jsx
<Link
  href="/signin"
  className="text-yoga-600 hover:text-yoga-700 font-bold"
>
  Sign in here
</Link>
```

## Layout Components

### Card Container
```jsx
<div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
  {/* Content */}
</div>
```

### Grid Layout (2 columns on desktop)
```jsx
<div className="grid md:grid-cols-2 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

### Grid Layout (3 columns)
```jsx
<div className="grid md:grid-cols-3 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>
```

### Section Header
```jsx
<div className="text-center mb-8">
  <div className="w-16 h-16 bg-yoga-100 rounded-full flex items-center justify-center mx-auto mb-4">
    <span className="text-3xl">🧘</span>
  </div>
  <h1 className="text-4xl font-bold text-yoga-700 mb-2">Page Title</h1>
  <p className="text-gray-600">Subtitle or description</p>
</div>
```

## Text Styles

### Heading Level 1
```jsx
<h1 className="text-4xl font-bold text-yoga-700 mb-2">Main Title</h1>
```

### Heading Level 2
```jsx
<h2 className="text-2xl font-bold text-yoga-700 mb-4">Section Title</h2>
```

### Body Text
```jsx
<p className="text-gray-600">Regular paragraph text</p>
```

### Small Text
```jsx
<span className="text-sm text-gray-600">Small text</span>
```

## Color Palette

### Yoga Theme Colors
```
yoga-50: #f8f5f0   (Very Light)
yoga-100: #ede5d8  (Light)
yoga-500: #c9934f  (Primary)
yoga-600: #b8793d  (Primary Dark)
yoga-700: #9d5f2e  (Darkest)

Grays:
gray-300: Borders
gray-400: Icons/secondary
gray-600: Body text
gray-700: Labels
gray-800: Headings
gray-900: Dark text

Red (Errors):
red-50: Error background
red-200: Error border
red-600: Error text

Green (Success):
green-50: Success background
green-200: Success border
green-600: Success text
```

## Spacing System

```
mb-2: margin-bottom 0.5rem (8px)
mb-4: margin-bottom 1rem (16px)
mb-6: margin-bottom 1.5rem (24px)
mb-8: margin-bottom 2rem (32px)
p-4: padding 1rem (16px)
p-8: padding 2rem (32px)
gap-6: gap between flex/grid items 1.5rem (24px)
```

## Responsive Breakpoints

```
Mobile: < 768px (no prefix)
Tablet: md: 768px+
Desktop: lg: 1024px+
Large: xl: 1280px+
```

Example:
```jsx
<div className="text-sm md:text-base lg:text-lg">
  {/* Small on mobile, medium on tablet, large on desktop */}
</div>
```

## Form Validation Pattern

```javascript
const validateForm = () => {
  const newErrors: Record<string, string> = {};

  if (!formData.field.trim()) {
    newErrors.field = 'Field is required';
  } else if (validation_rule) {
    newErrors.field = 'Error message';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  
  // Clear error on input
  if (errors[name]) {
    setErrors(prev => ({ ...prev, [name]: '' }));
  }
};
```

## Animation Classes

```
transition-colors: Smooth color changes
transition-all: Smooth all property changes
hover:shadow-xl: Larger shadow on hover
disabled:opacity-50: 50% opacity when disabled
disabled:cursor-not-allowed: Show disabled cursor
animate-spin: Spinning animation for loading

Example:
className="hover:bg-yoga-700 transition-colors"
```

## Interactive Patterns

### Form Section
```jsx
<form onSubmit={handleSubmit} className="space-y-6">
  {/* Multiple input sections separated by space-y-6 */}
  <section className="space-y-6">
    <h2 className="text-xl font-bold text-gray-800 mb-4">Section Title</h2>
    {/* Inputs in grid */}
    <div className="grid md:grid-cols-2 gap-6">
      {/* Inputs */}
    </div>
  </section>
  
  <button type="submit">Submit</button>
</form>
```

### Conditional Rendering
```jsx
{submitStatus === 'success' && <SuccessMessage />}
{submitStatus === 'error' && <ErrorMessage />}
{isSubmitting && <LoadingSpinner />}
```

---

## Implementation Examples

### Add a new form field
1. Add to state: `city: ''`
2. Add input JSX with validation
3. Add validation rule in validateForm()
4. Add to handleInputChange() logic
5. Include in API request body

### Add new color
1. Edit `tailwind.config.js`
2. Add to yoga color palette
3. Use with `text-yoga-XXX`, `bg-yoga-XXX`, `border-yoga-XXX`

### Create a new page
1. Create folder in `/app/pagename/`
2. Add `page.tsx` file
3. Include Navigation and Footer
4. Use existing component patterns
5. Apply Tailwind classes

---

This guide covers all patterns used in the Swar Yoga website!
