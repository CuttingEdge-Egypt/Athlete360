#!/usr/bin/env python3
"""
Standalone script to fetch competitive history across multiple months in parallel.
Called by Node.js service with userId and category summary.
"""

import argparse
import json
import logging
import sys
from athlete_lookup import fetch_competitive_history_parallel

# Configure logging to stderr to avoid corrupting JSON output on stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr  # CRITICAL: Log to stderr, not stdout
)
logger = logging.getLogger(__name__)


def progress_callback(progress_data):
    """
    Callback function to report progress back to Node.js.
    Emits progress markers on stderr (not stdout) to avoid JSON corruption.
    """
    # Emit progress marker that Node can parse from stderr
    print(
        f"PROGRESS:{progress_data['completed']}/{progress_data['total']}",
        file=sys.stderr,
        flush=True
    )


def main():
    parser = argparse.ArgumentParser(
        description="Fetch competitive history for athlete across multiple months"
    )
    parser.add_argument(
        "--user-id",
        required=True,
        help="World Taekwondo athlete userId"
    )
    parser.add_argument(
        "--category-summary",
        required=True,
        help="JSON string of category summary from initial API call"
    )
    parser.add_argument(
        "--months-back",
        type=int,
        default=16,
        help="Number of months to fetch (default: 16 for API limit)"
    )
    parser.add_argument(
        "--delay",
        type=int,
        default=2,
        help="Delay between API requests in seconds"
    )
    
    args = parser.parse_args()
    
    # Parse category summary from JSON string
    try:
        category_summary = json.loads(args.category_summary)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse category_summary JSON: {e}")
        print(json.dumps({
            "success": False,
            "error": f"Invalid category_summary JSON: {e}"
        }))
        sys.exit(1)
    
    logger.info(f"🏃 Fetching competitive history for userId: {args.user_id}")
    logger.info(f"📊 Categories: {len(category_summary)}")
    logger.info(f"📅 Months: {args.months_back}")
    
    try:
        # Call the main function with progress callback
        competitive_history = fetch_competitive_history_parallel(
            user_id=args.user_id,
            category_summary=category_summary,
            delay=args.delay,
            months_back=args.months_back,
            progress_callback=progress_callback
        )
        
        # Prepare result
        result = {
            "success": True,
            "competitive_history": competitive_history,
            "total_calls": args.months_back * len(category_summary),
            "total_competitions": len(competitive_history)
        }
        
        # Output ONLY the JSON result to stdout (all logs went to stderr)
        print(json.dumps(result), flush=True)
        
    except Exception as e:
        logger.error(f"❌ Error fetching competitive history: {e}")
        result = {
            "success": False,
            "error": str(e),
            "competitive_history": []
        }
        print(json.dumps(result), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
