import os
import sys
import pandas as pd
import numpy as np
from tdc.single_pred import ADME
from rdkit import Chem
from rdkit.Chem.Scaffolds import MurckoScaffold

sys.path.append(os.path.dirname(__file__))
from clean_data import clean_smiles

def generate_scaffold(smiles, include_chirality=False):
    mol = Chem.MolFromSmiles(smiles)
    if mol:
        scaffold = MurckoScaffold.MurckoScaffoldSmiles(mol=mol, includeChirality=include_chirality)
        return scaffold
    return ''

def scaffold_split(df, smiles_col='Clean_Drug', frac_train=0.8, frac_valid=0.2, random_state=42):
    np.random.seed(random_state)
    df = df.copy()
    df['scaffold'] = df[smiles_col].apply(generate_scaffold)
    scaffolds = df.groupby('scaffold').groups
    scaffold_sets = [scaffold_set for (scaffold, scaffold_set) in scaffolds.items()]
    np.random.shuffle(scaffold_sets)
    
    n_total_valid = int(np.floor(frac_valid * len(df)))
    
    train_idx, valid_idx = [], []
    for scaffold_set in scaffold_sets:
        if len(valid_idx) + len(scaffold_set) <= n_total_valid:
            valid_idx.extend(scaffold_set)
        else:
            train_idx.extend(scaffold_set)
            
    return df.iloc[train_idx].drop(columns=['scaffold']), df.iloc[valid_idx].drop(columns=['scaffold'])

def get_original_test_smiles(task_name):
    print(f"Fetching original TDC {task_name} data to isolate test set...")
    if task_name == 'HIA_Hou':
        data = ADME(name='HIA_Hou')
    else:
        data = ADME(name='Bioavailability_Ma')
        
    split = data.get_split() 
    test_df = split['test'].copy()
    test_df['Clean_Drug'] = test_df['Drug'].apply(clean_smiles)
    original_test_smiles = set(test_df['Clean_Drug'].dropna().tolist())
    return original_test_smiles

def process_split(merged_csv, original_dataset_name, output_dir, prefix):
    if not os.path.exists(merged_csv):
        print(f"{merged_csv} not found.")
        return
        
    df = pd.read_csv(merged_csv)
    original_test_smiles = get_original_test_smiles(original_dataset_name)
    
    overlap_mask = df['Clean_Drug'].isin(original_test_smiles)
    df_test_overlap = df[overlap_mask].copy()
    df_new = df[~overlap_mask].copy()
    
    print(f"{prefix}: Found {len(df_test_overlap)} molecules from the original test set in the merged data.")
    print(f"{prefix}: {len(df_new)} molecules available for training/validation.")
    
    train_df, valid_df = scaffold_split(df_new, frac_train=0.8, frac_valid=0.2)
    
    train_df.to_csv(os.path.join(output_dir, f'{prefix}_train.csv'), index=False)
    valid_df.to_csv(os.path.join(output_dir, f'{prefix}_valid.csv'), index=False)
    df_test_overlap.to_csv(os.path.join(output_dir, f'{prefix}_test.csv'), index=False)
    
    print(f"{prefix} Split: Train={len(train_df)}, Valid={len(valid_df)}, Test={len(df_test_overlap)}\n")

def main():
    merged_dir = os.path.join(os.path.dirname(__file__), 'data', 'merged')
    output_dir = os.path.join(os.path.dirname(__file__), 'data', 'splits')
    os.makedirs(output_dir, exist_ok=True)
    
    hia_merged = os.path.join(merged_dir, 'merged_hia.csv')
    hob_merged = os.path.join(merged_dir, 'merged_hob.csv')
    
    process_split(hia_merged, 'HIA_Hou', output_dir, 'hia')
    process_split(hob_merged, 'Bioavailability_Ma', output_dir, 'hob')

if __name__ == '__main__':
    main()
