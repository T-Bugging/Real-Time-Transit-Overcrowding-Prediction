"""
Flask REST API for UDAY Bus — Ticket generation and occupancy prediction.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback

from ticket_generator import generate_ticket, get_ticket, get_last_ticket_for_route
import AI_api
from routes_config import get_all_routes, get_route, validate_route_id, add_vehicle_to_route

app = Flask(__name__)
CORS(app)

# Load model at startup
try:
    AI_api.load_model()
    print('✓ Model loaded at startup')
except Exception as e:
    print(f'⚠ Model load warning: {e}')


@app.route('/api/model/status', methods=['GET'])
def model_status():
    """Return model load status."""
    return jsonify({'status': 'ready'}), 200


@app.route('/api/routes', methods=['GET'])
def get_routes():
    """Fetch all available routes."""
    try:
        routes_dict = get_all_routes()
        # Convert dict to list with route_id included
        routes_list = [
            {**route_data, 'route_id': route_id}
            for route_id, route_data in routes_dict.items()
        ]
        return jsonify(routes_list), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/predict', methods=['POST'])
def predict_occupancy():
    """
    Predict occupancy for given model inputs.
    
    Body (single record):
    {
        "timestamp_hour": 10,
        "timestamp_day_of_week": 2,
        "timestamp_month": 1,
        "day_type": "Weekday",
        "time_slot": "Morning"
    }
    
    Body (batch):
    [{...}, {...}]
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'missing json body'}), 400
        
        # Handle batch or single
        if isinstance(data, list):
            import pandas as pd
            df = pd.DataFrame(data)
            preds = AI_api.preprocess_and_predict(df)
            results = []
            for p in preds:
                results.append({
                    'occupancy_percentage': float(p),
                    'crowd_level': AI_api.crowd_level_from_occupancy(p)
                })
            return jsonify(results), 200
        
        # Single record
        pred = AI_api.preprocess_and_predict(data)
        return jsonify({
            'occupancy_percentage': float(pred),
            'crowd_level': AI_api.crowd_level_from_occupancy(pred)
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/tickets', methods=['POST'])
def create_ticket():
    """
    Create a ticket and predict occupancy.
    
    Body:
    {
        "route_id": "R12",
        "fare": 1.50,
        "overrides": {  // optional
            "timestamp_hour": 14,
            "day_type": "Weekday"
        }
    }
    
    Returns: { ticket, prediction }
    """
    try:
        body = request.get_json() or {}
        route_id = body.get('route_id')
        if not route_id:
            return jsonify({'error': 'route_id required'}), 400
        
        fare = body.get('fare', 0.0)
        overrides = body.get('overrides')
        
        # Generate ticket
        ticket = generate_ticket(route_id, overrides=overrides, fare=fare)
        
        # Prepare model input
        model_input = {
            'timestamp_hour': ticket['timestamp_hour'],
            'timestamp_day_of_week': ticket['timestamp_day_of_week'],
            'timestamp_month': ticket['timestamp_month'],
            'day_type': ticket['day_type'],
            'time_slot': ticket['time_slot'],
        }
        
        # Predict
        pred = AI_api.preprocess_and_predict(model_input)
        
        return jsonify({
            'ticket': ticket,
            'prediction': {
                'occupancy_percentage': float(pred),
                'crowd_level': AI_api.crowd_level_from_occupancy(pred)
            }
        }), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/tickets/<ticket_id>', methods=['GET'])
def get_ticket_endpoint(ticket_id):
    """Fetch a ticket by ID."""
    try:
        ticket = get_ticket(ticket_id)
        if not ticket:
            return jsonify({'error': 'ticket not found'}), 404
        return jsonify(ticket), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/tickets/<ticket_id>/predict', methods=['GET'])
def predict_for_ticket(ticket_id):
    """Predict occupancy for an existing ticket."""
    try:
        ticket = get_ticket(ticket_id)
        if not ticket:
            return jsonify({'error': 'ticket not found'}), 404
        
        model_input = {
            'timestamp_hour': ticket['timestamp_hour'],
            'timestamp_day_of_week': ticket['timestamp_day_of_week'],
            'timestamp_month': ticket['timestamp_month'],
            'day_type': ticket['day_type'],
            'time_slot': ticket['time_slot'],
        }
        
        pred = AI_api.preprocess_and_predict(model_input)
        return jsonify({
            'ticket_id': ticket_id,
            'occupancy_percentage': float(pred),
            'crowd_level': AI_api.crowd_level_from_occupancy(pred)
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/routes/<route_id>/forecast', methods=['GET'])
def route_forecast(route_id):
    """Return short-term (15 & 30 minute) occupancy forecasts for a route."""
    try:
        if not validate_route_id(route_id):
            return jsonify({'error': 'route not found'}), 404

        route = get_route(route_id)

        from datetime import datetime, timedelta

        # Prefer the timestamp of the last ticket on the route (if any) so forecasts reflect recent bookings
        last_ticket = get_last_ticket_for_route(route_id)
        if last_ticket and last_ticket.get('purchase_datetime'):
            try:
                base_dt = datetime.fromisoformat(last_ticket['purchase_datetime'])
            except Exception:
                base_dt = datetime.now()
        else:
            base_dt = datetime.now()

        times = [base_dt + timedelta(minutes=15), base_dt + timedelta(minutes=30)]

        preds = AI_api.short_term_forecast_for_datetimes([base_dt] + times)

        # adjust predictions by vehicle count heuristic
        vehicles_count = len(route.get('vehicles', []))
        adjusted = []
        for p in preds:
            factor = 1.0
            if vehicles_count >= 4:
                factor = 0.9
            elif vehicles_count <= 2:
                factor = 1.1
            occ = min(100.0, float(p) * factor)
            adjusted.append(occ)

        response = {
            'route_id': route_id,
            'forecasts': {
                'now': {
                    'occupancy_percentage': round(adjusted[0], 1),
                    'crowd_level': AI_api.crowd_level_from_occupancy(adjusted[0])
                },
                '15_min': {
                    'occupancy_percentage': round(adjusted[1], 1),
                    'crowd_level': AI_api.crowd_level_from_occupancy(adjusted[1])
                },
                '30_min': {
                    'occupancy_percentage': round(adjusted[2], 1),
                    'crowd_level': AI_api.crowd_level_from_occupancy(adjusted[2])
                }
            }
        }

        return jsonify(response), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/routes/<route_id>/vehicles', methods=['POST'])
def add_vehicle(route_id):
    """Add an external vehicle to a route (admin action). Body: { "vehicle_id": "V123" }"""
    try:
        if not validate_route_id(route_id):
            return jsonify({'error': 'route not found'}), 404

        body = request.get_json() or {}
        vehicle_id = body.get('vehicle_id')
        if not vehicle_id:
            return jsonify({'error': 'vehicle_id required'}), 400

        updated = add_vehicle_to_route(route_id, vehicle_id)
        return jsonify({ 'route_id': route_id, 'updated': updated }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('Starting UDAY Bus API server on http://0.0.0.0:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
