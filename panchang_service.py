#!/usr/bin/env python3
"""
Accurate Panchang Calculation Service using PyEphem
Professional astronomical calculations
"""

import json
import sys
from datetime import datetime, timedelta
import ephem
import math

# Nakshatras (27 lunar mansions)
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

def normalize_angle(angle):
    """Normalize angle to 0-360"""
    return ((angle % 360) + 360) % 360

def deg_to_rad(deg):
    return deg * math.pi / 180

def rad_to_deg(rad):
    return rad * 180 / math.pi

def get_ecliptic_longitude(ra_rad, dec_rad):
    """
    Convert equatorial coordinates to ecliptic longitude
    Obliquity of ecliptic (epsilon) ≈ 23.44°
    """
    epsilon = deg_to_rad(23.44)
    lon = math.atan2(
        math.sin(ra_rad) * math.cos(epsilon) + math.tan(dec_rad) * math.sin(epsilon),
        math.cos(ra_rad)
    )
    return normalize_angle(rad_to_deg(lon))

def calculate_panchang(date_str, latitude, longitude, timezone_offset):
    """Calculate panchang using accurate astronomical data"""
    try:
        # Parse date
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        
        # Create observer at location, noon IST
        observer = ephem.Observer()
        observer.lat = str(latitude)
        observer.lon = str(longitude)
        # Adjust to noon IST for calculation
        observer.date = ephem.Date(date_obj) + ephem.Date(0.5)  # add 12 hours (0.5 day)
        
        # Compute sun and moon positions
        sun = ephem.Sun(observer)
        moon = ephem.Moon(observer)
        
        # Get ecliptic longitudes
        sun_ecliptic_lon = get_ecliptic_longitude(sun.ra, sun.dec)
        moon_ecliptic_lon = get_ecliptic_longitude(moon.ra, moon.dec)
        
        # Calculate Tithi (15° per day)
        tithi_angle = normalize_angle(moon_ecliptic_lon - sun_ecliptic_lon)
        tithi_index = int(tithi_angle / 12)  # 0-29 (30 tithis per month)
        tithi = tithi_index + 1  # 1-30
        
        # Determine paksha
        if tithi_index < 15:
            paksha = 'Shukla Paksha'
        else:
            paksha = 'Krishna Paksha'
            tithi = tithi_index - 14  # Renumber 1-15 for krishna paksha
        
        # Get nakshatra from moon longitude (27 nakshatras, 13.33° each)
        moon_lon = normalize_angle(moon_ecliptic_lon)
        nakshatra_index = int((moon_lon / 360) * 27) % 27
        nakshatra_name = NAKSHATRAS[nakshatra_index]['name']
        
        # Calculate Yoga (27 yogas, 13.33° sum of longitudes)
        yoga_sum = normalize_angle(sun_ecliptic_lon + moon_ecliptic_lon)
        yoga_index = int((yoga_sum / 360) * 27) % 27
        yoga_name = YOGAS[yoga_index]['name']
        yoga_effect = YOGAS[yoga_index]['effect']
        
        # Get rashis
        sun_rashi_index = int((sun_ecliptic_lon / 360) * 12) % 12
        moon_rashi_index = int((moon_ecliptic_lon / 360) * 12) % 12
        sun_rashi = RASHIS[sun_rashi_index]['name']
        moon_rashi = RASHIS[moon_rashi_index]['name']
        
        # Calculate sunrise
        observer_copy = ephem.Observer()
        observer_copy.lat = str(latitude)
        observer_copy.lon = str(longitude)
        observer_copy.date = ephem.Date(date_obj)
        
        sunrise = observer_copy.next_rising(ephem.Sun())
        sunrise_dt = ephem.Date(sunrise).datetime()
        
        # Convert to local timezone
        sunrise_local = sunrise_dt.hour + sunrise_dt.minute / 60 + sunrise_dt.second / 3600
        sunrise_local = (sunrise_local + timezone_offset) % 24
        
        sunrise_hour = int(sunrise_local)
        sunrise_min = int((sunrise_local - sunrise_hour) * 60)
        
        return {
            'success': True,
            'date': date_str,
            'tithi': tithi,
            'tithiName': get_tithi_name(tithi, paksha),
            'paksha': paksha,
            'nakshatra': nakshatra_name,
            'yoga': yoga_name,
            'yogaEffect': yoga_effect,
            'sunRashi': sun_rashi,
            'moonRashi': moon_rashi,
            'moonLongitude': round(moon_ecliptic_lon, 2),
            'sunLongitude': round(sun_ecliptic_lon, 2),
            'sunrise': f'{sunrise_hour:02d}:{sunrise_min:02d}',
            'coordinates': {'latitude': latitude, 'longitude': longitude},
            'timezone': timezone_offset,
        }
    
    except Exception as e:
        import traceback
        return {
            'success': False,
            'error': str(e),
            'trace': traceback.format_exc()
        }

def get_tithi_name(tithi, paksha):
    """Get tithi name for given paksha"""
    names = [
        'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
        'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
        'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima'
    ]
    return names[min(tithi - 1, 14)]

if __name__ == '__main__':
    input_data = json.loads(sys.stdin.read())
    result = calculate_panchang(
        input_data['date'],
        input_data['latitude'],
        input_data['longitude'],
        input_data['timezone']
    )
    print(json.dumps(result))



