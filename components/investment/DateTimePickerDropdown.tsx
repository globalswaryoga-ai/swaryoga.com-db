/**
 * DateTime Picker with Dropdown
 * Allows user to select date (day, month, year) and time (hour, minute) via dropdowns
 */

import React from 'react';

interface DateTimePickerDropdownProps {
  label: string;
  value: string; // Format: "YYYY-MM-DD HH:mm"
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  minDate?: string; // Format: "YYYY-MM-DD"
}

export const DateTimePickerDropdown: React.FC<DateTimePickerDropdownProps> = ({
  label,
  value,
  onChange,
  error,
  required,
  minDate,
}) => {
  // Parse current value
  const [date, time] = value ? value.split(' ') : ['', ''];
  const [year, month, day] = date ? date.split('-') : ['', '', ''];
  const [hours, minutes] = time ? time.split(':') : ['00', '00'];

  // Parse minDate for validation
  const [minYear, minMonth, minDay] = minDate ? minDate.split('-') : ['', '', ''];
  const minDateObj = minDate ? new Date(`${minDate}T00:00:00`) : null;

  // Generate year options (current year and next 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);

  // Generate month options
  const monthOptions = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Generate day options (1-31)
  const dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  // Generate hour options (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

  // Generate minute options (00-59, step 5)
  const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  // Check if a date is disabled based on minDate
  const isDateDisabled = (y: string, m: string, d: string): boolean => {
    if (!minDateObj) return false;
    const selectedDate = new Date(`${y}-${m}-${d}T00:00:00`);
    return selectedDate < minDateObj;
  };

  // Handle changes
  const handleChange = (field: string, val: string) => {
    let newYear = year;
    let newMonth = month;
    let newDay = day;
    let newHours = hours;
    let newMinutes = minutes;

    switch (field) {
      case 'year':
        newYear = val;
        break;
      case 'month':
        newMonth = val;
        break;
      case 'day':
        newDay = val;
        break;
      case 'hours':
        newHours = val;
        break;
      case 'minutes':
        newMinutes = val;
        break;
    }

    // Build the new value
    if (newYear && newMonth && newDay && newHours !== undefined && newMinutes !== undefined) {
      const newValue = `${newYear}-${newMonth}-${newDay} ${newHours}:${newMinutes}`;
      onChange(newValue);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-600">*</span>}
      </label>

      <div className="grid grid-cols-5 gap-2 mb-2">
        {/* Day Dropdown */}
        <div>
          <label className="text-xs text-gray-600 block mb-1">Day</label>
          <select
            value={day}
            onChange={(e) => handleChange('day', e.target.value)}
            disabled={year && month ? isDateDisabled(year, month, day) : false}
            className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-2 font-semibold ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            } ${!day ? 'text-gray-400' : 'text-gray-900'}`}
          >
            <option value="">--</option>
            {dayOptions.map((d) => (
              <option
                key={d}
                value={d}
                disabled={isDateDisabled(year, month, d)}
              >
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Month Dropdown */}
        <div>
          <label className="text-xs text-gray-600 block mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => handleChange('month', e.target.value)}
            className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-2 font-semibold ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            } ${!month ? 'text-gray-400' : 'text-gray-900'}`}
          >
            <option value="">--</option>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year Dropdown */}
        <div>
          <label className="text-xs text-gray-600 block mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => handleChange('year', e.target.value)}
            className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-2 font-semibold ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            } ${!year ? 'text-gray-400' : 'text-gray-900'}`}
          >
            <option value="">--</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Hour Dropdown */}
        <div>
          <label className="text-xs text-gray-600 block mb-1">Hour</label>
          <select
            value={hours}
            onChange={(e) => handleChange('hours', e.target.value)}
            className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-2 font-semibold ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            } ${!hours ? 'text-gray-400' : 'text-gray-900'}`}
          >
            <option value="">--</option>
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Minute Dropdown */}
        <div>
          <label className="text-xs text-gray-600 block mb-1">Minute</label>
          <select
            value={minutes}
            onChange={(e) => handleChange('minutes', e.target.value)}
            className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-2 font-semibold ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            } ${!minutes ? 'text-gray-400' : 'text-gray-900'}`}
          >
            <option value="">--</option>
            {minuteOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
};
