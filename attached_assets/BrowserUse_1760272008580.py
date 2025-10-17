from browser_use_sdk import BrowserUse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
Browser_API_KEY = os.getenv("BROWSERUSE_API")

# Define date and person info
TODAY = "2025-10-10"

PERSON = {
    "name": "Aya SHEHAT",
    "Sport": "Taekwondo",
    "Weight": "W-67",
    "Nationality": "Egypt"
}

# Initialize BrowserUse client
client = BrowserUse(api_key=Browser_API_KEY)

# Create the browser-use task
task = client.tasks.create_task(
    llm="gemini-flash-latest",
    task=f"""
    You are a rank and competitive history extractor for Taekwondo players.

    Find the competitive history and current rank of the Taekwondo player:
    {PERSON['name']}.

    They play for {PERSON['Nationality']} and compete in the {PERSON['Weight']} category.
    Make sure you select the correct category on the World Taekwondo site:
    https://worldtkd.simplycompete.com/playerRankingV2?limit=25&pageNo=1&month=9&year=2025&rankingCategoryId=11ef3918-68c6-28dd-8999-023374a4dcc1&subCategory1=11ef3918-30a6-2db9-8999-023374a4dcc1&rankingTypeId=11ef3916-58d3-484e-8999-023374a4dcc1

    Instructions to navigate the site:
    1-Select weight category (most important)
    2-Write name
    3-Click search
    4-Click player profile
    5-Fetch info
    

    - Current World Rank and Olympic rank
    - Ranking Points
    - List of the most recent competitions (name, date, position) and finish in each competition.
    - List competitions from most recent to later.

    After you're done visiting the simplycompete site, google the player and visit their taekwondodata profile (Should appear in search), and continue the player's competitive history based off of the ones you found in simplycompete site.


    """
)

# Complete the task
result = task.complete()

# Display structured results
print("\n--- RESULTS ---\n")
print(result.output)
