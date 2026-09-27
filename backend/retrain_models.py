import os
import pickle
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import warnings

from rdkit import Chem
from rdkit.Chem import AllChem, MACCSkeys, Descriptors
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import balanced_accuracy_score, roc_auc_score, matthews_corrcoef, accuracy_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import NearestNeighbors
from lightgbm import LGBMClassifier
import shap

warnings.filterwarnings('ignore')

def get_morgan_fingerprints(smiles_list, radius=2, nBits=2048):
    features, valid_indices = [], []
    for i, smiles in enumerate(smiles_list):
        mol = Chem.MolFromSmiles(smiles)
        if mol is not None:
            fp = AllChem.GetMorganFingerprintAsBitVect(mol, radius, nBits=nBits)
            features.append(np.array(fp))
            valid_indices.append(i)
    df = pd.DataFrame(features, columns=[f"Morgan_{i}" for i in range(nBits)])
    return df, valid_indices

def get_maccs_keys(smiles_list):
    features, valid_indices = [], []
    for i, smiles in enumerate(smiles_list):
        mol = Chem.MolFromSmiles(smiles)
        if mol is not None:
            fp = MACCSkeys.GenMACCSKeys(mol)
            features.append(np.array(fp))
            valid_indices.append(i)
    df = pd.DataFrame(features, columns=[f"MACCS_{i}" for i in range(167)])
    return df, valid_indices

def get_rdkit_2d(smiles_list):
    features, valid_indices = [], []
    desc_names = [desc[0] for desc in Descriptors._descList]
    for i, smiles in enumerate(smiles_list):
        mol = Chem.MolFromSmiles(smiles)
        if mol is not None:
            desc_vals = [desc[1](mol) for desc in Descriptors._descList]
            features.append(desc_vals)
            valid_indices.append(i)
    df = pd.DataFrame(features, columns=desc_names)
    df = df.apply(pd.to_numeric, errors='coerce')
    return df, valid_indices

def evaluate_descriptors(X_dict, y, cv=5):
    print("Evaluating descriptors...")
    rf = RandomForestClassifier(random_state=42, class_weight='balanced')
    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
    best_desc_name, best_bal_acc = None, 0
    results = {}
    
    for name, X_df in X_dict.items():
        X = SimpleImputer(strategy='mean').fit_transform(X_df.values)
        X = StandardScaler().fit_transform(X)
        scores = cross_val_score(rf, X, y, cv=skf, scoring='balanced_accuracy')
        mean_bal_acc = np.mean(scores)
        results[name] = mean_bal_acc
        print(f"  {name} Baseline Balanced Accuracy: {mean_bal_acc:.4f}")
        
        if mean_bal_acc > best_bal_acc:
            best_bal_acc = mean_bal_acc
            best_desc_name = name
            
    print(f"Best Descriptor: {best_desc_name} ({best_bal_acc:.4f})")
    return best_desc_name, results

def compare_algorithms(X, y, cv=5):
    print("Comparing algorithms...")
    models = {
        'Random Forest': RandomForestClassifier(random_state=42, class_weight='balanced'),
        'LightGBM': LGBMClassifier(random_state=42, class_weight='balanced', verbose=-1)
    }
    
    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
    best_model_name, best_bal_acc = None, 0
    
    for name, model in models.items():
        try:
            scores = cross_val_score(model, X, y, cv=skf, scoring='balanced_accuracy')
            mean_bal_acc = np.mean(scores)
            print(f"  {name} Balanced Accuracy: {mean_bal_acc:.4f}")
            if mean_bal_acc > best_bal_acc:
                best_bal_acc = mean_bal_acc
                best_model_name = name
        except Exception as e:
            print(f"  Failed to evaluate {name}: {e}")
            
    print(f"Best Model: {best_model_name} ({best_bal_acc:.4f})")
    best_model = models[best_model_name]
    best_model.fit(X, y)
    return best_model, best_model_name

def evaluate_on_test(model, imputer, scaler, X_test_df, y_test):
    X_imp = imputer.transform(X_test_df.values)
    X_scaled = scaler.transform(X_imp)
    
    y_pred = model.predict(X_scaled)
    y_prob = model.predict_proba(X_scaled)[:, 1] if hasattr(model, 'predict_proba') else None
    
    acc = accuracy_score(y_test, y_pred)
    bal_acc = balanced_accuracy_score(y_test, y_pred)
    mcc = matthews_corrcoef(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob) if y_prob is not None else np.nan
    
    return {
        'Accuracy': acc,
        'Balanced Accuracy': bal_acc,
        'MCC': mcc,
        'AUC': auc
    }

