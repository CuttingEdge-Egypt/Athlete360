import os
import time
import json
import asyncio
import google.generativeai as genai
import requests

from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=API_KEY)

generation_config = {
    "temperature": 0,
    "max_output_tokens": 8192,
    "response_mime_type": "application/json",
}

generation_config_match = {
    "temperature": 0.2,
    "max_output_tokens": 8192,
    "response_mime_type": "application/json",
}

model = genai.GenerativeModel(
    model_name="gemini-2.5-pro",
    generation_config=generation_config,
)
model_match = genai.GenerativeModel(
    model_name="gemini-2.5-pro",
    generation_config=generation_config_match,
)


async def upload_to_gemini(video_file_name, mime_type=None):
    """Asynchronously upload file to Gemini"""

    def _upload():
        print(f"Uploading file...")
        video_file = genai.upload_file(path=video_file_name)
        print(f"Completed upload: {video_file.uri}")

        while video_file.state.name == "PROCESSING":
            print(".", end="")
            time.sleep(10)
            video_file = genai.get_file(video_file.name)

        if video_file.state.name == "FAILED":
            raise ValueError(video_file.state.name)

        return video_file

    return await asyncio.to_thread(_upload)


async def process_video_gemini(video_file_name, round_to_analyze: int):
    """Process video using Gemini"""
    
    # Prompts are now defined within the function to use the round_to_analyze parameter
    prompt_kick_no=f"Count the number of kicks for each player in round {round_to_analyze}. Include Actual player names. Start with the blue player then the red player."
    prompt_kick_no+='''
    Output Format:
    {
    "players": [
    {
    "name": "Player Name",
    "kicks": [
    {
    "total_kick_number": X
    }
    }
    '''

    prompt_yellowcards="This is a taekwondo match, following taekwondo rules. By looking at the scoreboard and watching when the referee gives a warning or 'yellow card' to a player, list all yellow cards. Start with the blue player then the red player. Include Actual player names."
    prompt_yellowcards+='''
    Output Format:
    {
    "players": [
    {
    "name": "Player Name",
    "Yellow_cards": [
    {
    "timestamp": "HH:MM:SS",
    "Amount": X
    }
    ],
    "total_yellows": X
    }
    '''
    
    prompt_punch=f"Watch round {round_to_analyze} only. "
    prompt_punch+='''
    Watch this taekwondo match and tell me when a player performed a punch, a punch is when a player clenches their fist and tries to hit another player. If there are no punches found let the JSON be NONE.
    Start with the blue player then the red player. Include Actual player names.
    Output Format:
    {
    "players": [
    {
    "name": "Player Name",
    "Punch": [
    {
    "timestamp": "HH:MM:SS",
    "score": X
    }
    ],
    "total_punches": X
    }'''
    
    prompt_matchsore='''Identify when a player scored using the scoreboard. Include Actual player names.
    Start with the blue player then the red player. Focus on the scoreboard change for better accuracy. Listen to commentators they will help you reference which kicked scored how many points. Include final match score (from scoreboard) in the summary.
    Output Format:
    {
    "players": [
    {
    "name": "Player Name",
    "kicks": [
    {
    "timestamp": "HH:MM:SS",
    "score": X
    }
    ],
    "total_kicks": X,
    "total_points": X
    }
    ],
    "summary": {
    "total_match_score_blue": X,
    "total_match_score_red": X
    }
    }'''
    
    prompt_match=f'''
    Write me a match Analysis of what happened in round {round_to_analyze} in technical terms. Include the story of the round. 
    Start with the blue player then the red player.
    Listen to any insights the commentator might have. Here is a template:
    Match Score:
    Give me the final score of the match.
    Kick Count & Types:
    This analysis is limited by the fast action and occasional obscured views, but here are some highlights. Precise numbers are hard to determine but I will use as many markers as possible.
    S. Oksana (Russia): She favored dynamic and varied techniques.
    Count of spinning kicks: She uses them a lot so (15) to attempt to win but M. Nadine guards well with her arms.
    Number of front kicks: Her foot is shown and visible so about (10) times
    M. Nadine (Egypt): More deliberate, precise kicks that are strategic in nature to help win over S. Oksana.
    Count of Round housekicks: She wins over S. Oksana a lot with this method at (10)
    Number of Tipi-chaji: She is known to use them when to hurt in specific areas like the torso/Hogo as said by the commentator in the video. Approximately at (3) times.
    Punch Count:
    Mention if there were any punches in the match
    Match Brief & Technical Analysis:
    The match showed a contest between two different approach styles to taekwondo. For S. Oksana a dynamic spinning wheel kick was used to start in a dominating fashion where she could score.
    Nadine was in red, however, showed a different approach more measured, as she used round house kicks to gain some points during the match.
    Strategic Adaptation: S. Oksana a hard hit but Nadine can react and plan better.
    Key Moments/Commentator Note:
    Tipi-chaji: Nadine is known to use them as said by the commentator. She also knew how to strike specific zones (torso/hogo) with roundhouse kicks, while protecting her head and body.
    Summary:
    Nadine won since she guarded and had a better tactic which is why the numbers are different and favored to her. It is important to guard as well since the opponent will hurt your head as well.
    Hopefully, this provides better accuracy and is better than previous one.

    Take your time in processing to make sure the results are accurate.
    Make sure you're not scanning the yellow card as an actual score.'''

    video_file = await upload_to_gemini(video_file_name)

    # Generate all analyses for the given video file
    response_match_analysis = await asyncio.to_thread(
        lambda: model_match.generate_content(
            [video_file, prompt_match], request_options={"timeout": 40000}
        )
    )
    response_matchscore = await asyncio.to_thread(
        lambda: model.generate_content(
            [video_file, prompt_matchsore], request_options={"timeout": 40000}
        )
    )
    response_punch = await asyncio.to_thread(
        lambda: model.generate_content(
            [video_file, prompt_punch], request_options={"timeout": 40000}
        )
    )
    response_kick_no = await asyncio.to_thread(
        lambda: model.generate_content(
            [video_file, prompt_kick_no], request_options={"timeout": 40000}
        )
    )
    response_yellowcards = await asyncio.to_thread(
        lambda: model.generate_content(
            [video_file, prompt_yellowcards], request_options={"timeout": 40000}
        )
    )
    
    # Return the processed results and the video file object for later deletion
    return (
        video_file, 
        json.loads(response_match_analysis.text), 
        json.loads(response_matchscore.text), 
        json.loads(response_punch.text), 
        json.loads(response_kick_no.text), 
        json.loads(response_yellowcards.text)
    )