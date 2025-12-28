# Panchang Timezone-Aware Form - Quick Reference

## Form Structure (Updated)

```
┌─ Calendar Form ────────────────────────┐
│                                        │
│  1. Select Country ────────────────┐   │
│  2. Select State ──────────────────┤   │
│  3. Select City (Auto-fill lat/long)│  │
│  4. Select Date ───────────────────┐   │
│  5. [NEW] Enter Timezone (Required)│   │
│  6. [AUTO] Latitude ────────────────┤   │
│  7. [AUTO] Longitude ───────────────┤   │
│  8. [SUBMIT] Calculate Panchang ────┘   │
│                                        │
└────────────────────────────────────────┘

Timezone Input Examples:
- India (IST): 5.5
- USA Eastern (EST): -5
- USA Pacific (PST): -8
- UK (GMT): 0
- Japan (JST): 9
- Australia East (AEST): 10
- Nepal (NPT): 5.45
```

## API Flow (Updated)

```
Client Request:
{
  "date": "2025-12-29",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "timezone": 5.5,
  "locationName": "Mumbai, Maharashtra, India"
}
        ↓
Server Processing:
1. Validate inputs (date, lat, long, timezone required)
2. Calculate sunrise time using astronomical formulas
3. Lookup or calculate Panchang data
4. Generate recommendations
5. Format response
        ↓
Server Response:
{
  "success": true,
  "data": {
    "date": "2025-12-29",
    "location": "Mumbai, Maharashtra, India",
    "coordinates": { "latitude": 19.0760, "longitude": 72.8777 },
    "timezone": 5.5,
    "sunrise": "06:44:30",
    "tithi": 4,
    "tithiName": "Chaturthi",
    "paksha": "Krishna Paksha",
    "nakshatra": { "name": "Anuradha", "symbol": "❤️" },
    "yoga": { "name": "Shula", "effect": "Inauspicious" },
    "karana": { "name": "Vyaghajihvika", "symbol": "🌘" },
    ...
  }
}
```

## Timezone Input Validation

| Field | Type | Required | Range | Format |
|-------|------|----------|-------|--------|
| timezone | number | ✅ Yes | -12 to +14 | UTC offset |
| step | 0.5 | - | - | Half-hour increments |
| examples | - | - | - | 5.5, -5, 0, 9, -8 |

## Common Timezone Values

```javascript
// Major timezones
const timezones = {
  'UTC-12:00': -12,    // Baker Island
  'UTC-11:00': -11,    // Samoa
  'UTC-10:00': -10,    // Hawaii, Tahiti
  'UTC-09:30': -9.5,   // Marquesas
  'UTC-09:00': -9,     // Alaska
  'UTC-08:00': -8,     // Pacific Time (USA/Canada)
  'UTC-07:00': -7,     // Mountain Time (USA/Canada)
  'UTC-06:00': -6,     // Central Time (USA/Canada)
  'UTC-05:00': -5,     // Eastern Time (USA/Canada)
  'UTC-04:00': -4,     // Atlantic Time
  'UTC-03:30': -3.5,   // Newfoundland
  'UTC-03:00': -3,     // Brazil, Argentina
  'UTC-02:00': -2,     // Mid-Atlantic
  'UTC-01:00': -1,     // Azores
  'UTC±00:00': 0,      // GMT, London
  'UTC+01:00': 1,      // Europe, West Africa
  'UTC+02:00': 2,      // East Africa, Greece
  'UTC+03:00': 3,      // East Africa, Moscow
  'UTC+03:30': 3.5,    // Iran
  'UTC+04:00': 4,      // Gulf Time
  'UTC+04:30': 4.5,    // Afghanistan
  'UTC+05:00': 5,      // Pakistan
  'UTC+05:30': 5.5,    // India, Sri Lanka ✨
  'UTC+05:45': 5.75,   // Nepal ✨
  'UTC+06:00': 6,      // Bangladesh
  'UTC+06:30': 6.5,    // Cocos Islands
  'UTC+07:00': 7,      // Southeast Asia
  'UTC+08:00': 8,      // China, Singapore
  'UTC+09:00': 9,      // Japan, Korea ✨
  'UTC+10:00': 10,     // Australia East
  'UTC+10:30': 10.5,   // Australia Central
  'UTC+11:00': 11,     // Australia East (DST)
  'UTC+12:00': 12,     // New Zealand, Fiji
};
```

