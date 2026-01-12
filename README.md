Real Time Transit — Overcrowding Prediction
==========================================

Overview
--------
A full-stack app that predicts bus overcrowding in real time using a LightGBM model and visualizes routes on a Leaflet map. Features ticket booking, ticket lookup with predictions, and a routes dashboard.

DEMO - https://youtu.be/DIESkQS3FUY

Repository layout
-----------------
- main.py
- tickets.json
- Backend/
  - app.py                — Flask API server (port 5000)
  - AI_api.py             — Model loader + preprocessing + predict helpers
  - ticket_generator.py   — Ticket generation + storage helpers
  - routes_config.py      — Predefined Nagpur routes, waypoints, operating hours
  - Crowd_prediction.pkl  — LightGBM model (binary)
- Frontend/
  - index.html            — Loads Leaflet CSS/JS and React app
  - src/                  — React source
    - main.jsx
    - App.jsx
    - components/         — Dashboard.jsx, TicketBooking.jsx, TicketLookup.jsx
    - styles/             — CSS files (Dashboard.css, TicketBooking.css, TicketLookup.css)
  - vite.config.js        — Dev server proxy to backend

Backend
-------
- Flask app exposes these endpoints:
  - GET  /api/model/status         — model health
  - POST /api/predict              — accept features, return occupancy prediction
  - GET  /api/routes               — return routes list (route_id, name, color, waypoints, operating_hours, vehicles)
  - POST /api/tickets              — create new ticket (returns ticket and prediction)
  - GET  /api/tickets/<id>         — fetch ticket by ID
  - GET  /api/tickets/<id>/predict — predict occupancy for a ticket
- Model: `Backend/Crowd_prediction.pkl` loaded at startup. Preprocessing uses StandardScaler and OneHotEncoder (handle_unknown='ignore').

AI / Model
----------
- Model type: LightGBM regression model persisted as `Backend/Crowd_prediction.pkl` and loaded at API startup.
- Purpose: predict expected bus occupancy (as a percentage) for a given route/time, then map that percentage to a human-readable crowd level (`Low` / `Medium` / `High`).
- Features: model inputs are the timestamp-derived and categorical features used across the codebase:
  - `timestamp_hour` (0-23)
  - `timestamp_day_of_week` (0=Monday .. 6=Sunday)
  - `timestamp_month` (1-12)
  - `day_type` ("Weekday" / "Weekend")
  - `time_slot` ("Morning", "Midday", "Evening", "Night")
- Preprocessing: implemented with scikit-learn transformers (a ColumnTransformer combining `StandardScaler` for numeric columns and `OneHotEncoder(handle_unknown='ignore')` for categoricals). See `Backend/AI_api.py` for details (`load_model()`, `preprocess_and_predict()`).
- Endpoints that use the model:
  - `POST /api/predict` — accept single record or batch, return occupancy percentage + crowd level.
  - `POST /api/tickets` — ticket creation endpoint calls the model to return a prediction alongside the created ticket.
  - `GET /api/tickets/<id>/predict` — predict for an existing ticket.
  - `GET /api/routes/<route_id>/forecast` — short-term forecast (now, +15min, +30min). The forecast endpoint uses a helper that builds model inputs for the requested datetimes and returns model outputs; a small vehicle-count heuristic is applied to slightly adjust predictions.
- Forecast base time: when available the server now uses the most recent ticket timestamp for that route as the base time for short-term forecasts (instead of `now`) — this helps the forecast reflect recent bookings.
- Requirements: the AI layer depends on `lightgbm`, `scikit-learn`, `pandas`, `numpy` (ensure these are installed in the project's Python environment).
- Retraining notes: to retrain the model, collect historical labeled data where the target is occupancy percentage (or a proxy). Typical steps:
  1. Assemble a CSV with columns matching the features above plus the target occupancy percentage.
  2. Train a LightGBM regressor (or other model) with appropriate cross-validation and feature processing.
  3. Persist the fitted model (and any fitted preprocessors) to `Backend/Crowd_prediction.pkl` and restart the Flask server.
- Debugging tips: if predictions are unexpectedly uniform (e.g., all low), verify that the input datetimes passed into `short_term_forecast_for_datetimes` reflect your intended base time — the route forecast now prefers the last ticket timestamp when present.

Evaluation & Metrics
--------------------
- Task framing: the model is trained as a regressor predicting occupancy percentage (0-100). For some uses you may discretize the output into crowd levels (`Low`/`Medium`/`High`) using thresholds.
- Recommended regression metrics:
  - `MAE` (Mean Absolute Error): intuitive error in percentage points.
  - `RMSE` (Root Mean Squared Error): penalizes larger errors.
  - `R^2`: goodness-of-fit measure.
- Recommended classification metrics (for discretized crowd levels):
  - `Confusion matrix`, `precision`, `recall`, and `F1-score` per class.
  - `Calibration` plots to ensure predicted occupancy aligns with actual frequencies.
- Validation strategy:
  - Use time-aware cross-validation (e.g., forward chaining) when you have temporal dependence.
  - Hold out a recent time window as a final test set to avoid leakage.
- Baselines:
  - Compare against simple heuristics (e.g., historical mean occupancy for the same hour/day) to ensure the model adds value.

If you want, I can add a short example training notebook or a script with sample evaluation code and the exact thresholding used to map occupancy -> crowd level.

Frontend
--------
- Built with React + Vite.
- Map: vanilla Leaflet (loaded from CDN in `index.html`). Dashboard displays colored polylines and waypoint markers for each route.
- Theme: CSS variables defined in `Frontend/src/index.css` (notably `--accent`).
- Dev server runs on port 5174 (configured in `vite.config.js`) and proxies `/api` to `http://localhost:5000`.

Running locally
---------------
Backend (from project root):

```powershell
# activate venv (Windows PowerShell)
& .\venv\Scripts\Activate.ps1
cd Backend
python .\app.py
```

Frontend:

```bash
cd Frontend
npm install
npm run dev
# open http://localhost:5174
```


Notes
-----
- This is a development setup (Flask dev server). For production, use a WSGI server and build the frontend for static hosting.
- The ticket generator writes `tickets.json` in repository root.

