#!/usr/bin/env python3
"""
Athlete Image Search using GPT-5 with Web Search
Enhanced Python backend for finding and downloading athlete images
"""

import os
import sys
import json
import requests
import argparse
from pathlib import Path
from typing import List, Optional, Dict, Any
from openai import OpenAI

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def search_athlete_images_with_gpt5(
    name: str,
    country: str,
    sport: str,
    details: str = "",
    save_directory: str = "./attached_assets/athlete_images",
    json_output: bool = False
) -> Dict[str, Any]:
    """
    Search for athlete images using GPT-5 with web search capabilities.
    
    Args:
        name: Athlete's name
        country: Athlete's country
        sport: Athlete's sport
        details: Additional biographical details
        save_directory: Directory to save downloaded images
    
    Returns:
        Dictionary with search results and download status
    """
    
    try:
        print(f"🔍 Starting GPT-5 image search for {name} ({sport}, {country})")
        
        # Build comprehensive prompt with all athlete data
        athlete_info = f"Name: {name}\nCountry: {country}\nSport: {sport}"
        if details:
            athlete_info += f"\nDetails: {details}"
        
        prompt = f"""You are an expert image researcher. Search the web to find 3-5 DIRECT downloadable image URLs for this athlete:

{athlete_info}

SEARCH STRATEGY:
1. Search for "{name} {sport} {country}" to find recent athlete photos
2. Look for official sports federation websites and Olympic databases
3. Check Wikipedia Commons and government sports websites
4. Find news articles and sports reporting sites

CRITICAL REQUIREMENTS:
1. Return ONLY direct image URLs that end in .jpg, .png, .webp, .gif
2. Focus on accessible, non-restrictive sources like:
   - Wikipedia Commons images (upload.wikimedia.org)
   - Official Olympic/sports federation sites
   - TheSportsDB.com athlete photos
   - Major news outlets with public images
   - Government and official sports websites

3. AVOID restrictive sources:
   - Social media platforms (Instagram, Facebook, Twitter)
   - Stock photo sites requiring subscriptions
   - Private or protected team websites

4. Use your web search capabilities to find current, accessible images

Return your findings in this JSON format:
{{
  "images": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Athlete_Name.jpg/256px-Athlete_Name.jpg",
    "https://www.thesportsdb.com/images/media/player/thumb/athlete123.jpg"
  ]
}}

Search the web now and return only real, accessible image URLs that can be downloaded."""

        print(f"🤖 Sending request to GPT-5 with web search enabled...")
        
        # Use GPT-5 with web search via Responses API with timeout handling
        import signal
        
        def timeout_handler(signum, frame):
            raise TimeoutError("GPT-5 web search timed out")
        
        # Set a 90-second timeout for GPT-5 web search
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(90)  # 90 seconds
        
        try:
            response = client.responses.create(
                model="gpt-5",
                input=prompt,
                tools=[{"type": "web_search"}]  # Enable web search for GPT-5
            )
        finally:
            signal.alarm(0)  # Cancel the alarm
        
        if not json_output:
            print(f"🔧 GPT-5 response received. Response type: {type(response.output)}")
            print(f"🔧 Response content: {response.output}")
        
        # Handle response output - it might be a list or string
        if isinstance(response.output, list):
            # If it's a list, join the elements or take the first one
            content = ' '.join(str(item) for item in response.output) if response.output else ""
        elif isinstance(response.output, str):
            content = response.output.strip()
        else:
            content = str(response.output)
        
        if not json_output:
            print(f"🔧 Processed content: {content[:200]}...")  # Show first 200 chars
        
        if not content:
            return {"success": False, "error": "Empty response from GPT-5", "downloaded_image": None}
        
        # Parse JSON response
        try:
            # Try to parse as JSON
            result = json.loads(content)
            if "images" in result and isinstance(result["images"], list):
                image_urls = result["images"]
            else:
                # Fallback: extract URLs from text
                import re
                image_urls = re.findall(r'https?://[^\s"\'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"\'<>]*)?', content, re.IGNORECASE)
        except json.JSONDecodeError:
            # Extract URLs from text if JSON parsing fails
            import re
            image_urls = re.findall(r'https?://[^\s"\'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"\'<>]*)?', content, re.IGNORECASE)
        
        if not image_urls:
            return {"success": False, "error": "No image URLs found in GPT-5 response", "downloaded_image": None}
        
        if not json_output:
            print(f"🎯 GPT-5 found {len(image_urls)} image URLs for {name}")
            for i, url in enumerate(image_urls, 1):
                print(f"📋 Image URL {i}: {url}")
        
        # Try to download the first working image
        downloaded_image = download_first_working_image(image_urls, name, save_directory, json_output)
        
        if downloaded_image:
            return {
                "success": True, 
                "downloaded_image": downloaded_image,
                "total_urls_found": len(image_urls),
                "athlete_name": name
            }
        else:
            return {
                "success": False, 
                "error": "All image downloads failed - URLs may be protected or inaccessible",
                "downloaded_image": None,
                "total_urls_found": len(image_urls),
                "athlete_name": name
            }
            
    except Exception as e:
        if not json_output:
            print(f"❌ Error in GPT-5 image search: {str(e)}")
        return {"success": False, "error": f"Search failed: {str(e)}", "downloaded_image": None}

