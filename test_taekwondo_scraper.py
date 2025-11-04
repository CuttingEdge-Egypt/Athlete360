#!/usr/bin/env python3
"""
Test Taekwondo Athlete Scraper
"""
import cloudscraper
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def scrape_athlete_by_name_and_country(
    athlete_name: str,
    country: str,
    year: int = None,
    month: int = None
) -> Dict[str, Any]:
    """
    Scrape athlete ranking and competition history by name and country.
    """
    
    # Default to current date if not provided
    if year is None or month is None:
        now = datetime.now()
        year = now.year
        month = now.month - 1  # 0-indexed
    
    try:
        # Step 1: Find athlete's user ID by searching rankings
        logger.info(f"Searching for athlete: {athlete_name} from {country}")
        user_id = _find_athlete_user_id(athlete_name, country, year, month)
        
        if not user_id:
            return {
                'success': False,
                'error': f"Could not find athlete '{athlete_name}' from {country} in rankings",
                'athlete_profile': None,
                'ranking_data': None,
                'competitions': None
            }
        
        logger.info(f"Found athlete with user ID: {user_id}")
        
        # Step 2: Get complete athlete data using the user ID
        athlete_data = _get_athlete_complete_data(user_id, year, month)
        
        if not athlete_data.get('success'):
            return {
                'success': False,
                'error': f"Failed to retrieve data for athlete: {athlete_data.get('error', 'Unknown error')}",
                'athlete_profile': None,
                'ranking_data': None,
                'competitions': None
            }
        
        # Step 3: Format and return the data
        return {
            'success': True,
            'athlete_profile': {
                'name': f"{athlete_data['profile']['preferred_first_name']} {athlete_data['profile']['preferred_last_name']}".strip(),
                'full_name': f"{athlete_data['profile']['first_name']} {athlete_data['profile']['last_name']}".strip(),
                'country': athlete_data['profile']['country'],
                'wtf_license_id': athlete_data['profile']['wtf_license_id'],
                'gender': athlete_data['profile']['gender'],
                'birth_year': athlete_data['profile']['birth_year'],
                'age': athlete_data['profile']['age'],
                'profile_picture': athlete_data['profile']['profile_pic_url'],
                'user_id': user_id
            },
            'ranking_data': _format_ranking_data(athlete_data['ranking_categories']),
            'competitions': athlete_data['competitions'],
            'total_competitions': len(athlete_data['competitions']),
            'data_retrieved_for': f"{_get_month_name(month)} {year}"
        }
        
    except Exception as e:
        logger.error(f"Error scraping athlete data: {str(e)}")
        return {
            'success': False,
            'error': f"Exception occurred: {str(e)}",
            'athlete_profile': None,
            'ranking_data': None,
            'competitions': None
        }

