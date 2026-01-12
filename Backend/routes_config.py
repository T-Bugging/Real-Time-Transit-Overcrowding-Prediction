"""
Bus routes configuration with real Nagpur routes.

Each route defines:
- route_id: unique identifier
- name: human-readable name
- color: map color for visualization
- vehicles: list of vehicle IDs that run on this route
- operating_hours: (start_hour, end_hour) in 24-hour format
- days: 'weekday', 'weekend', or 'all'
- waypoints: list of [lat, lng] coordinates along the route
"""

ROUTES = {
    'R001': {
        'name': 'Itwari - Nagpur Railway Station',
        'color': '#FF6B6B',  # Red
        'vehicles': ['V001', 'V002', 'V003'],
        'operating_hours': (6, 23),
        'days': 'all',
        'waypoints': [
            [21.1619, 79.0676],  # Itwari
            [21.1560, 79.0720],
            [21.1465, 79.0782],
            [21.1380, 79.0840],
            [21.1458, 79.0882],  # Nagpur Railway Station
        ]
    },
    'R002': {
        'name': 'Sitabuldi - Futala Lake',
        'color': '#4ECDC4',  # Teal
        'vehicles': ['V010', 'V011', 'V012'],
        'operating_hours': (7, 22),
        'days': 'all',
        'waypoints': [
            [21.1553, 79.0888],  # Sitabuldi
            [21.1520, 79.0920],
            [21.1480, 79.0950],
            [21.1420, 79.0980],
            [21.1350, 79.1020],  # Futala Lake
        ]
    },
    'R003': {
        'name': 'Dharampeth - Seminary Hills',
        'color': '#FF6B35',  # Orange
        'vehicles': ['V020', 'V021', 'V022'],
        'operating_hours': (6, 22),
        'days': 'all',
        'waypoints': [
            [21.1745, 79.0830],  # Dharampeth
            [21.1700, 79.0850],
            [21.1640, 79.0900],
            [21.1580, 79.0950],
            [21.1520, 79.1000],  # Seminary Hills
        ]
    },
    'R004': {
        'name': 'Ambazari - Ramdaspeth',
        'color': '#95E1D3',  # Mint Green
        'vehicles': ['V030', 'V031', 'V032'],
        'operating_hours': (7, 21),
        'days': 'weekday',
        'waypoints': [
            [21.1300, 79.0650],  # Ambazari
            [21.1350, 79.0700],
            [21.1400, 79.0750],
            [21.1450, 79.0800],
            [21.1500, 79.0850],  # Ramdaspeth
        ]
    },
    'R005': {
        'name': 'Ring Road Circular Service',
        'color': '#C780FA',  # Purple
        'vehicles': ['V040', 'V041', 'V042', 'V043'],
        'operating_hours': (6, 23),
        'days': 'all',
        'waypoints': [
            [21.1458, 79.0882],
            [21.1400, 79.1050],
            [21.1200, 79.1100],
            [21.1100, 79.0900],
            [21.1200, 79.0700],
            [21.1400, 79.0800],
            [21.1458, 79.0882],
        ]
    },
    'R006': {
        'name': 'Sadar - Geeta Vatika',
        'color': '#F38181',  # Pink
        'vehicles': ['V050', 'V051'],
        'operating_hours': (7, 20),
        'days': 'weekend',
        'waypoints': [
            [21.1620, 79.0850],  # Sadar
            [21.1600, 79.0900],
            [21.1550, 79.0950],
            [21.1480, 79.1050],  # Geeta Vatika
        ]
    }
}


def get_route(route_id: str) -> dict:
    """Get route info by route_id. Raises KeyError if not found."""
    return ROUTES[route_id]


def get_all_routes() -> dict:
    """Get all routes."""
    return ROUTES


def validate_route_id(route_id: str) -> bool:
    """Check if route_id is valid."""
    return route_id in ROUTES


def add_vehicle_to_route(route_id: str, vehicle_id: str) -> dict:
    """Add a vehicle id to a route's vehicle list. Returns updated route dict.

    This mutates the in-memory ROUTES structure. For persistence, integrate with DB or file storage.
    """
    if route_id not in ROUTES:
        raise KeyError(f"Route {route_id} not found")

    vehicles = ROUTES[route_id].setdefault('vehicles', [])
    if vehicle_id not in vehicles:
        vehicles.append(vehicle_id)

    return ROUTES[route_id]
