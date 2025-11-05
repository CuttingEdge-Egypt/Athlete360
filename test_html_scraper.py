#!/usr/bin/env python3
"""Test HTML scraping from World Taekwondo website"""

import requests
from bs4 import BeautifulSoup
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_world_taekwondo_html():
    """Test scraping from the official World Taekwondo website"""
    
    # Test URL - let's see what the actual website structure is
    base_url = "https://www.worldtaekwondo.org/ranking/world-rankings"
    
    logger.info(f"Testing: {base_url}")
    
    try:
        response = requests.get(base_url, timeout=15)
        logger.info(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Save HTML for inspection
            with open('worldtaekwondo_page.html', 'w', encoding='utf-8') as f:
                f.write(soup.prettify())
            logger.info("✅ Saved HTML to worldtaekwondo_page.html")
            
            # Look for ranking list elements
            ranking_list = soup.find('div', class_='ranking_list')
            logger.info(f"Found ranking_list div: {ranking_list is not None}")
            
            # Look for athlete rows
            athlete_rows = soup.find_all('div', class_='athlete_row')
            logger.info(f"Found {len(athlete_rows)} athlete_row divs")
            
            # Try other common class names
            tables = soup.find_all('table')
            logger.info(f"Found {len(tables)} tables")
            
            # Search for "rank" in the HTML
            rank_elements = soup.find_all(text=lambda text: text and 'rank' in text.lower())
            logger.info(f"Found {len(rank_elements)} elements with 'rank' text (first 5):")
            for elem in rank_elements[:5]:
                logger.info(f"  - {elem.strip()[:100]}")
            
            # Look for forms or selects (might be filters)
            selects = soup.find_all('select')
            logger.info(f"\nFound {len(selects)} select elements:")
            for select in selects[:3]:
                logger.info(f"  - {select.get('name', 'unnamed')}: {select.get('id', 'no-id')}")
            
            return True
        else:
            logger.error(f"Failed to fetch page: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("="*70)
    print("TESTING WORLD TAEKWONDO HTML SCRAPING")
    print("="*70)
    print()
    
    test_world_taekwondo_html()