def _find_athlete_user_id(athlete_name: str, country: str, year: int, month: int) -> Optional[str]:
    """
    Search for athlete in rankings and return their user ID.
    """
    # Country UUID mapping (key countries)
    country_mappings = {
        "Afghanistan": "11e6eef3-fe41-889a-92b4-12f817a4f090",
        "Algeria": "11e6eef3-fe41-d6bc-92b4-12f817a4f090",
        "Argentina": "11e6eef3-fe43-3653-92b4-12f817a4f090",
        "Australia": "11e6eef3-fe3b-6e01-92b4-12f817a4f090",
        "Austria": "11e6eef3-fe43-f9a6-92b4-12f817a4f090",
        "Belgium": "11e6eef3-fe3b-bc22-92b4-12f817a4f090",
        "Brazil": "11e6eef3-fe3c-3154-92b4-12f817a4f090",
        "Canada": "11e6eef3-fe3c-7f75-92b4-12f817a4f090",
        "China": "11e6eef3-fe3c-cd96-92b4-12f817a4f090",
        "Colombia": "11e6eef3-fe4a-b083-92b4-12f817a4f090",
        "Croatia": "11e6eef3-fe4c-5e3a-92b4-12f817a4f090",
        "Cuba": "11e6eef3-fe3c-f4a7-92b4-12f817a4f090",
        "Czech Republic": "11e6eef3-fe4c-d36c-92b4-12f817a4f090",
        "Denmark": "11e6eef3-fe4d-218d-92b4-12f817a4f090",
        "Egypt": "11e6eef3-fe4e-a833-92b4-12f817a4f090",
        "France": "11e6eef3-fe3d-42c8-92b4-12f817a4f090",
        "Germany": "11e6eef3-fe3d-b7f9-92b4-12f817a4f090",
        "Great Britain": "11e6eef3-fe41-3a79-92b4-12f817a4f090",
        "Greece": "11e6eef3-fe53-d866-92b4-12f817a4f090",
        "India": "11e6eef3-fe3d-df0a-92b4-12f817a4f090",
        "Indonesia": "11e6eef3-fe3e-2d2b-92b4-12f817a4f090",
        "Iran": "11e6eef3-fe57-a906-92b4-12f817a4f090",
        "Ireland": "11e6eef3-fe58-1e38-92b4-12f817a4f090",
        "Israel": "11e6eef3-fe58-4549-92b4-12f817a4f090",
        "Italy": "11e6eef3-fe58-936a-92b4-12f817a4f090",
        "Japan": "11e6eef3-fe3e-7b4c-92b4-12f817a4f090",
        "Jordan": "11e6eef3-fe59-56bd-92b4-12f817a4f090",
        "Korea": "11e6eef3-fe5f-9851-92b4-12f817a4f090",
        "Malaysia": "11e6eef3-fe3e-c96d-92b4-12f817a4f090",
        "Mexico": "11e6eef3-fe3e-f07e-92b4-12f817a4f090",
        "Morocco": "11e6eef3-fe67-aec0-92b4-12f817a4f090",
        "Netherlands": "11e6eef3-fe3f-3e9f-92b4-12f817a4f090",
        "New Zealand": "11e6eef3-fe3f-65b0-92b4-12f817a4f090",
        "Norway": "11e6eef3-fe6a-e31e-92b4-12f817a4f090",
        "Pakistan": "11e6eef3-fe3f-8cc1-92b4-12f817a4f090",
        "Philippines": "11e6eef3-fe3f-dae2-92b4-12f817a4f090",
        "Poland": "11e6eef3-fe6c-ddf7-92b4-12f817a4f090",
        "Portugal": "11e6eef3-fe6d-0508-92b4-12f817a4f090",
        "Russia": "11e6eef3-fe6d-a14c-92b4-12f817a4f090",
        "Saudi Arabia": "11e6eef3-fe6f-9d24-92b4-12f817a4f090",
        "Singapore": "11e6eef3-fe40-2904-92b4-12f817a4f090",
        "South Africa": "11e6eef3-fe71-71ed-92b4-12f817a4f090",
        "Spain": "11e6eef3-fe40-7725-92b4-12f817a4f090",
        "Sweden": "11e6eef3-fe40-9e36-92b4-12f817a4f090",
        "Switzerland": "11e6eef3-fe40-c547-92b4-12f817a4f090",
        "Thailand": "11e6eef3-fe41-1368-92b4-12f817a4f090",
        "Turkey": "11e6eef3-fe76-05df-92b4-12f817a4f090",
        "Ukraine": "11e6eef3-fe77-3e64-92b4-12f817a4f090",
        "United Arab Emirates": "11e6eef3-fe77-8c85-92b4-12f817a4f090",
        "United Kingdom": "11ea8ef2-64fd-b61d-8533-021fe862c5b8",
        "United States": "11e6eef3-fe3b-1fe0-92b4-12f817a4f090",
        "USA": "11e6eef3-fe3b-1fe0-92b4-12f817a4f090"
    }
    
    country_id = country_mappings.get(country)
    if not country_id:
        logger.warning(f"Country '{country}' not in mapping, searching without country filter")
    
    # Create cloudscraper session
    session = cloudscraper.create_scraper(
        browser={'browser': 'chrome', 'platform': 'windows', 'desktop': True}
    )
    
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
    })
    
    # Rankings API endpoint
    rankings_url = "https://worldtkd.simplycompete.com/rankingsV2"
    
    # Try searching in both World and Olympic rankings
    ranking_configs = [
        {
            'rankingTypeId': '11ef3b4e-05ce-797c-aca4-064aef8133e9',  # World Kyorugi
            'subCategory1': '11ef3b4e-3058-36ed-aca4-064aef8133e9'   # World Senior
        },
        {
            'rankingTypeId': '11ef3916-58d3-484e-8999-023374a4dcc1',  # Olympic Kyorugi
            'subCategory1': '11ef3918-30a6-2db9-8999-023374a4dcc1'   # Olympic Senior
        }
    ]
    
    for config in ranking_configs:
        params = {
            'limit': 100,
            'month': str(month),
            'year': str(year),
            'rankingTypeId': config['rankingTypeId'],
            'subCategory1': config['subCategory1'],
            'pageNo': 1
        }
        
        if country_id:
            params['countryId'] = country_id
        
        try:
            response = session.get(rankings_url, params=params, timeout=30)
            if response.status_code == 200:
                data = response.json()
                
                # Search for athlete in results
                if isinstance(data, list):
                    athletes = data
                elif isinstance(data, dict):
                    athletes = data.get('data', [])
                
                for athlete in athletes:
                    name = athlete.get('name', '')
                    if athlete_name.lower() in name.lower():
                        user_id = athlete.get('userId')
                        if user_id:
                            logger.info(f"Found match: {name}")
                            return user_id
        except Exception as e:
            logger.debug(f"Search attempt failed: {str(e)}")
            continue
    
    return None