def download_first_working_image(
    image_urls: List[str], 
    athlete_name: str, 
    save_directory: str,
    json_output: bool = False,
    max_retries: int = 3
) -> Optional[str]:
    """
    Download the first working image from a list of URLs.
    
    Args:
        image_urls: List of image URLs to try
        athlete_name: Name of athlete for filename
        save_directory: Directory to save the image
        max_retries: Maximum retry attempts per URL
    
    Returns:
        Local path to downloaded image or None if all failed
    """
    
    # Create save directory if it doesn't exist
    save_path = Path(save_directory)
    save_path.mkdir(parents=True, exist_ok=True)
    
    for i, url in enumerate(image_urls, 1):
        if not json_output:
            print(f"📥 Attempting to download image {i}/{len(image_urls)}: {url}")
        
        for attempt in range(1, max_retries + 1):
            try:
                # Enhanced headers to bypass common restrictions
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Referer': 'https://www.google.com/',
                    'Sec-Fetch-Dest': 'image',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Site': 'cross-site'
                }
                
                print(f"🔍 Download attempt {attempt}/{max_retries} for {url}")
                
                response = requests.get(
                    url, 
                    headers=headers, 
                    timeout=30,
                    allow_redirects=True,
                    stream=True
                )
                
                if response.status_code != 200:
                    print(f"❌ HTTP {response.status_code}: {response.reason}")
                    if attempt == max_retries:
                        break  # Try next URL
                    continue
                
                # Check content type
                content_type = response.headers.get('content-type', '').lower()
                print(f"📋 Content-Type: {content_type}")
                
                if not content_type.startswith('image/') and 'octet-stream' not in content_type:
                    print(f"❌ Not an image: {content_type}")
                    break  # Try next URL (no point retrying)
                
                # Check content length
                content_length = response.headers.get('content-length')
                if content_length and int(content_length) < 1000:
                    print(f"❌ Image too small: {content_length} bytes")
                    break  # Try next URL
                
                # Generate filename
                sanitized_name = "".join(c for c in athlete_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
                sanitized_name = sanitized_name.replace(' ', '_').lower()
                
                # Determine file extension
                extension = 'jpg'
                if content_type.startswith('image/'):
                    ext_mapping = {
                        'image/jpeg': 'jpg',
                        'image/jpg': 'jpg', 
                        'image/png': 'png',
                        'image/webp': 'webp',
                        'image/gif': 'gif'
                    }
                    extension = ext_mapping.get(content_type, 'jpg')
                
                import time
                timestamp = int(time.time())
                filename = f"{sanitized_name}_{timestamp}.{extension}"
                file_path = save_path / filename
                
                # Download and save
                print(f"💾 Saving image to: {file_path}")
                with open(file_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                
                # Verify the file was saved and has content
                if file_path.exists() and file_path.stat().st_size > 1000:
                    relative_path = f"/attached_assets/athlete_images/{filename}"
                    print(f"✅ Successfully downloaded image: {relative_path}")
                    return relative_path
                else:
                    print(f"❌ Downloaded file is too small or doesn't exist")
                    if file_path.exists():
                        file_path.unlink()  # Delete invalid file
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ Download error (attempt {attempt}): {e}")
                if attempt == max_retries:
                    break  # Try next URL
                
            except Exception as e:
                print(f"❌ Unexpected error (attempt {attempt}): {e}")
                if attempt == max_retries:
                    break  # Try next URL
        
        print(f"⚠️ All attempts failed for URL {i}, trying next URL...")
    
    print(f"❌ All image downloads failed for {athlete_name}")
    return None

def main():
    """Command line interface for the image search script."""
    parser = argparse.ArgumentParser(description='Search and download athlete images using GPT-5')
    parser.add_argument('--name', required=True, help='Athlete name')
    parser.add_argument('--country', required=True, help='Athlete country')
    parser.add_argument('--sport', required=True, help='Athlete sport')
    parser.add_argument('--details', default='', help='Additional details about the athlete')
    parser.add_argument('--save-dir', default='./attached_assets/athlete_images', help='Directory to save images')
    parser.add_argument('--json-output', action='store_true', help='Output results as JSON')
    
    args = parser.parse_args()
    
    # Perform the search
    result = search_athlete_images_with_gpt5(
        name=args.name,
        country=args.country,
        sport=args.sport,
        details=args.details,
        save_directory=args.save_dir,
        json_output=args.json_output
    )
    
    if args.json_output:
        print(json.dumps(result, indent=2))
    else:
        if result["success"]:
            print(f"✅ Success! Downloaded image: {result['downloaded_image']}")
        else:
            print(f"❌ Failed: {result['error']}")
    
    return 0 if result["success"] else 1

if __name__ == "__main__":
    sys.exit(main())