from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import numpy as np
import pandas as pd
import joblib
from scipy.sparse import hstack

try:
    model   = joblib.load("ridge_model.pkl")
    scaler  = joblib.load("scaler.pkl")
    encoder = joblib.load("encoder.pkl")
except FileNotFoundError as e:
    raise RuntimeError(f"Model file not found: {e}. Make sure ridge_model.pkl, scaler.pkl, encoder.pkl are in the same folder.")

NUMERICAL_COLS = [
    "wheelbase", "carlength", "carwidth", "carheight", "curbweight",
    "enginesize", "boreratio", "stroke", "compressionratio",
    "peakrpm", "citympg", "highwaympg",
    "power_to_weight_ratio",   # engineered
    "log_enginesize",          # engineered
    "log_horsepower",          # engineered (replaces raw horsepower)
]

CATEGORICAL_COLS = [
    "fueltype", "aspiration", "doornumber", "carbody", "drivewheel",
    "enginelocation", "enginetype", "cylindernumber", "fuelsystem", "brand",
]

BRAND_CORRECTIONS = {
    "maxda":     "mazda",
    "toyouta":   "toyota",
    "vokswagen": "volkswagen",
    "vw":        "volkswagen",
    "porcshce":  "porsche",
}

class CarFeatures(BaseModel):
    CarName:          str   = Field(..., example="toyota corolla")

    # Categorical
    fueltype:         str   = Field(..., example="gas")
    aspiration:       str   = Field(..., example="std")
    doornumber:       str   = Field(..., example="four")
    carbody:          str   = Field(..., example="sedan")
    drivewheel:       str   = Field(..., example="fwd")
    enginelocation:   str   = Field(..., example="front")
    enginetype:       str   = Field(..., example="ohc")
    cylindernumber:   str   = Field(..., example="four")
    fuelsystem:       str   = Field(..., example="mpfi")

    # Numerical
    wheelbase:        float = Field(..., example=98.8)
    carlength:        float = Field(..., example=168.8)
    carwidth:         float = Field(..., example=64.1)
    carheight:        float = Field(..., example=53.5)
    curbweight:       int   = Field(..., example=2548)
    enginesize:       int   = Field(..., example=130)
    boreratio:        float = Field(..., example=3.47)
    stroke:           float = Field(..., example=2.68)
    compressionratio: float = Field(..., example=9.0)
    horsepower:       int   = Field(..., example=111)  
    peakrpm:          int   = Field(..., example=5000)
    citympg:          int   = Field(..., example=21)
    highwaympg:       int   = Field(..., example=27)


class PredictionResponse(BaseModel):
    predicted_price: float
    brand:           str
    message:         str


app = FastAPI(
    title="Car Price Prediction API",
    description="Predicts car prices for the American market using a Ridge Regression model trained on the Geely Auto dataset.",
    version="1.0.0",
)


def extract_brand(car_name: str) -> str:
    brand = car_name.strip().lower().split()[0]
    return BRAND_CORRECTIONS.get(brand, brand)


def build_dataframe(car: CarFeatures) -> pd.DataFrame:
    """
    Replicate exactly what the notebook did:
      1. Put all input fields into a DataFrame row
      2. Extract brand from CarName
      3. Apply feature engineering (same as training)
      4. Drop raw horsepower — model was trained without it
    """
    data = car.model_dump()
    data["brand"] = extract_brand(data["CarName"])

    row = pd.DataFrame([data])

    row["power_to_weight_ratio"] = row["horsepower"] / row["curbweight"]
    row["log_enginesize"]        = np.log(row["enginesize"] + 1)
    row["log_horsepower"]        = np.log(row["horsepower"] + 1)

    row = row.drop(columns=["horsepower"])  

    return row


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Car Price Prediction API is running 🚗"}


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(car: CarFeatures):
    try:
        row   = build_dataframe(car)
        brand = row["brand"].iloc[0]

        # Pass DataFrame slices so column names are preserved
        X_num = scaler.transform(row[NUMERICAL_COLS])
        X_cat = encoder.transform(row[CATEGORICAL_COLS])

        X_final = hstack([X_num, X_cat])
        price   = max(0.0, round(float(model.predict(X_final)[0]), 2))

        return PredictionResponse(
            predicted_price=price,
            brand=brand,
            message=f"Predicted price for a {brand} car is ${price:,.2f}",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))