def process_task(task_name):
    print(f"\n{'='*40}\n--- Retraining {task_name} (v2) ---")
    splits_dir = os.path.join(os.path.dirname(__file__), 'data', 'splits')
    prefix = task_name.lower()
    
    train_path = os.path.join(splits_dir, f'{prefix}_train.csv')
    valid_path = os.path.join(splits_dir, f'{prefix}_valid.csv')
    test_path = os.path.join(splits_dir, f'{prefix}_test.csv')
    
    if not os.path.exists(train_path):
        print(f"Train data not found at {train_path}")
        return
        
    df_train = pd.read_csv(train_path)
    df_valid = pd.read_csv(valid_path)
    df_test = pd.read_csv(test_path)
    
    df_tv = pd.concat([df_train, df_valid], ignore_index=True)
    smiles_tv = df_tv['Clean_Drug'].tolist()
    y_tv = df_tv['Y'].values
    
    print(f"Training on {len(smiles_tv)} molecules (train+valid).")
    
    print("Calculating descriptors...")
    morgan_df, val_morgan = get_morgan_fingerprints(smiles_tv)
    maccs_df, val_maccs = get_maccs_keys(smiles_tv)
    rdkit_df, val_rdkit = get_rdkit_2d(smiles_tv)
    
    valid_indices = sorted(list(set(val_morgan) & set(val_maccs) & set(val_rdkit)))
    y_tv = y_tv[valid_indices]
    
    morgan_df = morgan_df.iloc[[val_morgan.index(i) for i in valid_indices]].reset_index(drop=True)
    maccs_df = maccs_df.iloc[[val_maccs.index(i) for i in valid_indices]].reset_index(drop=True)
    rdkit_df = rdkit_df.iloc[[val_rdkit.index(i) for i in valid_indices]].reset_index(drop=True)
    
    threshold = 0.1 * len(rdkit_df)
    rdkit_df = rdkit_df.dropna(thresh=len(rdkit_df) - threshold, axis=1)
    
    desc_dict = {'Morgan': morgan_df, 'MACCS': maccs_df, 'RDKit2D': rdkit_df}
    best_desc_name, _ = evaluate_descriptors(desc_dict, y_tv)
    
    X_tv_df = desc_dict[best_desc_name]
    feature_names = X_tv_df.columns.tolist()
    
    imputer = SimpleImputer(strategy='mean')
    X_imp = imputer.fit_transform(X_tv_df.values)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imp)
    
    best_model, best_model_name = compare_algorithms(X_scaled, y_tv)
    
    print("Computing Applicability Domain thresholds...")
    ad_knn = NearestNeighbors(n_neighbors=5)
    ad_knn.fit(X_scaled)
    distances, _ = ad_knn.kneighbors(X_scaled)
    ad_threshold = np.percentile(distances.mean(axis=1), 95)
    
    # Process test set
    smiles_test = df_test['Clean_Drug'].tolist()
    y_test = df_test['Y'].values
    print(f"Evaluating on original test set ({len(smiles_test)} molecules)...")
    
    # We must use the same descriptor for the test set
    if best_desc_name == 'Morgan':
        X_test_df, val_test = get_morgan_fingerprints(smiles_test)
    elif best_desc_name == 'MACCS':
        X_test_df, val_test = get_maccs_keys(smiles_test)
    else:
        X_test_df, val_test = get_rdkit_2d(smiles_test)
        # Keep same columns
        X_test_df = X_test_df.reindex(columns=feature_names, fill_value=0)
        
    y_test_valid = y_test[val_test]
    metrics = evaluate_on_test(best_model, imputer, scaler, X_test_df, y_test_valid)
    
    metrics_str = f"Evaluation Metrics ({task_name} v2):\n"
    for k, v in metrics.items():
        metrics_str += f"  {k}: {v:.4f}\n"
    print(metrics_str)
    
    os.makedirs('models', exist_ok=True)
    with open(f"models/{task_name}_pipeline_v2.pkl", 'wb') as f:
        pickle.dump({
            'descriptor_type': best_desc_name,
            'imputer': imputer,
            'scaler': scaler,
            'model': best_model,
            'feature_names': feature_names,
            'model_name': best_model_name,
            'ad_knn': ad_knn,
            'ad_threshold': ad_threshold
        }, f)
        
    print(f"Pipeline v2 for {task_name} saved successfully!")
    print("="*40 + "\n")
    return metrics_str

def main():
    report = "# Evaluation Metrics\n\n"
    metrics_hia = process_task('HIA')
    metrics_hob = process_task('HOB')
    
    if metrics_hia: report += f"## HIA Model v2\n```text\n{metrics_hia}\n```\n"
    if metrics_hob: report += f"## HOB Model v2\n```text\n{metrics_hob}\n```\n"
    
    with open('evaluation_metrics.md', 'w') as f:
        f.write(report)
        
    print("Metrics written to evaluation_metrics.md")

if __name__ == "__main__":
    main()
