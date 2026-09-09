import os
import pickle
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from tdc.single_pred import ADME
from rdkit import Chem
from rdkit.Chem import AllChem, MACCSkeys, Descriptors
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import balanced_accuracy_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import NearestNeighbors
from lightgbm import LGBMClassifier
import shap
import warnings
warnings.filterwarnings('ignore')

def get_morgan_fingerprints(smiles_list, radius=2, nBits=2048):
    features = []
    valid_indices = []
    for i, smiles in enumerate(smiles_list):
        mol = Chem.MolFromSmiles(smiles)
        if mol is not None:
            fp = AllChem.GetMorganFingerprintAsBitVect(mol, radius, nBits=nBits)
            features.append(np.array(fp))
            valid_indices.append(i)
    df = pd.DataFrame(features, columns=[f"Morgan_{i}" for i in range(nBits)])
    return df, valid_indices

def get_maccs_keys(smiles_list):
    features = []
    valid_indices = []
    for i, smiles in enumerate(smiles_list):
        mol = Chem.MolFromSmiles(smiles)
        if mol is not None:
            fp = MACCSkeys.GenMACCSKeys(mol)
            features.append(np.array(fp))
            valid_indices.append(i)
    df = pd.DataFrame(features, columns=[f"MACCS_{i}" for i in range(167)])
    return df, valid_indices

def get_rdkit_2d(smiles_list):
    features = []
    valid_indices = []
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
    best_desc_name = None
    best_bal_acc = 0
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
    """Compares algorithms using cross-validated balanced accuracy."""
    print("Comparing algorithms (Tree-based only for SHAP compatibility)...")
    models = {
        'Random Forest': RandomForestClassifier(random_state=42, class_weight='balanced'),
        'LightGBM': LGBMClassifier(random_state=42, class_weight='balanced', verbose=-1)
    }
    
    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
    best_model_name = None
    best_bal_acc = 0
    
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

def process_task(task_name, data_source):
    print(f"\n{'='*40}\n--- Processing {task_name} ---")
    df = data_source.get_data()
    smiles = df['Drug'].tolist()
    
    print("Calculating descriptors (Morgan, MACCS, RDKit 2D)...")
    morgan_df, val_morgan = get_morgan_fingerprints(smiles)
    maccs_df, val_maccs = get_maccs_keys(smiles)
    rdkit_df, val_rdkit = get_rdkit_2d(smiles)
    
    valid_indices = sorted(list(set(val_morgan) & set(val_maccs) & set(val_rdkit)))
    y = df['Y'].iloc[valid_indices].values
    
    morgan_df = morgan_df.iloc[[val_morgan.index(i) for i in valid_indices]].reset_index(drop=True)
    maccs_df = maccs_df.iloc[[val_maccs.index(i) for i in valid_indices]].reset_index(drop=True)
    rdkit_df = rdkit_df.iloc[[val_rdkit.index(i) for i in valid_indices]].reset_index(drop=True)
    
    threshold = 0.1 * len(rdkit_df)
    rdkit_df = rdkit_df.dropna(thresh=len(rdkit_df) - threshold, axis=1)
    
    desc_dict = {'Morgan': morgan_df, 'MACCS': maccs_df, 'RDKit2D': rdkit_df}
    
    best_desc_name, _ = evaluate_descriptors(desc_dict, y)
    X_df = desc_dict[best_desc_name]
    feature_names = X_df.columns.tolist()
    
    imputer = SimpleImputer(strategy='mean')
    X_imp = imputer.fit_transform(X_df.values)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imp)
    
    best_model, best_model_name = compare_algorithms(X_scaled, y)
    
    print("Computing Applicability Domain thresholds...")
    ad_knn = NearestNeighbors(n_neighbors=5)
    ad_knn.fit(X_scaled)
    distances, _ = ad_knn.kneighbors(X_scaled)
    ad_threshold = np.percentile(distances.mean(axis=1), 95)
    
    os.makedirs('models', exist_ok=True)
    
    print("Generating SHAP explainer and plots...")
    explainer = shap.TreeExplainer(best_model)
    shap_values = explainer.shap_values(X_scaled)
    
    if isinstance(shap_values, list):
        vals_for_plot = shap_values[1]
    elif shap_values.ndim == 3:
        vals_for_plot = shap_values[:,:,1]
    else:
        vals_for_plot = shap_values
        
    plt.figure(figsize=(10, 6))
    shap.summary_plot(vals_for_plot, X_scaled, feature_names=feature_names, show=False)
    plt.savefig(f"models/{task_name}_summary_plot.png", bbox_inches='tight')
    plt.close()
    
    pipeline = {
        'descriptor_type': best_desc_name,
        'imputer': imputer,
        'scaler': scaler,
        'model': best_model,
        'feature_names': feature_names,
        'model_name': best_model_name,
        'explainer': explainer,
        'ad_knn': ad_knn,
        'ad_threshold': ad_threshold
    }
    
    with open(f"models/{task_name}_pipeline.pkl", 'wb') as f:
        pickle.dump(pipeline, f)
        
    print(f"Pipeline for {task_name} saved successfully!")
    print("="*40 + "\n")

if __name__ == "__main__":
    process_task('HIA', ADME(name='HIA_Hou'))
    process_task('HOB', ADME(name='Bioavailability_Ma'))
