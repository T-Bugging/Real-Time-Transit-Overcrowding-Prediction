"""
LightGBM model loader and prediction helper.

Preprocessing:
- Numerical features (timestamp_hour, timestamp_day_of_week, timestamp_month): StandardScaler
- Categorical features (day_type, time_slot): OneHotEncoder with handle_unknown='ignore', sparse_output=False

Model: LightGBM classifier/regressor loaded from Crowd_prediction.pkl
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer

BASE_DIR = os.path.dirname(os.path.abspath(__file__)) if __name__ != '__main__' else os.getcwd()
MODEL_CANDIDATES = [
    os.path.join(BASE_DIR, 'Crowd_prediction.pkl'),
    os.path.join(BASE_DIR, 'models', 'Crowd_prediction.pkl'),
    os.path.join(BASE_DIR, '..', 'Crowd_prediction.pkl'),
]

NUMERICAL_FEATURES = ['timestamp_hour', 'timestamp_day_of_week', 'timestamp_month']
CATEGORICAL_FEATURES = ['day_type', 'time_slot']
ALL_FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES

_model = None
_preprocessor = None


def _build_preprocessor():
    """Build the preprocessing pipeline: StandardScaler for numericals, OneHotEncoder for categoricals."""
    preprocessor = ColumnTransformer(
        transformers=[
            ('scaler', StandardScaler(), NUMERICAL_FEATURES),
            ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False), CATEGORICAL_FEATURES),
        ]
    )
    return preprocessor


def load_model():
    """Load LightGBM model from pickle file."""
    global _model, _preprocessor
    
    model_path = None
    for path in MODEL_CANDIDATES:
        if os.path.exists(path):
            model_path = path
            break
    
    if not model_path:
        raise FileNotFoundError(f"Model not found. Searched: {MODEL_CANDIDATES}")
    
    with open(model_path, 'rb') as f:
        _model = pickle.load(f)
    
    # Build and fit preprocessor on representative data
    _preprocessor = _build_preprocessor()
    # Fit on dummy data covering all categories
    dummy_data = pd.DataFrame({
        'timestamp_hour': [0, 6, 12, 18, 23],
        'timestamp_day_of_week': [0, 1, 2, 3, 6],
        'timestamp_month': [1, 4, 7, 10, 12],
        'day_type': ['Weekday', 'Weekday', 'Weekend', 'Weekend', 'Weekday'],
        'time_slot': ['Morning', 'Midday', 'Evening', 'Night', 'Morning'],
    })
    _preprocessor.fit(dummy_data)
    print(f"Loaded model from {model_path}")


def preprocess_and_predict(data):
    """
    Preprocess raw ticket data and predict occupancy percentage.
    
    Accepts:
    - Single dict: {timestamp_hour, timestamp_day_of_week, timestamp_month, day_type, time_slot}
    - DataFrame: multiple records
    
    Returns:
    - Single value (float) if input is dict
    - Array if input is DataFrame
    """
    global _model, _preprocessor
    
    if _model is None or _preprocessor is None:
        load_model()
    
    # Convert dict to DataFrame
    if isinstance(data, dict):
        df = pd.DataFrame([data])
        is_single = True
    else:
        df = data
        is_single = False
    
    # Validate required columns
    missing = set(ALL_FEATURES) - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    
    # Keep only required features
    df = df[ALL_FEATURES]
    
    # Preprocess
    X = _preprocessor.transform(df)
    
    # Predict
    preds = _model.predict(X)
    preds = np.asarray(preds).ravel()
    
    # Return single value or array
    return float(preds[0]) if is_single else preds


def crowd_level_from_occupancy(occupancy_pct):
    """Classify occupancy percentage into crowd level."""
    if occupancy_pct > 75:
        return 'High'
    if occupancy_pct >= 50:
        return 'Medium'
    return 'Low'


def short_term_forecast_for_datetimes(datetimes):
    """Return occupancy predictions for a list of datetimes.

    Input: list of datetime.datetime objects
    Output: list of floats (occupancy percentage)
    """
    # Build feature rows for each datetime
    import pandas as pd
    rows = []
    for dt in datetimes:
        hour = int(dt.hour)
        day_of_week = int(dt.weekday())
        month = int(dt.month)
        day_type = 'Weekend' if day_of_week >= 5 else 'Weekday'
        # simple time slot mapping
        if 6 <= hour < 10:
            time_slot = 'Morning'
        elif 10 <= hour < 16:
            time_slot = 'Midday'
        elif 16 <= hour < 20:
            time_slot = 'Evening'
        else:
            time_slot = 'Night'

        rows.append({
            'timestamp_hour': hour,
            'timestamp_day_of_week': day_of_week,
            'timestamp_month': month,
            'day_type': day_type,
            'time_slot': time_slot,
        })

    df = pd.DataFrame(rows)
    preds = preprocess_and_predict(df)
    # ensure list of floats
    return [float(p) for p in preds]


if __name__ == '__main__':
    try:
        load_model()
        print('Model loaded successfully')
        # Test with sample data
        sample = {
            'timestamp_hour': 10,
            'timestamp_day_of_week': 2,
            'timestamp_month': 1,
            'day_type': 'Weekday',
            'time_slot': 'Morning'
        }
        pred = preprocess_and_predict(sample)
        print(f'Sample prediction: {pred}% ({crowd_level_from_occupancy(pred)})')
    except Exception as e:
        print(f'Error: {e}')
