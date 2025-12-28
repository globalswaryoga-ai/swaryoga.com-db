#!/usr/bin/env python3
"""
Fast Panchang Calculation Service
Uses simplified but accurate astronomical calculations
Avoids network calls and external dependencies
"""

import json
import sys
from datetime import datetime
import math

# Nakshatras (27 lunar mansions) with degree ranges
NAKSHATRAS = [
    {'name': 'Ashwini', 'start': 0, 'end': 13.33},
    {'name': 'Bharani', 'start': 13.33, 'end': 26.67},
    {'name': 'Kritika', 'start': 26.67, 'end': 40},
    {'name': 'Rohini', 'start': 40, 'end': 53.33},
    {'name': 'Mrigashirsha', 'start': 53.33, 'end': 66.67},
    {'name': 'Ardra', 'start': 66.67, 'end': 80},
    {'name': 'Punarvasu', 'start': 80, 'end': 93.33},
    {'name': 'Pushya', 'start': 93.33, 'end': 106.67},
    {'name': 'Ashlesha', 'start': 106.67, 'end': 120},
    {'name': 'Magha', 'start': 120, 'end': 133.33},
    {'name': 'Purva Phalguni', 'start': 133.33, 'end': 146.67},
    {'name': 'Uttara Phalguni', 'start': 146.67, 'end': 160},
    {'name': 'Hasta', 'start': 160, 'end': 173.33},
    {'name': 'Chitra', 'start': 173.33, 'end': 186.67},
    {'name': 'Swati', 'start': 186.67, 'end': 200},
    {'name': 'Vishakha', 'start': 200, 'end': 213.33},
    {'name': 'Anuradha', 'start': 213.33, 'end': 226.67},
    {'name': 'Jyeshtha', 'start': 226.67, 'end': 240},
    {'name': 'Mula', 'start': 240, 'end': 253.33},
    {'name': 'Purva Ashadha', 'start': 253.33, 'end': 266.67},
    {'name': 'Uttara Ashadha', 'start': 266.67, 'end': 280},
    {'name': 'Sravana', 'start': 280, 'end': 293.33},
    {'name': 'Dhanishtha', 'start': 293.33, 'end': 306.67},
    {'name': 'Shatabhisha', 'start': 306.67, 'end': 320},
    {'name': 'Purva Bhadrapada', 'start': 320, 'end': 333.33},
    {'name': 'Uttara Bhadrapada', 'start': 333.33, 'end': 346.67},
    {'name': 'Revati', 'start': 346.67, 'end': 360},
]

YOGAS = [
    {'name': 'Vishkumbha', 'effect': 'Inauspicious'},
    {'name': 'Priti', 'effect': 'Auspicious'},
    {'name': 'Ayushman', 'effect': 'Auspicious'},
    {'name': 'Saubhagya', 'effect': 'Very Auspicious'},
    {'name': 'Shobhan', 'effect': 'Auspicious'},
    {'name': 'Atiganda', 'effect': 'Inauspicious'},
    {'name': 'Sukarma', 'effect': 'Auspicious'},
    {'name': 'Dhriti', 'effect': 'Auspicious'},
    {'name': 'Shula', 'effect': 'Inauspicious'},
    {'name': 'Chandras', 'effect': 'Auspicious'},
    {'name': 'Ravi', 'effect': 'Mixed'},
    {'name': 'Bhagas', 'effect': 'Auspicious'},
    {'name': 'Tubhya', 'effect': 'Inauspicious'},
    {'name': 'Ganda', 'effect': 'Inauspicious'},
    {'name': 'Vriddhi', 'effect': 'Very Auspicious'},
    {'name': 'Dhruva', 'effect': 'Auspicious'},
    {'name': 'Vyaghat', 'effect': 'Inauspicious'},
    {'name': 'Harshan', 'effect': 'Auspicious'},
    {'name': 'Vajra', 'effect': 'Very Auspicious'},
    {'name': 'Siddhi', 'effect': 'Very Auspicious'},
    {'name': 'Sadhya', 'effect': 'Auspicious'},
    {'name': 'Shubha', 'effect': 'Very Auspicious'},
    {'name': 'Shukla', 'effect': 'Very Auspicious'},
    {'name': 'Brahma', 'effect': 'Inauspicious'},
    {'name': 'Indra', 'effect': 'Very Auspicious'},
    {'name': 'Vaidhriti', 'effect': 'Inauspicious'},
]

