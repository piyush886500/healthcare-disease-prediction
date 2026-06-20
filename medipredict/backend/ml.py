"""
ML logic for MediPredict — ported 1:1 from the original Flask app.py.

Same data loading, same feature engineering, same RandomForestClassifier
training (n_estimators=100, random_state=42), same train/test split
(test_size=0.2, random_state=42), and the same prediction/emergency/doctor
referral logic as the original.
"""
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

df = pd.read_csv(os.path.join(DATA_DIR, "dataset.csv"))
severity_df = pd.read_csv(os.path.join(DATA_DIR, "Symptom-severity.csv"))
description_df = pd.read_csv(os.path.join(DATA_DIR, "symptom_Description.csv"))
precaution_df = pd.read_csv(os.path.join(DATA_DIR, "symptom_precaution.csv"))

all_symptoms = sorted(list(severity_df['Symptom'].str.strip().str.replace(' ', '_')))

df = df.fillna(0)
for col in df.columns[1:]:
    if df[col].dtype == 'object':
        df[col] = df[col].str.strip().str.replace(' ', '_')


def get_features(symptom_list):
    return [1 if s in symptom_list else 0 for s in all_symptoms]


X, y = [], []
for _, row in df.iterrows():
    symptoms = [row[col] for col in df.columns[1:] if row[col] != 0]
    X.append(get_features(symptoms))
    y.append(row['Disease'])

X = np.array(X)
y = np.array(y)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
accuracy = accuracy_score(y_test, model.predict(X_test))
print(f"Model Accuracy: {accuracy:.2%}")

EMERGENCY_SYMPTOMS = {
    'chest_pain', 'shortness_of_breath', 'severe_headache',
    'neck_stiffness', 'loss_of_consciousness', 'sweating'
}

DOCTOR_REFERRAL = {
    'Heart Attack': 'Cardiologist',
    'Diabetes': 'Endocrinologist',
    'Pneumonia': 'Pulmonologist',
    'Tuberculosis': 'Pulmonologist',
    'Hepatitis A': 'Gastroenterologist',
    'Hepatitis B': 'Gastroenterologist',
    'Malaria': 'General Physician',
    'Dengue': 'General Physician',
    'Fungal infection': 'Dermatologist',
    'Allergy': 'Allergist',
    'Migraine': 'Neurologist',
    'Hypertension': 'Cardiologist',
    'Arthritis': 'Rheumatologist',
    'Asthma': 'Pulmonologist',
}


def get_doctor(disease):
    return DOCTOR_REFERRAL.get(disease, 'General Physician')


def predict_disease(user_symptoms):
    cleaned = [s.strip().replace(' ', '_') for s in user_symptoms]
    features = np.array(get_features(cleaned)).reshape(1, -1)

    disease = model.predict(features)[0]
    probs = model.predict_proba(features)[0]
    confidence = round(float(max(probs)) * 100, 1)

    top3_idx = np.argsort(probs)[-3:][::-1]
    top3 = [(model.classes_[i], round(float(probs[i]) * 100, 1)) for i in top3_idx]

    is_emergency = bool(set(cleaned) & EMERGENCY_SYMPTOMS)

    return {
        'disease': disease,
        'confidence': confidence,
        'top3': top3,
        'doctor': get_doctor(disease),
        'emergency': is_emergency
    }


def get_description_and_precautions(disease):
    desc_row = description_df[description_df['Disease'] == disease]
    prec_row = precaution_df[precaution_df['Disease'] == disease]

    description = desc_row['Description'].values[0] if len(desc_row) > 0 else 'No description available'

    precautions = []
    if len(prec_row) > 0:
        for i in range(1, 5):
            col = f'Precaution_{i}'
            if col in prec_row.columns:
                val = prec_row[col].values[0]
                if val and str(val) != 'nan':
                    precautions.append(val)

    return description, precautions


def get_model_stats():
    from sklearn.tree import DecisionTreeClassifier

    dt = DecisionTreeClassifier(random_state=42)
    dt.fit(X_train, y_train)
    dt_acc = round(accuracy_score(y_test, dt.predict(X_test)) * 100, 2)

    rf_acc = round(accuracy * 100, 2)

    top_symptoms = []
    importances = model.feature_importances_
    top_idx = np.argsort(importances)[-10:][::-1]
    for i in top_idx:
        top_symptoms.append({
            'symptom': all_symptoms[i].replace('_', ' ').title(),
            'importance': round(float(importances[i]) * 100, 2)
        })

    return {
        'rf_accuracy': rf_acc,
        'dt_accuracy': dt_acc,
        'top_symptoms': top_symptoms,
        'total_diseases': len(set(y)),
        'total_symptoms': len(all_symptoms),
        'training_samples': len(X_train)
    }
