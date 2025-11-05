import time
import random
from typing import Dict, Optional
import logging
from datetime import datetime, timedelta

class MockCompetitionScraper:
    """
    A mock competition scraper that demonstrates the feature functionality
    This simulates what the real scraper would return while the browser automation is being set up
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Create console handler if not exists
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setLevel(logging.INFO)
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
        
        # Sample competition data based on the actual website structure
        self.sample_competitions = [
            {
                'event': 'Rhine-Ruhr 2025 FISU World University Games',
                'event_url': 'http://worldtkd.simplycompete.com/playerMatchResult/12345',
                'g_rank': 'G-4',
                'date': '17-23 July 2025',
                'location': 'Rhine-Ruhr, Germany',
                'place': '5',
                'points': '8.64'
            },
            {
                'event': 'Charlotte 2025 World Taekwondo Grand Prix Challenge',
                'event_url': 'http://worldtkd.simplycompete.com/playerMatchResult/12346',
                'g_rank': 'G-2',
                'date': '13-15 June 2025',
                'location': 'Charlotte, United States',
                'place': '3',
                'points': '12.40'
            },
            {
                'event': 'Hangzhou 2025 World Taekwondo Championships',
                'event_url': 'http://worldtkd.simplycompete.com/playerMatchResult/12347',
                'g_rank': 'G-1',
                'date': '20-26 May 2025',
                'location': 'Hangzhou, China',
                'place': '1',
                'points': '20.00'
            },
            {
                'event': 'Baku 2025 World Taekwondo Grand Prix',
                'event_url': 'http://worldtkd.simplycompete.com/playerMatchResult/12348',
                'g_rank': 'G-2',
                'date': '15-17 March 2025',
                'location': 'Baku, Azerbaijan',
                'place': '7',
                'points': '6.75'
            },
            {
                'event': 'Paris 2025 World Taekwondo Grand Slam',
                'event_url': 'http://worldtkd.simplycompete.com/playerMatchResult/12349',
                'g_rank': 'G-1',
                'date': '10-12 February 2025',
                'location': 'Paris, France',
                'place': '2',
                'points': '18.50'
            }
        ]
    
    def get_athlete_latest_competition(self, athlete_name: str, userid: str = None) -> Optional[Dict]:
        """
        Mock function that returns sample competition data
        In production, this would be replaced with actual web scraping
        """
        self.logger.info(f"Demonstration scraper: Searching for competitions for athlete: {athlete_name}")
        
        # Simulate search delay
        time.sleep(random.uniform(1, 3))
        
        # Check if athlete name is provided
        if not athlete_name or len(athlete_name.strip()) < 2:
            self.logger.warning("Athlete name too short or empty")
            return None
        
        # Simulate finding competition data for most athletes
        # In practice, about 80% of athletes would have competition data
        if random.random() < 0.8:
            # Return latest 5 competitions with customized data
            competitions = []
            for i, comp in enumerate(self.sample_competitions):
                competition = comp.copy()
                
                # Customize dates to be recent and in order
                days_ago = random.randint(10 + i*30, 40 + i*30)
                recent_date = datetime.now() - timedelta(days=days_ago)
                competition['date'] = recent_date.strftime('%d-%d %B %Y').replace(
                    recent_date.strftime('%d-%d'), 
                    f"{recent_date.day}-{recent_date.day + 2}"
                )
                
                competitions.append(competition)
            
            # Return structure matching the enhanced scraper
            result = {
                'competitions': competitions,
                'total_competitions': len(competitions),
                'latest_competition': competitions[0] if competitions else None,
                'athlete_searched': athlete_name
            }
            
            self.logger.info(f"Demonstration scraper: Found competition data for {athlete_name}")
            return result
        else:
            self.logger.info(f"Demonstration scraper: No competition data found for {athlete_name}")
            return None

# Simple function for the main application
def get_athlete_competition_mock(athlete_name: str, userid: str = None) -> Optional[Dict]:
    """
    Mock competition scraper function for demonstration
    """
    try:
        scraper = MockCompetitionScraper()
        return scraper.get_athlete_latest_competition(athlete_name, userid)
    except Exception as e:
        logging.error(f"Error in mock competition scraper: {str(e)}")
        return None