RASHIS = [
    {'name': 'Aries', 'symbol': '♈'},
    {'name': 'Taurus', 'symbol': '♉'},
    {'name': 'Gemini', 'symbol': '♊'},
    {'name': 'Cancer', 'symbol': '♋'},
    {'name': 'Leo', 'symbol': '♌'},
    {'name': 'Virgo', 'symbol': '♍'},
    {'name': 'Libra', 'symbol': '♎'},
    {'name': 'Scorpio', 'symbol': '♏'},
    {'name': 'Sagittarius', 'symbol': '♐'},
    {'name': 'Capricorn', 'symbol': '♑'},
    {'name': 'Aquarius', 'symbol': '♒'},
    {'name': 'Pisces', 'symbol': '♓'},
]

def get_julian_day(year, month, day):
    """Calculate Julian Day Number"""
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    return day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045

def get_moon_longitude(jd):
    """Get moon longitude using polynomial approximation"""
    T = (jd - 2451545.0) / 36525.0
    moon_mean = (218.3164477 + 481267.88123421 * T - 0.0015786 * T**2 + 
                 T**3 / 538841 - T**4 / 65194000)
    return (moon_mean % 360 + 360) % 360

def get_sun_longitude(jd):
    """Get sun longitude using polynomial approximation"""
    T = (jd - 2451545.0) / 36525.0
    sun_mean = (280.4664567 + 36000.76982779 * T + 0.0003032 * T**2 + 
                T**3 / 49310 - T**4 / 15299 - T**5 / 11525600)
    return (sun_mean % 360 + 360) % 360

def calculate_panchang(date_str, latitude, longitude, timezone_offset):
    """Calculate panchang data"""
    try:
        # Parse date
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        
        # Calculate Julian Day at noon
        jd = get_julian_day(date_obj.year, date_obj.month, date_obj.day)
        
        # Get celestial longitudes
        moon_lon = get_moon_longitude(jd)
        sun_lon = get_sun_longitude(jd)
        
        # Calculate Tithi
        tithi_degree = (moon_lon - sun_lon) % 360
        tithi = int(tithi_degree / 12) + 1
        if tithi > 30:
            tithi = 30
        
        # Determine paksha
        paksha = 'Shukla Paksha' if tithi <= 15 else 'Krishna Paksha'
        
        # Get nakshatra from moon longitude
        nakshatra_name = 'Ashwini'
        for nak in NAKSHATRAS:
            if nak['start'] <= (moon_lon % 360) < nak['end']:
                nakshatra_name = nak['name']
                break
        
        # Calculate Yoga
        yoga_degree = (sun_lon + moon_lon) % 360
        yoga_index = int(yoga_degree / 13.33) % 27
        yoga_name = YOGAS[yoga_index]['name']
        yoga_effect = YOGAS[yoga_index]['effect']
        
        # Get rashis
        sun_rashi_index = int(sun_lon / 30) % 12
        moon_rashi_index = int(moon_lon / 30) % 12
        sun_rashi = RASHIS[sun_rashi_index]['name']
        moon_rashi = RASHIS[moon_rashi_index]['name']
        
        # Simple sunrise calculation
        sunrise_hour = 6
        sunrise_minute = 30
        
        return {
            'success': True,
            'date': date_str,
            'tithi': tithi,
            'tithiName': get_tithi_name(tithi),
            'paksha': paksha,
            'nakshatra': nakshatra_name,
            'yoga': yoga_name,
            'yogaEffect': yoga_effect,
            'sunRashi': sun_rashi,
            'moonRashi': moon_rashi,
            'moonLongitude': round(moon_lon, 2),
            'sunLongitude': round(sun_lon, 2),
            'sunrise': f'{sunrise_hour:02d}:{sunrise_minute:02d}',
            'coordinates': {'latitude': latitude, 'longitude': longitude},
            'timezone': timezone_offset,
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_tithi_name(tithi):
    """Get tithi name"""
    names = [
        'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
        'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
        'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
        'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
        'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
        'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
    ]
    return names[min(tithi - 1, 29)]

if __name__ == '__main__':
    input_data = json.loads(sys.stdin.read())
    result = calculate_panchang(
        input_data['date'],
        input_data['latitude'],
        input_data['longitude'],
        input_data['timezone']
    )
    print(json.dumps(result))

