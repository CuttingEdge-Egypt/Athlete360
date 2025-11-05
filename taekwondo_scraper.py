#!/usr/bin/env python3
"""
Hybrid Taekwondo Athlete Scraper
Tries API approach first, automatically falls back to BrowserUse when API returns empty
Takes athlete name and country, returns current rank and competitive history
"""

import cloudscraper
import time
import json
import sys
from typing import Dict, List, Optional, Any
from datetime import datetime

class TaekwondoScraper:
    """
    Hybrid scraper that combines Simply Compete API with BrowserUse fallback
    """
    
    def __init__(self):
        self.session = cloudscraper.create_scraper(
            browser={'browser': 'chrome', 'platform': 'windows', 'desktop': True}
        )
        
        # Comprehensive headers matching working implementation
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://worldtkd.simplycompete.com/',
            'Origin': 'https://worldtkd.simplycompete.com',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'DNT': '1'
        })
        
        # Country UUID mappings
        self.country_mappings = {
            "Egypt": "11e6eef3-fe4e-a833-92b4-12f817a4f090",
            "Republic of Korea": "11e6eef3-fe5f-9851-92b4-12f817a4f090",
            "Korea": "11e6eef3-fe5f-9851-92b4-12f817a4f090",
            "United States of America": "11e6eef3-fe3b-1fe0-92b4-12f817a4f090",
            "USA": "11e6eef3-fe3b-1fe0-92b4-12f817a4f090",
            "Italy": "11e6eef3-fe58-936a-92b4-12f817a4f090",
            "France": "11e6eef3-fe3d-42c8-92b4-12f817a4f090",
            "Spain": "11e6eef3-fe73-1994-92b4-12f817a4f090",
            "Tunisia": "11e6eef3-fe72-a82b-92b4-12f817a4f090",
            "Ireland": "11e6eef3-fe58-1e38-92b4-12f817a4f090",
            "China": "11e6eef3-fe3c-a686-92b4-12f817a4f090",
        }
    
    def _establish_session(self):
        """Initialize session by visiting main site"""
        try:
            response = self.session.get('https://worldtkd.simplycompete.com/', timeout=15)
            time.sleep(2)  # Let session establish
            return response.status_code == 200
        except Exception as e:
            print(f"Session initialization warning: {e}", file=sys.stderr)
            return False
    
    def _try_api_rankings(self, name: str, country: str = None, month: int = None, year: int = None) -> Optional[Dict[str, Any]]:
        """
        Part 1: Try to find athlete via Simply Compete API
        Returns athlete data with userId if found, None if API returns empty
        """
        if month is None:
            month = datetime.now().month
        if year is None:
            year = datetime.now().year
        
        api_month = month - 1  # 0-indexed
        
        print(f"[API] Searching for: {name} ({country or 'any country'}), period: {datetime(year, month, 1).strftime('%B %Y')}", file=sys.stderr)
        
        # Establish session
        self._establish_session()
        
        # Build API parameters
        params = {
            'limit': '100',
            'month': str(api_month),
            'year': str(year),
            'rankingTypeId': '11ef3b4e-05ce-797c-aca4-064aef8133e9',  # World Kyorugi Rankings
            'subCategory1': '11ef3b4e-3058-36ed-aca4-064aef8133e9',   # World Senior Division
            'pageNo': '1'
        }
        
        # Add country filter if specified
        if country and country in self.country_mappings:
            params['countryId'] = self.country_mappings[country]
        
        try:
            response = self.session.get(
                'https://worldtkd.simplycompete.com/rankingsV2',
                params=params,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"[API] Rankings request failed: {response.status_code}", file=sys.stderr)
                return None
            
            data = response.json()
            inner_data = data.get('data', {})
            ranking_list = inner_data.get('rankingList', [])
            total = inner_data.get('totalCt', 0)
            
            print(f"[API] Response: {total} total athletes, {len(ranking_list)} in list", file=sys.stderr)
            
            if total == 0 or not ranking_list:
                print("[API] No ranking data available for this period", file=sys.stderr)
                return None
            
            # Find athlete by name
            for athlete in ranking_list:
                athlete_name = athlete.get('name', '').lower()
                if name.lower() in athlete_name:
                    print(f"[API] Found: {athlete.get('name')} (Rank #{athlete.get('rank')})", file=sys.stderr)
                    return athlete
            
            print(f"[API] Athlete '{name}' not found in {len(ranking_list)} athletes", file=sys.stderr)
            return None
            
        except Exception as e:
            print(f"[API] Error: {e}", file=sys.stderr)
            return None
    
    def _try_api_profile(self, userid: str, month: int, year: int) -> Optional[Dict[str, Any]]:
        """
        Part 2: Try to get athlete profile and competition history via API
        """
        api_month = month - 1
        
        print(f"[API] Fetching profile for userId: {userid}", file=sys.stderr)
        
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
            # Visit profile page
            profile_page_url = f"https://worldtkd.simplycompete.com/playerProfileV2?userId={userid}&month={api_month}&year={year}"
            self.session.get(profile_page_url, timeout=15)
            time.sleep(1)
            
            # Fetch profile data
            response = self.session.get(
                'https://worldtkd.simplycompete.com/getPlayerProfileV2',
                params=profile_params,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"[API] Profile request failed: {response.status_code}", file=sys.stderr)
                return None
            
            profile_data = response.json()
            data_section = profile_data.get('data', {})
            data_data = data_section.get('data', {})
            
            # Extract competitions
            competitions = []
            ranking_categories = data_data.get('rankingCategory', [])
            
            for category in ranking_categories:
                event_results = category.get('eventResults', [])
                for event in event_results:
                    competition = {
                        'event': event.get('eventName', 'Unknown Event'),
                        'gRank': event.get('gRank', 'N/A'),
                        'date': event.get('endDate', 'N/A'),
                        'location': event.get('location', 'N/A'),
                        'place': str(event.get('place', 'N/A')),
                        'points': str(event.get('rankingPoints', 'N/A')),
                        'category': category.get('rankingCategoryName', 'Unknown'),
                        'eventResult': event.get('eventResult', 'N/A')
                    }
                    competitions.append(competition)
            
            # Sort by date (newest first)
            competitions.sort(key=lambda x: x.get('date', ''), reverse=True)
            
            print(f"[API] Found {len(competitions)} competitions", file=sys.stderr)
            
            return {
                'profile': data_data,
                'competitions': competitions
            }
            
        except Exception as e:
            print(f"[API] Profile error: {e}", file=sys.stderr)
            return None
    
    def get_athlete_data(self, name: str, country: str = None) -> Dict[str, Any]:
        """
        Main method: Get athlete data using hybrid approach
        1. Try API (multiple periods with fallback)
        2. If API returns empty, indicate BrowserUse should be used
        
        Args:
            name: Athlete's name
            country: Athlete's country (optional)
            
        Returns:
            Dictionary with athlete data and data source indicator
        """
        print(f"\n{'='*70}", file=sys.stderr)
        print(f"HYBRID SCRAPER: Searching for {name} ({country or 'any country'})", file=sys.stderr)
        print(f"{'='*70}\n", file=sys.stderr)
        
        # Try API with multiple time periods
        test_periods = [
            (datetime.now().month, datetime.now().year),  # Current month
            (12, 2024),  # December 2024
            (10, 2024),  # October 2024
            (12, 2023),  # December 2023
            (10, 2023),  # October 2023
        ]
        
        athlete_data = None
        profile_data = None
        used_period = None
        
        for month, year in test_periods:
            athlete_data = self._try_api_rankings(name, country, month, year)
            
            if athlete_data:
                # Found athlete in rankings, now get their profile
                userid = athlete_data.get('userId')
                if userid:
                    profile_data = self._try_api_profile(userid, month, year)
                    if profile_data:
                        used_period = (month, year)
                        break
        
        # If API succeeded
        if athlete_data and profile_data:
            print("[API] SUCCESS - Data retrieved via API", file=sys.stderr)
            return {
                'success': True,
                'dataSource': 'api',
                'athleteName': athlete_data.get('name'),
                'country': athlete_data.get('nation') or profile_data['profile'].get('country'),
                'currentRank': athlete_data.get('rank'),
                'points': athlete_data.get('points'),
                'userId': athlete_data.get('userId'),
                'gender': profile_data['profile'].get('gender'),
                'birthYear': profile_data['profile'].get('birthYear'),
                'profilePicUrl': profile_data['profile'].get('profilePicUrl'),
                'competitions': profile_data['competitions'],
                'totalCompetitions': len(profile_data['competitions']),
                'searchPeriod': {
                    'month': used_period[0],
                    'year': used_period[1]
                }
            }
        
        # API returned empty - indicate BrowserUse should be used
        print("[API] No data available via API - BrowserUse fallback recommended", file=sys.stderr)
        return {
            'success': False,
            'dataSource': 'api_empty',
            'message': 'API returned no data, BrowserUse fallback required',
            'searchedName': name,
            'searchedCountry': country,
            'testedPeriods': [f"{datetime(y, m, 1).strftime('%B %Y')}" for m, y in test_periods]
        }


def scrape_taekwondo_athlete(name: str, country: str = None) -> str:
    """
    Command-line interface for the scraper
    Returns JSON string with athlete data
    """
    scraper = TaekwondoScraper()
    result = scraper.get_athlete_data(name, country)
    return json.dumps(result, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    # Test the scraper
    if len(sys.argv) < 2:
        print("Usage: python taekwondo_scraper.py <athlete_name> [country]")
        sys.exit(1)
    
    name = sys.argv[1]
    country = sys.argv[2] if len(sys.argv) > 2 else None
    
    print(scrape_taekwondo_athlete(name, country))
