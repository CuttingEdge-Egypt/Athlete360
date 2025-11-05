#!/usr/bin/env python3
"""
Working Taekwondo Athlete Scraper
Based on the detailed explanation of how the scraping system works
"""

import cloudscraper
import time
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

def get_athlete_ranking_and_competitions(name: str, country: str = None, month: int = None, year: int = None) -> Dict[str, Any]:
    """
    Complete scraper that fetches athlete ranking AND competition history
    
    Args:
        name: Athlete's name (partial match supported)
        country: Athlete's country (optional filter)
        month: Month (1-12, where 1=January). Defaults to current month
        year: Year. Defaults to current year
        
    Returns:
        Dictionary with athlete data including competitions
    """
    
    # Use current date if not specified
    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year
    
    # Convert to 0-indexed (API expects 0=Jan, 11=Dec)
    api_month = month - 1
    
    print(f"\n{'='*70}")
    print(f"Searching for: {name}")
    if country:
        print(f"Country filter: {country}")
    print(f"Time period: {datetime(year, month, 1).strftime('%B %Y')}")
    print(f"{'='*70}\n")
    
    # ====================
    # STEP 1: Session Initialization (CRITICAL!)
    # ====================
    print("Step 1: Initializing session with Cloudflare bypass...")
    
    session = cloudscraper.create_scraper(
        browser={'browser': 'chrome', 'platform': 'windows', 'desktop': True}
    )
    
    # Set browser-like headers
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://worldtkd.simplycompete.com/',
    })
    
    # Visit main website to establish cookies and session
    try:
        main_response = session.get('https://worldtkd.simplycompete.com/', timeout=15)
        print(f"   Main site status: {main_response.status_code}")
        time.sleep(2)  # Let session establish
    except Exception as e:
        print(f"   ❌ Error visiting main site: {e}")
        return {'success': False, 'error': 'Failed to establish session'}
    
    # ====================
    # STEP 2: Fetch Rankings (to get userid)
    # ====================
    print("\nStep 2: Fetching rankings from API...")
    
    rankings_url = "https://worldtkd.simplycompete.com/rankingsV2"
    
    # Build parameters
    params = {
        'limit': '100',
        'month': str(api_month),
        'year': str(year),
        'rankingTypeId': '11ef3b4e-05ce-797c-aca4-064aef8133e9',  # World Kyorugi Rankings
        'subCategory1': '11ef3b4e-3058-36ed-aca4-064aef8133e9',   # World Senior Division
        'pageNo': '1'
    }
    
    # Add country filter if specified (using UUID mapping)
    country_mappings = {
        "Egypt": "11e6eef3-fe4e-a833-92b4-12f817a4f090",
        "Republic of Korea": "11e6eef3-fe5f-9851-92b4-12f817a4f090",
        "United States of America": "11e6eef3-fe3b-1fe0-92b4-12f817a4f090",
        # Add more as needed
    }
    
    if country and country in country_mappings:
        params['countryId'] = country_mappings[country]
    
    try:
        response = session.get(rankings_url, params=params, timeout=30)
        print(f"   Rankings API status: {response.status_code}")
        
        data = response.json()
        inner_data = data.get('data', {})
        
        if 'rankingList' not in inner_data:
            print(f"   ❌ Unexpected response structure")
            return {'success': False, 'error': 'Invalid API response structure'}
        
        ranking_list = inner_data.get('rankingList', [])
        total = inner_data.get('totalCt', 0)
        
        print(f"   Total athletes in rankings: {total}")
        print(f"   Ranking list length: {len(ranking_list)}")
        
        # Find athlete by name
        matched_athletes = []
        for athlete in ranking_list:
            athlete_name = athlete.get('name', '').lower()
            if name.lower() in athlete_name:
                matched_athletes.append(athlete)
                print(f"   ✓ Found: {athlete.get('name')} (Rank #{athlete.get('rank')})")
        
        if not matched_athletes:
            print(f"   ❌ No athlete found matching: {name}")
            return {
                'success': False,
                'error': f'Athlete not found in rankings for {datetime(year, month, 1).strftime("%B %Y")}',
                'searched_name': name,
                'searched_country': country,
                'total_in_rankings': total
            }
        
        # Use first match
        athlete_data = matched_athletes[0]
        userid = athlete_data.get('userId')
        
        if not userid:
            print(f"   ❌ Athlete found but no userid")
            return {'success': False, 'error': 'No userid available'}
        
        print(f"\n   ✅ Found athlete: {athlete_data.get('name')}")
        print(f"   User ID: {userid}")
        
    except Exception as e:
        print(f"   ❌ Error fetching rankings: {e}")
        return {'success': False, 'error': str(e)}
    
    # ====================
    # STEP 3: Fetch Competition History
    # ====================
    print("\nStep 3: Fetching competition history...")
    
    profile_url = "https://worldtkd.simplycompete.com/getPlayerProfileV2"
    
    profile_params = {
        'userId': userid,
        'month': str(api_month),
        'year': str(year),
        'countryId': 'null',
        'rankingTypeId': '11ef3b4e-05ce-797c-aca4-064aef8133e9',
        'subCategory1': '11ef3b4e-3058-36ed-aca4-064aef8133e9',
        'searchQuery': ''
    }
    
    try:
        # Visit profile page to maintain session
        profile_page_url = f"https://worldtkd.simplycompete.com/playerProfileV2?userId={userid}&month={api_month}&year={year}"
        session.get(profile_page_url, timeout=15)
        time.sleep(1)
        
        # Fetch profile data
        profile_response = session.get(profile_url, params=profile_params, timeout=30)
        print(f"   Profile API status: {profile_response.status_code}")
        
        profile_data = profile_response.json()
        data_section = profile_data.get('data', {})
        data_data = data_section.get('data', {})
        
        # Extract profile
        profile = {
            'preferred_first_name': data_data.get('preferredFirstName', ''),
            'preferred_last_name': data_data.get('preferredLastName', ''),
            'wtf_license_id': data_data.get('wtfLicenseId', ''),
            'country': data_data.get('country', ''),
            'gender': data_data.get('gender', ''),
            'birth_year': data_data.get('birthYear', ''),
            'profile_pic_url': data_data.get('profilePicUrl', ''),
        }
        
        # Extract competitions from ranking categories
        competitions = []
        ranking_categories = data_data.get('rankingCategory', [])
        
        print(f"   Found {len(ranking_categories)} ranking categories")
        
        for category in ranking_categories:
            category_name = category.get('rankingCategoryName', 'Unknown')
            event_results = category.get('eventResults', [])
            
            for event in event_results:
                competition = {
                    'event': event.get('eventName', 'Unknown Event'),
                    'g_rank': event.get('gRank', 'N/A'),
                    'date': event.get('endDate', 'N/A'),
                    'location': event.get('location', 'N/A'),
                    'place': event.get('place', 'N/A'),
                    'points': str(event.get('rankingPoints', 'N/A')),
                    'category': category_name,
                    'event_result': event.get('eventResult', 'N/A')
                }
                competitions.append(competition)
        
        # Sort by date (newest first)
        competitions.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        print(f"   ✅ Found {len(competitions)} competitions")
        
        # Combine all data
        result = {
            'success': True,
            'athlete_name': f"{profile.get('preferred_first_name', '')} {profile.get('preferred_last_name', '')}".strip() or athlete_data.get('name'),
            'country': profile.get('country') or athlete_data.get('nation'),
            'userid': userid,
            'wtf_license_id': profile.get('wtf_license_id'),
            'gender': profile.get('gender'),
            'birth_year': profile.get('birth_year'),
            'profile_pic_url': profile.get('profile_pic_url'),
            'current_rank': athlete_data.get('rank'),
            'points': athlete_data.get('points'),
            'profile': profile,
            'competitions': competitions,
            'total_competitions': len(competitions),
            'ranking_categories': ranking_categories,
            'search_period': {
                'month': month,
                'year': year
            }
        }
        
        return result
        
    except Exception as e:
        print(f"   ❌ Error fetching profile: {e}")
        return {
            'success': False,
            'error': str(e),
            'partial_data': athlete_data
        }


