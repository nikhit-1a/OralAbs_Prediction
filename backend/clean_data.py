import os
import pandas as pd
from rdkit import Chem
from rdkit.Chem import Descriptors
from rdkit.Chem.MolStandardize import rdMolStandardize
import warnings

# Suppress RDKit warnings
warnings.filterwarnings('ignore')

def clean_smiles(smiles):
    if not isinstance(smiles, str):
        return None
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    
    try:
        # Desalting: Keep largest fragment
        largest_Fragment = rdMolStandardize.LargestFragmentChooser()
        mol = largest_Fragment.choose(mol)
        
        # Neutralization
        uncharger = rdMolStandardize.Uncharger()
        mol = uncharger.uncharge(mol)
        
        # Filtering (MW)
        mw = Descriptors.MolWt(mol)
        if mw < 50 or mw > 1000:
            return None
            
        # Check for heavy metals/inorganics
        allowed_elements = {'H', 'B', 'C', 'N', 'O', 'F', 'P', 'S', 'Cl', 'Br', 'I'}
        atoms = [atom.GetSymbol() for atom in mol.GetAtoms()]
        if not all(atom in allowed_elements for atom in atoms):
            return None
        
        # Canonicalization
        canonical_smiles = Chem.MolToSmiles(mol, isomericSmiles=True, canonical=True)
        return canonical_smiles
    except Exception:
        return None

def process_file(filepath):
    print(f"Cleaning {filepath}...")
    df = pd.read_csv(filepath)
    
    # Handle different column names
    if 'Drug' not in df.columns:
        if 'SMILES' in df.columns:
            df.rename(columns={'SMILES': 'Drug'}, inplace=True)
        elif 'canonical_smiles' in df.columns:
            df.rename(columns={'canonical_smiles': 'Drug'}, inplace=True)
        elif 'SMILES' in df.columns:
            df.rename(columns={'SMILES': 'Drug'}, inplace=True)
            
    if 'Y' not in df.columns and 'standard_value' in df.columns:
        df.rename(columns={'standard_value': 'Y'}, inplace=True)
    
    initial_count = len(df)
    df['Clean_Drug'] = df['Drug'].apply(clean_smiles)
    df_clean = df.dropna(subset=['Clean_Drug']).copy()
    
    final_count = len(df_clean)
    dropped = initial_count - final_count
    print(f"  Dropped {dropped} invalid/filtered molecules.")
    return df_clean, dropped

def main():
    input_dir = os.path.join(os.path.dirname(__file__), 'data', 'raw')
    output_dir = os.path.join(os.path.dirname(__file__), 'data', 'cleaned')
    os.makedirs(output_dir, exist_ok=True)
    
    if not os.path.exists(input_dir):
        print(f"Input directory {input_dir} not found. Run collect_data.py first.")
        return
        
    for filename in os.listdir(input_dir):
        if filename.endswith('.csv'):
            filepath = os.path.join(input_dir, filename)
            df_clean, _ = process_file(filepath)
            outpath = os.path.join(output_dir, f"clean_{filename}")
            df_clean.to_csv(outpath, index=False)
            print(f"  Saved cleaned data to {outpath}")

if __name__ == '__main__':
    main()
