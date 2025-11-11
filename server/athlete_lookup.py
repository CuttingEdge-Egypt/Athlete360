"""
Helper utilities for retrieving Taekwondo athlete ranking and competition history.

This module wraps the `TaekwondoScraper` so that other projects can call a single
function to gather an athlete's rank alongside their competitive record without
having to manage scraper configuration or Cloudflare session handling.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from scraper import TaekwondoScraper

logger = logging.getLogger(__name__)

DEFAULT_RANKING_CATEGORY = "World Kyorugi Rankings"
DEFAULT_SUB_CATEGORY = "World Senior Division"
MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]


def _normalize(text: Optional[str]) -> str:
    """Normalize text for case-insensitive comparisons, removing hyphens and special characters."""
    import re
    if not text:
        return ""
    # Convert to lowercase, remove hyphens, and remove other non-alphanumeric chars except spaces
    normalized = text.strip().lower()
    normalized = normalized.replace("-", "").replace("_", "")
    # Remove extra spaces
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized.strip()


def _parse_category_fields(category_name: str) -> Optional[Dict[str, str]]:
    """Extract weight division, sub-category, and ranking category from formatted string."""
    if not category_name:
        return None

    parts = [segment.strip() for segment in category_name.split("|")]
    if len(parts) != 3:
        return None

    weight_division, sub_category, ranking_category = parts
    return {
        "weight_division": weight_division,
        "sub_category": sub_category,
        "ranking_category": ranking_category,
    }


def _generate_month_year_pairs(months_back: int) -> List[Dict[str, int]]:
    """Generate month/year pairs counting backwards from current month."""
    results: List[Dict[str, int]] = []
    current = datetime.now().replace(day=1)

    for _ in range(max(months_back, 1)):
        results.append(
            {
                "month": current.month,
                "month_index": current.month - 1,
                "year": current.year,
            }
        )

        year = current.year
        month = current.month - 1
        if month == 0:
            month = 12
            year -= 1

        current = current.replace(year=year, month=month)

    return results


def _build_rank_timeline(
    base_scraper: TaekwondoScraper,
    matcher: Callable[[List[Dict[str, Any]]], Optional[Dict[str, Any]]],
    athlete_name: str,
    country: Optional[str],
    category_summary: List[Dict[str, Any]],
    months_back: int,
) -> List[Dict[str, Any]]:
    """Fetch ranking snapshots across categories and historical months."""
    if months_back <= 0 or not category_summary:
        return []

    timeline_results: List[Dict[str, Any]] = []
    timeline_scraper = TaekwondoScraper()
    timeline_scraper.logger.setLevel(logging.WARNING)

    month_year_pairs = _generate_month_year_pairs(months_back)

    for category_entry in category_summary:
        parsed = _parse_category_fields(category_entry.get("category_name", ""))
        if not parsed:
            continue

        ranking_category = parsed["ranking_category"]
        sub_category = parsed["sub_category"]
        weight_division = parsed["weight_division"]

        if ranking_category not in timeline_scraper.ranking_type_mappings:
            continue
        if sub_category not in timeline_scraper.sub_category_mappings:
            continue

        if sub_category == "Olympic Senior Division":
            weight_mapping = timeline_scraper.olympic_weight_mappings
        else:
            weight_mapping = timeline_scraper.world_weight_mappings

        if weight_division not in weight_mapping:
            continue

        for period in month_year_pairs:
            month_index = period.get("month_index")
            if month_index is None or not (0 <= month_index < len(MONTH_NAMES)):
                continue

            month_name = MONTH_NAMES[month_index]
            year_value = period.get("year")

            try:
                timeline_scraper.configure(
                    ranking_category=ranking_category,
                    sub_category=sub_category,
                    weight_division=weight_division,
                    country_filter=country,
                    athlete_filter=None,
                    month=month_name,
                    year=year_value,
                    max_results=0,
                    delay=base_scraper.delay,
                )
                rankings_snapshot = timeline_scraper.scrape_data()
            except Exception as exc:  # noqa: BLE001
                timeline_results.append(
                    {
                        "category": category_entry.get("category_name"),
                        "month": month_name,
                        "year": year_value,
                        "error": str(exc),
                    }
                )
                continue

            match_entry = matcher(rankings_snapshot)
            timeline_results.append(
                {
                    "category": category_entry.get("category_name"),
                    "month": month_name,
                    "year": year_value,
                    "ranking": match_entry.get("ranking") if match_entry else None,
                    "points": match_entry.get("points") if match_entry else None,
                    "change": match_entry.get("change") if match_entry else None,
                }
            )

    return timeline_results


def get_athlete_rank_and_history(
    athlete_name: str,
    country: Optional[str],
    weight_division: str,
    *,
    ranking_category: str = DEFAULT_RANKING_CATEGORY,
    sub_category: str = DEFAULT_SUB_CATEGORY,
    month: Optional[str] = None,
    year: Optional[int] = None,
    months_back: int = 12,
    max_results: int = 100,
    delay: int = 2,
    rank_history_months: int = 0,
) -> Dict[str, Any]:
    """
    Fetch an athlete's current ranking along with their competition history.

    Args:
        athlete_name: Full name of the athlete to match against rankings.
        country: Optional country name (exact match to World Taekwondo listing).
        weight_division: Weight division (e.g. ``"M-54 kg"``).
        ranking_category: Ranking category to query. Defaults to World rankings.
        sub_category: Sub-category within the ranking (e.g. Senior Division).
        month: Optional month name to target (defaults to scraper's fallback).
        year: Optional year for the rankings snapshot.
        months_back: How many months of competition history to attempt.
        max_results: Maximum number of ranked athletes to keep after filtering.
        delay: Delay between API calls to respect Cloudflare throttling.

    Returns:
        A dictionary with keys:
            ``success`` (bool): Whether the lookup succeeded.
            ``athlete`` (dict): Athlete record pulled from rankings.
            ``competition_history`` (list): Events fetched for the athlete.
            ``metadata`` (dict): Extra details about the lookup process.
            ``error`` (str, optional): Present when success is False.
    """

    if not athlete_name:
        raise ValueError("athlete_name is required")
    if not weight_division:
        raise ValueError("weight_division is required")

    scraper = TaekwondoScraper()
    scraper.configure(
        ranking_category=ranking_category,
        sub_category=sub_category,
        weight_division=weight_division,
        country_filter=None,
        athlete_filter=None,
        month=month,
        year=year,
        max_results=max_results,
        delay=delay,
    )

    try:
        rankings = scraper.scrape_data()
    except Exception as exc:
        logger.exception("Failed to scrape rankings for %s: %s", athlete_name, exc)
        return {
            "success": False,
            "error": f"Failed to scrape rankings: {exc}",
            "metadata": {
                "athlete_name": athlete_name,
                "country": country,
                "weight_division": weight_division,
                "ranking_category": ranking_category,
                "sub_category": sub_category,
                "month": month,
                "year": year,
            },
        }

    normalized_target_name = _normalize(athlete_name)
    normalized_target_country = _normalize(country)

    def _is_match(entry: Dict[str, Any]) -> bool:
        entry_name = _normalize(entry.get("name") or entry.get("athlete_name"))
        entry_country = _normalize(entry.get("country"))

        if normalized_target_name:
            if entry_name != normalized_target_name and normalized_target_name not in entry_name:
                return False

        if normalized_target_country and normalized_target_country != entry_country:
            return False
        return True

    def _ranking_value(entry: Dict[str, Any]) -> float:
        raw_rank = entry.get("ranking")
        try:
            if raw_rank is None or raw_rank == "":
                return float("inf")
            return float(raw_rank)
        except (TypeError, ValueError):
            return float("inf")

    def _select_best_entry(entries: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        matched = [entry for entry in entries if _is_match(entry)]
        if not matched:
            return None
        return sorted(matched, key=_ranking_value)[0]

    athlete_record = _select_best_entry(rankings)

    if not athlete_record:
        logger.warning(
            "No athletes matched name '%s' country '%s' in %s / %s (%s %s)",
            athlete_name,
            country,
            ranking_category,
            sub_category,
            month,
            year,
        )
        failure_response = {
            "success": False,
            "error": "Athlete not found in current rankings",
            "metadata": {
                "athlete_name": athlete_name,
                "country": country,
                "weight_division": weight_division,
                "ranking_category": ranking_category,
                "sub_category": sub_category,
                "month": month,
                "year": year,
                "rankings_returned": len(rankings),
            },
        }
        if rankings:
            failure_response["metadata"]["available_athletes"] = [
                {
                    "name": entry.get("name"),
                    "country": entry.get("country"),
                    "ranking": entry.get("ranking"),
                }
                for entry in rankings[:5]
            ]
        return failure_response
    user_id = athlete_record.get("userid") or athlete_record.get("userId")

    competition_history: List[Dict[str, Any]] = []
    competition_error: Optional[str] = None

    if user_id:
        try:
            # Reuse same session for competition lookup
            competition_history = scraper.get_athlete_competitions(user_id)
        except Exception as exc:  # noqa: BLE001
            competition_error = str(exc)
            logger.exception(
                "Failed to fetch competition history for %s (%s): %s",
                athlete_name,
                user_id,
                exc,
            )
    else:
        competition_error = "No userId in ranking response"
        logger.warning(
            "Athlete %s missing userId; cannot fetch competition history", athlete_name
        )

    result: Dict[str, Any] = {
        "success": True,
        "athlete": athlete_record,
        "competition_history": competition_history,
        "metadata": {
            "athlete_name": athlete_name,
            "country": country,
            "weight_division": weight_division,
            "ranking_category": ranking_category,
            "sub_category": sub_category,
            "month": month,
            "year": year,
            "months_back": months_back,
            "rankings_checked": len(rankings),
            "matched_count": 1,
        },
    }
    category_summary = getattr(scraper, "last_profile_category_summary", None)
    if category_summary:
        result["category_summary"] = category_summary
        if rank_history_months:
            rank_timeline = _build_rank_timeline(
                scraper,
                _select_best_entry,
                athlete_name,
                country,
                category_summary,
                rank_history_months,
            )
            if rank_timeline:
                result["rank_history"] = rank_timeline

    if competition_error:
        result["metadata"]["competition_error"] = competition_error

    return result


def _calculate_months_to_march_2021() -> int:
    """Calculate number of months from current month back to March 2021."""
    current = datetime.now().replace(day=1)
    target = datetime(2021, 3, 1)
    
    months = 0
    temp = current
    while temp > target:
        months += 1
        year = temp.year
        month = temp.month - 1
        if month == 0:
            month = 12
            year -= 1
        temp = temp.replace(year=year, month=month)
    
    return months


def _select_best_entry(rankings: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Helper to select best matching entry from rankings."""
    if not rankings:
        return None
    return rankings[0] if isinstance(rankings, list) else None


def _fetch_single_month_data(
    athlete_name: str,
    country: Optional[str],
    ranking_category: str,
    sub_category: str,
    weight_division: str,
    month_name: str,
    year_value: int,
    delay: int,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetch data for a single month (rankings + competitions if user_id provided).
    Returns dict with rank_data and competition_data.
    """
    try:
        month_scraper = TaekwondoScraper()
        month_scraper.logger.setLevel(logging.WARNING)
        month_scraper.configure(
            ranking_category=ranking_category,
            sub_category=sub_category,
            weight_division=weight_division,
            country_filter=country,
            athlete_filter=None,
            month=month_name,
            year=year_value,
            max_results=0,
            delay=delay,
        )
        
        # Get rankings for this month
        rankings_snapshot = month_scraper.scrape_data()
        
        # Find athlete in rankings
        match_entry = _select_best_entry(rankings_snapshot)
        
        rank_data = {
            "category": f"{weight_division} | {sub_category} | {ranking_category}",
            "month": month_name,
            "year": year_value,
            "ranking": match_entry.get("ranking") if match_entry else None,
            "points": match_entry.get("points") if match_entry else None,
            "change": match_entry.get("change") if match_entry else None,
        }
        
        # Try to fetch competitions for this month if we have user_id
        competition_data = []
        if user_id and match_entry:
            try:
                competitions = month_scraper.get_athlete_competitions(user_id)
                if competitions:
                    competition_data = competitions
            except Exception as comp_exc:  # noqa: BLE001
                logger.debug(f"Could not fetch competitions for {month_name} {year_value}: {comp_exc}")
        
        return {
            "rank_data": rank_data,
            "competition_data": competition_data,
            "month": month_name,
            "year": year_value
        }
        
    except Exception as exc:  # noqa: BLE001
        return {
            "rank_data": {
                "category": f"{weight_division} | {sub_category} | {ranking_category}",
                "month": month_name,
                "year": year_value,
                "error": str(exc),
            },
            "competition_data": [],
            "month": month_name,
            "year": year_value
        }


def _build_comprehensive_timeline_parallel(
    athlete_name: str,
    country: Optional[str],
    category_summary: List[Dict[str, Any]],
    delay: int = 2,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch ALL historical data back to March 2021 in parallel threads.
    Returns dict with rank_history and competitive_history, both grouped by year.
    """
    if not category_summary:
        return {"rank_history": [], "competitive_history": []}
    
    # Calculate months back to March 2021
    months_to_fetch = _calculate_months_to_march_2021()
    logger.info(f"📅 Fetching {months_to_fetch} months of data back to March 2021...")
    
    # Generate all month-year pairs
    month_year_pairs = _generate_month_year_pairs(months_to_fetch)
    
    all_rank_results = []
    all_competition_results = []
    
    # Process each category
    for category_entry in category_summary:
        parsed = _parse_category_fields(category_entry.get("category_name", ""))
        if not parsed:
            continue
        
        ranking_category = parsed["ranking_category"]
        sub_category = parsed["sub_category"]
        weight_division = parsed["weight_division"]
        
        # Validate category mappings
        timeline_scraper = TaekwondoScraper()
        if ranking_category not in timeline_scraper.ranking_type_mappings:
            continue
        if sub_category not in timeline_scraper.sub_category_mappings:
            continue
        
        if sub_category == "Olympic Senior Division":
            weight_mapping = timeline_scraper.olympic_weight_mappings
        else:
            weight_mapping = timeline_scraper.world_weight_mappings
        
        if weight_division not in weight_mapping:
            continue
        
        logger.info(f"🔄 Fetching {len(month_year_pairs)} months for {weight_division} | {sub_category}...")
        
        # Use ThreadPoolExecutor for parallel fetching
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            
            for period in month_year_pairs:
                month_index = period.get("month_index")
                if month_index is None or not (0 <= month_index < len(MONTH_NAMES)):
                    continue
                
                month_name = MONTH_NAMES[month_index]
                year_value = period.get("year")
                
                # Submit parallel task
                future = executor.submit(
                    _fetch_single_month_data,
                    athlete_name,
                    country,
                    ranking_category,
                    sub_category,
                    weight_division,
                    month_name,
                    year_value,
                    delay,
                    user_id
                )
                futures.append(future)
            
            # Collect results as they complete
            for future in as_completed(futures):
                try:
                    result = future.result()
                    
                    # Add rank data
                    if result["rank_data"]:
                        all_rank_results.append(result["rank_data"])
                    
                    # Add competition data
                    if result["competition_data"]:
                        all_competition_results.extend(result["competition_data"])
                        
                except Exception as exc:  # noqa: BLE001
                    logger.error(f"Error collecting parallel result: {exc}")
    
    # Sort chronologically (oldest first)
    all_rank_results.sort(key=lambda x: (x.get("year", 0), MONTH_NAMES.index(x.get("month", "January"))))
    
    # Remove duplicate competitions (same event_id)
    seen_event_ids = set()
    unique_competitions = []
    for comp in all_competition_results:
        event_id = comp.get("event_id")
        if event_id and event_id not in seen_event_ids:
            seen_event_ids.add(event_id)
            unique_competitions.append(comp)
        elif not event_id:
            unique_competitions.append(comp)
    
    # Sort competitions chronologically (most recent first for display)
    unique_competitions.sort(
        key=lambda x: (
            x.get("generated_end_date", "1900-01-01")
        ),
        reverse=True
    )
    
    logger.info(f"✅ Fetched {len(all_rank_results)} rank entries and {len(unique_competitions)} competitions")
    
    return {
        "rank_history": all_rank_results,
        "competitive_history": unique_competitions
    }


if __name__ == "__main__":
    import argparse
    import json

    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(
        description="Lookup Taekwondo athlete rank and competition history."
    )
    parser.add_argument("athlete_name", help="Full name of the athlete to look up.")
    parser.add_argument(
        "--country",
        help="Exact country name as listed in World Taekwondo rankings.",
        default=None,
    )
    parser.add_argument(
        "--weight",
        dest="weight_division",
        required=True,
        help="Weight division label (e.g. 'M-54 kg', 'W-57 kg').",
    )
    parser.add_argument(
        "--ranking-category",
        default=DEFAULT_RANKING_CATEGORY,
        help="Ranking category to query.",
    )
    parser.add_argument(
        "--sub-category",
        default=DEFAULT_SUB_CATEGORY,
        help="Ranking sub-category to query.",
    )
    parser.add_argument(
        "--month",
        help="Month name for the rankings snapshot.",
    )
    parser.add_argument(
        "--year",
        type=int,
        help="Year for the rankings snapshot.",
    )
    parser.add_argument(
        "--months-back",
        type=int,
        default=12,
        help="How many months of competition history to attempt.",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=100,
        help="Maximum number of ranking rows to inspect.",
    )
    parser.add_argument(
        "--delay",
        type=int,
        default=2,
        help="Delay between network requests.",
    )
    parser.add_argument(
        "--rank-history-months",
        type=int,
        default=0,
        help="Collect ranking snapshots for this many months across all detected categories (0 to disable).",
    )
    parser.add_argument(
        "--comprehensive",
        action="store_true",
        help="Enable comprehensive parallel fetching back to March 2021 (for NEW athletes only).",
    )

    args = parser.parse_args()

    # Use comprehensive parallel fetching if requested
    if args.comprehensive:
        logger.info(f"🚀 COMPREHENSIVE MODE: Fetching ALL data back to March 2021 in parallel for {args.athlete_name}...")
        
        # First get current rankings to extract category summary and user_id
        initial_result = get_athlete_rank_and_history(
            athlete_name=args.athlete_name,
            country=args.country,
            weight_division=args.weight_division,
            ranking_category=args.ranking_category,
            sub_category=args.sub_category,
            month=args.month,
            year=args.year,
            months_back=args.months_back,
            max_results=args.max_results,
            delay=args.delay,
            rank_history_months=0,  # Don't fetch history in initial call
        )
        
        if initial_result.get("success") and initial_result.get("category_summary"):
            user_id = initial_result.get("athlete", {}).get("userid") or initial_result.get("athlete", {}).get("userId")
            category_summary = initial_result.get("category_summary", [])
            
            # Fetch comprehensive timeline in parallel
            comprehensive_data = _build_comprehensive_timeline_parallel(
                athlete_name=args.athlete_name,
                country=args.country,
                category_summary=category_summary,
                delay=args.delay,
                user_id=user_id
            )
            
            # Merge comprehensive data into result
            initial_result["rank_history"] = comprehensive_data.get("rank_history", [])
            
            # Replace competitive_history with comprehensive data if available
            if comprehensive_data.get("competitive_history"):
                initial_result["competition_history"] = comprehensive_data.get("competitive_history", [])
            
            lookup_result = initial_result
        else:
            logger.error(f"❌ Failed to get initial data for comprehensive mode")
            lookup_result = initial_result
    else:
        # Standard mode - use existing logic
        lookup_result = get_athlete_rank_and_history(
            athlete_name=args.athlete_name,
            country=args.country,
            weight_division=args.weight_division,
            ranking_category=args.ranking_category,
            sub_category=args.sub_category,
            month=args.month,
            year=args.year,
            months_back=args.months_back,
            max_results=args.max_results,
            delay=args.delay,
            rank_history_months=args.rank_history_months,
        )

    print(json.dumps(lookup_result, indent=2, ensure_ascii=False))