if __name__ == "__main__":
    # Test with fallback logic (try multiple periods)
    test_periods = [
        (10, 2024),  # October 2024
        (9, 2024),   # September 2024
        (10, 2023),  # October 2023
        (9, 2023),   # September 2023
    ]
    
    for month, year in test_periods:
        result = get_athlete_ranking_and_competitions(
            name="Jun JANG",
            country="Republic of Korea",
            month=month,
            year=year
        )
        
        if result.get('success'):
            print(f"\n{'='*70}")
            print("✅ SUCCESS!")
            print(f"{'='*70}")
            print(f"\nAthlete: {result['athlete_name']}")
            print(f"Country: {result['country']}")
            print(f"Current Rank: #{result['current_rank']}")
            print(f"Points: {result['points']}")
            print(f"Total Competitions: {result['total_competitions']}")
            
            if result['competitions']:
                print(f"\nLatest 3 Competitions:")
                for i, comp in enumerate(result['competitions'][:3], 1):
                    print(f"\n{i}. {comp['event']}")
                    print(f"   Date: {comp['date']}")
                    print(f"   Location: {comp['location']}")
                    print(f"   Place: {comp['place']}")
            
            # Save to file
            with open('athlete_complete_data.json', 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"\n📄 Complete data saved to: athlete_complete_data.json")
            break
        else:
            print(f"\n❌ Failed for {datetime(year, month, 1).strftime('%B %Y')}: {result.get('error')}")
            print("   Trying next period...\n")
    else:
        print("\n❌ No data found for any tested period")
