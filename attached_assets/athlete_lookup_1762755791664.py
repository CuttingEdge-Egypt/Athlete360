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
    """Normalize text for case-insensitive comparisons."""
    return (text or "").strip().lower()


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

    args = parser.parse_args()

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