def _get_athlete_complete_data(user_id: str, year: int, month: int) -> Dict[str, Any]:
    """
    Get complete athlete data including profile, rankings, and competitions.
    """
    # Create cloudscraper session
    session = cloudscraper.create_scraper(
        browser={'browser': 'chrome', 'platform': 'windows', 'desktop': True}
    )
    
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
    })
    
    # Initialize session
    try:
        session.get("https://worldtkd.simplycompete.com/", timeout=15)
    except:
        pass
    
    # API endpoint
    api_url = "https://worldtkd.simplycompete.com/getPlayerProfileV2"
    
    params = {
        'countryId': 'null',
        'month': str(month),
        'rankingTypeId': '11ef3b4e-05ce-797c-aca4-064aef8133e9',
        'searchQuery': '',
        'subCategory1': '11ef3b4e-3058-36ed-aca4-064aef8133e9',
        'userId': user_id,
        'year': str(year)
    }
    
    try:
        response = session.get(api_url, params=params, timeout=30)
        
        if response.status_code != 200:
            return {'success': False, 'error': f'API returned status {response.status_code}'}
        
        api_data = response.json()
        data_section = api_data.get('data', {}).get('data', {})
        
        # Extract profile
        profile = {
            'preferred_first_name': data_section.get('preferredFirstName', ''),
            'preferred_last_name': data_section.get('preferredLastName', ''),
            'first_name': data_section.get('firstName', ''),
            'last_name': data_section.get('lastName', ''),
            'wtf_license_id': data_section.get('wtfLicenseId', ''),
            'profile_pic_url': data_section.get('profilePicUrl', ''),
            'country': data_section.get('country', ''),
            'gender': data_section.get('gender', ''),
            'birth_year': data_section.get('birthYear', ''),
            'age': data_section.get('age', '')
        }
        
        # Extract competitions
        competitions = []
        ranking_categories = data_section.get('rankingCategory', [])
        
        for category in ranking_categories:
            category_name = category.get('rankingCategoryName', 'Unknown')
            event_results = category.get('eventResults', [])
            
            for event in event_results:
                competitions.append({
                    'event': event.get('eventName', 'Unknown Event'),
                    'g_rank': event.get('gRank', 'N/A'),
                    'date': event.get('endDate', 'N/A'),
                    'location': event.get('location', 'N/A'),
                    'place': event.get('place', 'N/A'),
                    'points': str(event.get('rankingPoints', 'N/A')),
                    'category': category_name,
                    'event_id': event.get('eventId', '')
                })
        
        # Sort by date (most recent first)
        competitions.sort(key=lambda x: _parse_date(x.get('date', '')), reverse=True)
        
        return {
            'success': True,
            'profile': profile,
            'ranking_categories': ranking_categories,
            'competitions': competitions
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def _format_ranking_data(ranking_categories: List[Dict]) -> List[Dict]:
    """
    Format ranking data from API response.
    """
    formatted = []
    for category in ranking_categories:
        formatted.append({
            'category': category.get('rankingCategoryName', 'Unknown'),
            'rank': category.get('rank', 'N/A'),
            'total_points': category.get('totalPoints', '0'),
            'events_count': len(category.get('eventResults', []))
        })
    return formatted

def _parse_date(date_str: str) -> datetime:
    """Parse date string for sorting."""
    date_formats = ['%d %B %Y', '%d-%d %B %Y', '%Y-%m-%d']
    
    for fmt in date_formats:
        try:
            clean_date = date_str.split('-')[-1].strip() if '-' in date_str else date_str
            return datetime.strptime(clean_date, fmt)
        except:
            continue
    
    return datetime(1900, 1, 1)

def _get_month_name(month_index: int) -> str:
    """Convert month index to name."""
    months = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December']
    return months[month_index] if 0 <= month_index < 12 else 'Unknown'

# Test with athlete from database
if __name__ == "__main__":
    print("=" * 80)
    print("TESTING TAEKWONDO ATHLETE SCRAPER")
    print("=" * 80)
    print("\nTesting with: Moataz Bellah ASEM ATA ABU SREE' from Egypt")
    print("-" * 80)
    
    result = scrape_athlete_by_name_and_country(
        athlete_name="Moataz Bellah ASEM ATA ABU SREE'",
        country="Egypt"
    )
    
    if result['success']:
        print("\n✅ SUCCESS! Data retrieved successfully\n")
        
        print("=" * 80)
        print("ATHLETE PROFILE")
        print("=" * 80)
        profile = result['athlete_profile']
        print(f"Name: {profile['name']}")
        print(f"Full Name: {profile['full_name']}")
        print(f"Country: {profile['country']}")
        print(f"License ID: {profile['wtf_license_id']}")
        print(f"Gender: {profile['gender']}")
        print(f"Birth Year: {profile['birth_year']}")
        print(f"Age: {profile['age']}")
        print(f"User ID: {profile['user_id']}")
        
        print("\n" + "=" * 80)
        print("RANKING DATA")
        print("=" * 80)
        for rank_info in result['ranking_data']:
            print(f"\nCategory: {rank_info['category']}")
            print(f"Rank: {rank_info['rank']}")
            print(f"Total Points: {rank_info['total_points']}")
            print(f"Events: {rank_info['events_count']}")
        
        print("\n" + "=" * 80)
        print(f"COMPETITIONS ({result['total_competitions']} total)")
        print("=" * 80)
        for i, comp in enumerate(result['competitions'][:10], 1):  # Show first 10
            print(f"\n{i}. {comp['event']}")
            print(f"   Date: {comp['date']}")
            print(f"   Location: {comp['location']}")
            print(f"   G-Rank: {comp['g_rank']}")
            print(f"   Place: {comp['place']}")
            print(f"   Points: {comp['points']}")
            print(f"   Category: {comp['category']}")
        
        if result['total_competitions'] > 10:
            print(f"\n... and {result['total_competitions'] - 10} more competitions")
        
        # Save to JSON
        with open('taekwondo_athlete_test_results.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n✅ Full data saved to taekwondo_athlete_test_results.json")
        
        print("\n" + "=" * 80)
        print("TEST COMPLETED SUCCESSFULLY")
        print("=" * 80)
    else:
        print(f"\n❌ ERROR: {result['error']}")
        print("\n" + "=" * 80)
        print("TEST FAILED")
        print("=" * 80)
