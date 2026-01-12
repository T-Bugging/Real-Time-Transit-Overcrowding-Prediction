import json
import os
import re
import random
from datetime import datetime, timedelta

from routes_config import get_route, validate_route_id

TICKETS_FILE = "tickets.json"

ALLOWED_DAY_TYPES = {"Weekday", "Weekend"}
ALLOWED_TIME_SLOTS = {"Morning", "Midday", "Evening", "Night"}


def _time_slot_from_hour(hour: int) -> str:
    if 5 <= hour < 11:
        return "Morning"
    if 11 <= hour < 15:
        return "Midday"
    if 15 <= hour < 20:
        return "Evening"
    return "Night"


def _load_all() -> list:
    if not os.path.exists(TICKETS_FILE):
        return []
    with open(TICKETS_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return []


def _save_all(tickets: list) -> None:
    with open(TICKETS_FILE, "w", encoding="utf-8") as f:
        json.dump(tickets, f, ensure_ascii=False, indent=2)


def _next_ticket_id(tickets: list) -> str:
    """Return next friendly ticket id like TKT-00001 based on existing tickets."""
    max_n = 0
    for t in tickets:
        tid = t.get("ticket_id", "")
        m = re.match(r"^TKT-(\d+)$", tid)
        if m:
            try:
                n = int(m.group(1))
            except Exception:
                continue
            if n > max_n:
                max_n = n
    return f"TKT-{max_n + 1:05d}"


def generate_ticket(route_id: str, purchase_datetime: datetime = None, overrides: dict = None, fare: float = 0.0) -> dict:
    """Create a ticket, persist it to local JSON, and return the ticket dict.

    The returned ticket contains the model input fields as top-level keys:
      - timestamp_hour, timestamp_day_of_week, timestamp_month, day_type, time_slot

    If route_id is provided, the timestamp is randomly selected within that route's operating hours.
    If purchase_datetime is provided, it overrides the route's time window.
    """
    # Validate route
    if not validate_route_id(route_id):
        raise ValueError(f"Invalid route_id: {route_id}")
    
    route = get_route(route_id)
    
    # load existing tickets first to generate a short, sequential ticket id
    tickets = _load_all()
    ticket_id = _next_ticket_id(tickets)

    # Determine the timestamp
    if purchase_datetime is None:
        today = datetime.utcnow().date()
        
        # Check route's operating hours and days
        start_hour, end_hour = route['operating_hours']
        route_days = route['days']
        
        # Handle overnight routes (e.g., 22-6)
        if start_hour > end_hour:
            # Overnight route: pick random hour from [start_hour, 23] or [0, end_hour]
            if random.choice([True, False]):
                rand_hour = random.randint(start_hour, 23)
            else:
                rand_hour = random.randint(0, end_hour)
        else:
            # Normal daytime route
            rand_hour = random.randint(start_hour, end_hour - 1)
        
        rand_minute = random.randint(0, 59)
        rand_second = random.randint(0, 59)
        now = datetime(today.year, today.month, today.day, rand_hour, rand_minute, rand_second)
    else:
        now = purchase_datetime
    
    hour = int(overrides.get("timestamp_hour", now.hour)) if overrides else now.hour
    day_of_week = int(overrides.get("timestamp_day_of_week", now.weekday())) if overrides else now.weekday()
    month = int(overrides.get("timestamp_month", now.month)) if overrides else now.month
    day_type = overrides.get("day_type") if overrides and "day_type" in overrides else ("Weekend" if day_of_week in {5, 6} else "Weekday")
    time_slot = overrides.get("time_slot") if overrides and "time_slot" in overrides else _time_slot_from_hour(hour)

    # Basic validations
    if not (0 <= hour <= 23):
        raise ValueError("timestamp_hour must be in 0-23")
    if not (0 <= day_of_week <= 6):
        raise ValueError("timestamp_day_of_week must be in 0-6")
    if not (1 <= month <= 12):
        raise ValueError("timestamp_month must be in 1-12")
    if day_type not in ALLOWED_DAY_TYPES:
        raise ValueError(f"day_type must be one of {ALLOWED_DAY_TYPES}")
    if time_slot not in ALLOWED_TIME_SLOTS:
        raise ValueError(f"time_slot must be one of {ALLOWED_TIME_SLOTS}")

    ticket = {
        "ticket_id": ticket_id,
        "route_id": route_id,
        "vehicle_id": random.choice(route['vehicles']),  # Assign a random vehicle from the route
        "purchase_datetime": now.isoformat(),
        "fare": float(fare),
        # Model input fields (only these will be sent to the model)
        "timestamp_hour": hour,
        "timestamp_day_of_week": day_of_week,
        "timestamp_month": month,
        "day_type": day_type,
        "time_slot": time_slot,
    }

    tickets.append(ticket)
    _save_all(tickets)
    return ticket


def get_ticket(ticket_id: str) -> dict | None:
    """Retrieve a ticket by `ticket_id` from local storage. Returns None if not found."""
    tickets = _load_all()
    for t in tickets:
        if t.get("ticket_id") == ticket_id:
            return t
    return None


def get_last_ticket_for_route(route_id: str) -> dict | None:
    """Return the most recently created ticket for the given `route_id`, or None if none exist."""
    tickets = _load_all()
    route_tickets = [t for t in tickets if t.get('route_id') == route_id]
    if not route_tickets:
        return None
    # Parse purchase_datetime and pick the latest
    def _ts(t):
        try:
            from datetime import datetime
            return datetime.fromisoformat(t.get('purchase_datetime'))
        except Exception:
            return None

    route_tickets.sort(key=lambda x: _ts(x) or 0, reverse=True)
    return route_tickets[0]


if __name__ == "__main__":
    # small demo when run directly
    t = generate_ticket("R12")
    print(json.dumps(t, indent=2))

