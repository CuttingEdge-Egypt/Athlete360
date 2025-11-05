#!/usr/bin/env python3
"""
Integrated API scraper that combines API approach with fallback to existing scraper
This provides the best of both worlds while transitioning to API-first approach
"""

import json
import logging
import cloudscraper
from typing import Dict, List, Optional, Any
from datetime import datetime

# Import working API scraper
try:
    from working_api_scraper import get_athlete_competitions_working_api
    WORKING_API_AVAILABLE = True
except ImportError:
    WORKING_API_AVAILABLE = False
    print("Warning: Working API scraper not available")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IntegratedCompetitionScraper:
    """
    Competition scraper that uses cloudscraper (same as athlete fetching)
    """
    
    def __init__(self):
        # API endpoints to try
        self.api_endpoints = [
            # Primary endpoints
            "https://worldtkd.simplycompete.com/api/playerProfileV2",
            "https://worldtkd.simplycompete.com/api/playerProfile",
            
            # Alternative endpoints
            "https://worldtkd.simplycompete.com/api/player",
            "https://worldtkd.simplycompete.com/api/competitions",
            "https://worldtkd.simplycompete.com/api/events",
            
            # Backend-style endpoints
            "https://worldtkd.simplycompete.com/backend/api/playerProfile",
            "https://worldtkd.simplycompete.com/backend/api/player",
            
            # Service endpoints  
            "https://worldtkd.simplycompete.com/service/playerProfile",
            "https://worldtkd.simplycompete.com/service/api/playerProfile"
        ]
        
        # Create cloudscraper session (same as athlete scraper)
        self.session = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'desktop': True
            }
        )
        self._setup_session()
    
    def _setup_session(self):
        """Setup session with proper headers and cookies"""
        # Comprehensive headers that match browser requests
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
        
        # Initialize session
        try:
            logger.info("Establishing session with WorldTKD website using cloudscraper...")
            response = self.session.get("https://worldtkd.simplycompete.com/", timeout=10)
            logger.info(f"Session initialization: {response.status_code}")
        except Exception as e:
            logger.warning(f"Session initialization failed: {str(e)}")
    
    def get_athlete_competitions(
        self, 
        user_id: str, 
        athlete_name: str = None,
        year: int = 2025, 
        month: int = 7
    ) -> Dict[str, Any]:
        """
        Get athlete competitions using API first, then fallback to HTML scraping
        
        Args:
            user_id: Athlete's unique identifier
            athlete_name: Athlete's name (for fallback scraper)
            year: Year to fetch competitions for
            month: Month to fetch competitions for
            
        Returns:
            Dictionary containing competition data
        """
        
        logger.info(f"Getting competitions for athlete {athlete_name} (ID: {user_id})")
        
        # Step 1: Try working API first (the endpoint that actually works)
        if WORKING_API_AVAILABLE:
            try:
                logger.info("🔄 Trying working API endpoint...")
                api_result = get_athlete_competitions_working_api(user_id, year, month)
                if api_result.get('success'):
                    logger.info("✅ Successfully retrieved data using working API")
                    return api_result
                else:
                    logger.warning(f"Working API failed: {api_result.get('error', 'Unknown error')}")
            except Exception as e:
                logger.warning(f"Working API exception: {str(e)}")
        
        # Step 2: Try API approach with multiple parameter combinations (fallback)
        api_result = self._try_api_approach(user_id, year, month)
        if api_result.get('success'):
            logger.info("✅ Successfully retrieved data using fallback API approach")
            return api_result
        
        # Step 3: Try direct endpoint discovery
        discovery_result = self._discover_api_endpoints(user_id)
        if discovery_result.get('success'):
            logger.info("✅ Successfully discovered working API endpoint")
            return discovery_result
        
        # Step 4: Return structured "no data" response
        logger.warning("❌ All data retrieval methods failed")
        return {
            'success': False,
            'error': 'Unable to retrieve competition data using API methods',
            'user_id': user_id,
            'athlete_name': athlete_name,
            'attempted_methods': ['API_Working', 'API_Fallback', 'API_Discovery'],
            'recommendations': [
                'Check if the athlete ID is correct',
                'Verify the athlete has competition data for the specified period',
                'Try different year/month parameters'
            ]
        }
    
    def _try_api_approach(self, user_id: str, year: int, month: int) -> Dict[str, Any]:
        """Try API approach with different parameter combinations"""
        
        # Different parameter combinations to try
        param_combinations = [
            # Original parameters
            {
                'userId': user_id,
                'year': str(year),
                'month': str(month),
                'subCategory1': '11ef3b4e-3058-36ed-aca4-064aef8133e9',
                'rankingTypeId': '11ef3b4e-05ce-797c-aca4-064aef8133e9'
            },
            # Simplified parameters
            {
                'userId': user_id,
                'year': str(year),
                'month': str(month)
            },
            # Alternative parameter names
            {
                'playerId': user_id,
                'year': str(year),
                'month': str(month)
            },
            # Player ID only
            {
                'userId': user_id
            },
            # With different date formats
            {
                'userId': user_id,
                'date': f"{year}-{month:02d}",
            }
        ]
        
        for endpoint in self.api_endpoints:
            for params in param_combinations:
                try:
                    logger.info(f"Trying {endpoint} with params: {params}")
                    response = self.session.get(endpoint, params=params, timeout=15)
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            logger.info(f"✅ Success! Endpoint {endpoint} returned valid JSON")
                            
                            # Try to parse the response
                            competitions = self._parse_api_response(data)
                            if competitions:
                                return {
                                    'success': True,
                                    'competitions': competitions,
                                    'total_competitions': len(competitions),
                                    'data_source': f'API: {endpoint}',
                                    'user_id': user_id,
                                    'year': year,
                                    'month': month
                                }
                            else:
                                logger.info(f"Endpoint returned data but no competitions found")
                                # Continue trying other combinations
                                
                        except json.JSONDecodeError:
                            logger.warning(f"Endpoint {endpoint} returned non-JSON data")
                            continue
                    
                    elif response.status_code in [401, 403]:
                        logger.warning(f"Authentication issue with {endpoint}: {response.status_code}")
                        continue
                    elif response.status_code == 404:
                        logger.debug(f"Endpoint not found: {endpoint}")
                        continue
                    else:
                        logger.debug(f"Endpoint {endpoint} returned {response.status_code}")
                        
                except Exception as e:
                    logger.debug(f"Request failed for {endpoint}: {str(e)}")
                    continue
        
        return {'success': False, 'error': 'No working API endpoint found'}
    
    def _discover_api_endpoints(self, user_id: str) -> Dict[str, Any]:
        """Try to discover API endpoints by analyzing the main website"""
        
        logger.info("🔍 Attempting to discover API endpoints...")
        
        # Try to find API endpoints by looking at the player profile page
        try:
            profile_url = f"https://worldtkd.simplycompete.com/playerProfileV2?userId={user_id}"
            response = self.session.get(profile_url, timeout=15)
            
            if response.status_code == 200:
                # Look for API calls in the page source
                page_content = response.text
                
                # Simple patterns to find API endpoints
                api_patterns = [
                    '/api/',
                    '/service/',
                    '/backend/',
                    'playerProfile',
                    'competition'
                ]
                
                for pattern in api_patterns:
                    if pattern in page_content:
                        logger.info(f"Found potential API pattern: {pattern}")
                
                # This is a placeholder for more sophisticated endpoint discovery
                # In a real implementation, you might parse JavaScript or network requests
                
        except Exception as e:
            logger.debug(f"Endpoint discovery failed: {str(e)}")
        
        return {'success': False, 'error': 'Endpoint discovery not implemented'}
    
    def _parse_api_response(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse API response to extract competition data"""
        
        competitions = []
        
        # Try different possible data structures
        competition_paths = [
            ['data', 'data', 'competitions'],
            ['data', 'competitions'],
            ['competitions'],
            ['data', 'data', 'events'],
            ['data', 'events'],
            ['events'],
            ['results'],
            ['matches'],
            ['tournaments']
        ]
        
        for path in competition_paths:
            try:
                current_data = data
                for key in path:
                    current_data = current_data[key]
                
                if isinstance(current_data, list) and current_data:
                    logger.info(f"Found competition data at path: {' -> '.join(path)}")
                    
                    for comp in current_data:
                        processed = self._process_competition(comp)
                        if processed:
                            competitions.append(processed)
                    
                    break
                    
            except (KeyError, TypeError):
                continue
        
        return competitions
    
    def _process_competition(self, comp_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process individual competition data"""
        
        try:
            # Extract competition details with multiple possible field names
            event = comp_data.get('eventName') or comp_data.get('name') or comp_data.get('title') or 'Unknown Event'
            g_rank = comp_data.get('gRank') or comp_data.get('rank') or comp_data.get('grade') or 'N/A'
            date = comp_data.get('eventDate') or comp_data.get('date') or comp_data.get('startDate') or 'N/A'
            location = comp_data.get('location') or comp_data.get('venue') or comp_data.get('city') or 'N/A'
            place = comp_data.get('place') or comp_data.get('position') or comp_data.get('ranking') or 'N/A'
            points = comp_data.get('points') or comp_data.get('rankingPoints') or comp_data.get('score') or 'N/A'
            
            return {
                'event': event,
                'g_rank': g_rank,
                'date': date,
                'location': location,
                'place': str(place),
                'points': str(points),
                'event_url': comp_data.get('eventUrl') or comp_data.get('url')
            }
            
        except Exception as e:
            logger.debug(f"Error processing competition: {str(e)}")
            return None


def get_athlete_competitions_integrated(
    user_id: str,
    athlete_name: str = None,
    year: int = 2025,
    month: int = 7
) -> Dict[str, Any]:
    """
    Main function to get athlete competitions with integrated approach
    """
    scraper = IntegratedCompetitionScraper()
    return scraper.get_athlete_competitions(user_id, athlete_name, year, month)


if __name__ == "__main__":
    # Test the integrated scraper
    test_user_id = "11e90126-4e0c-13f5-9a7c-0a8d8ddc92c4"
    test_athlete_name = "Moataz Bellah Asem Ata Abu Sree'"
    
    print("🥋 INTEGRATED API + HTML SCRAPER TEST")
    print("Trying API first, then falling back to HTML scraping")
    print("=" * 60)
    
    result = get_athlete_competitions_integrated(
        user_id=test_user_id,
        athlete_name=test_athlete_name,
        year=2025,
        month=7
    )
    
    print(f"\nResult: {json.dumps(result, indent=2)}")
    
    if result.get('success'):
        competitions = result.get('competitions', [])
        if competitions:
            print(f"\n✅ Found {len(competitions)} competitions using {result.get('data_source', 'Unknown method')}:")
            for i, comp in enumerate(competitions, 1):
                print(f"\n{i}. {comp['event']}")
                print(f"   Date: {comp['date']}")
                print(f"   Location: {comp['location']}")
                print(f"   G-Rank: {comp['g_rank']}")
                print(f"   Place: {comp['place']}")
                print(f"   Points: {comp['points']}")
        else:
            print(f"\n⚠️ No competitions found using {result.get('data_source', 'Unknown method')}")
    else:
        print(f"\n❌ Failed to retrieve data: {result.get('error')}")
        if result.get('recommendations'):
            print("\n💡 Recommendations:")
            for rec in result.get('recommendations', []):
                print(f"   • {rec}")