## Form State Management

```typescript
// State variables in calendar/page.tsx
const [timezone, setTimezone] = useState<number>(5.5); // Default: India

// Update on user input
const handleTimezoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setTimezone(parseFloat(e.target.value) || 0);
};

// Validation on submit
if (!timezone) {
  return NextResponse.json({ error: 'Timezone required' }, { status: 400 });
}

// Pass to API
const response = await fetch('/api/panchang/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    date: selectedDate,
    latitude,
    longitude,
    timezone,  // ← User-provided timezone
    locationName,
  })
});
```

## Sunrise Calculation Parameters

The `calculateSunrise()` function accepts:

```typescript
interface SunriseInput {
  latitude: number;      // -90 to 90 degrees
  longitude: number;     // -180 to 180 degrees
  timezone: number;      // -12 to +14 hours
  date: Date;            // JavaScript Date object
}

interface SunriseOutput {
  hour: number;          // 0-23
  minute: number;        // 0-59
  second: number;        // 0-59
  formatted: string;     // "HH:MM:SS" (e.g., "06:44:30")
}
```

## Response Integration

The sunrise time is now included in the Panchang response:

```typescript
// Old response (date-based only)
{
  "sunrise": "06:44 AM"  // From basic calculator
}

// New response (timezone-aware, sunrise-based)
{
  "timezone": 5.5,
  "sunrise": "06:44:30", // From astronomical calculation
  "tithi": 4,            // Based on sunrise time
  "yoga": "Shula",       // Based on sunrise time
  "nakshatra": "Anuradha" // Based on sunrise time
}
```

## Frontend Usage

```typescript
// In calendar results display
<div className="panchang-details">
  <div className="timezone-info">
    <label>Timezone:</label>
    <span>{calendarData.panchang.timezone} (UTC)</span>
  </div>
  
  <div className="sunrise-info">
    <label>Sunrise Time:</label>
    <span>{calendarData.panchang.sunrise}</span>
  </div>
  
  <div className="tithi-info">
    <label>Tithi:</label>
    <span>{calendarData.panchang.tithiName}</span>
  </div>
  
  {/* ... other Panchang elements ... */}
</div>
```

## Testing Checklist

```bash
# Test timezone input
- [ ] Can enter positive timezones (e.g., 5.5)
- [ ] Can enter negative timezones (e.g., -8)
- [ ] Can enter half-hour offsets (e.g., 5.45, -3.5)
- [ ] Validation prevents missing timezone
- [ ] Validation prevents invalid range (< -12 or > 14)

# Test sunrise calculation
- [ ] Mumbai: 06:44 AM (Dec 29)
- [ ] New York: ~07:15 AM (Dec 29)
- [ ] London: ~08:00 AM (Dec 29)
- [ ] Tokyo: ~06:45 AM (Dec 29)

# Test API integration
- [ ] API receives timezone in request
- [ ] API calculates and returns sunrise time
- [ ] Panchang data uses sunrise-based calculation
- [ ] Response includes all elements

# Test form submission
- [ ] Form disabled until timezone provided
- [ ] Form submits with all required fields
- [ ] Sunrise time displays in results
- [ ] All Panchang elements calculate correctly
```

## Deployment Status

✅ **Feature:** Timezone-aware Panchang calculation  
✅ **Commit:** `c79f606`  
✅ **Build:** Successful  
✅ **Tests:** Ready for manual verification  
✅ **Production:** Deployed to main branch  

---

**Reference:** See `PANCHANG_TIMEZONE_RESTRUCTURE.md` for detailed implementation documentation.
