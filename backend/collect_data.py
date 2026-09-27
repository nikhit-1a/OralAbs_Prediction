import os
import pandas as pd
import requests
import io
from tdc.single_pred import ADME
from chembl_webresource_client.new_client import new_client

def collect_tdc_data(output_dir):
    print("Collecting TDC Data...")
    hia = ADME(name='HIA_Hou')
    hia_df = hia.get_data()
    hia_df['source'] = 'TDC_HIA_Hou'
    hia_df.to_csv(os.path.join(output_dir, 'tdc_hia_hou.csv'), index=False)

    hob = ADME(name='Bioavailability_Ma')
    hob_df = hob.get_data()
    hob_df['source'] = 'TDC_Bioavailability_Ma'
    hob_df.to_csv(os.path.join(output_dir, 'tdc_hob_ma.csv'), index=False)
    print("TDC data saved.")

def collect_hobpre_data(output_dir):
    print("Collecting HobPre Data...")
    url = "https://static-content.springer.com/esm/art%3A10.1186%2Fs13321-022-00595-3/MediaObjects/13321_2022_595_MOESM1_ESM.csv"
    try:
        response = requests.get(url)
        response.raise_for_status()
        df = pd.read_csv(io.StringIO(response.text))
        df['source'] = 'HobPre'
        df.to_csv(os.path.join(output_dir, 'hobpre.csv'), index=False)
        print("HobPre data saved.")
    except Exception as e:
        print(f"Failed to collect HobPre data: {e}")

def collect_chembl_data(output_dir):
    print("Collecting ChEMBL Data...")
    try:
        activity = new_client.activity
        # Filtering for Homo sapiens and BA or F values
        res = activity.filter(standard_type__in=['Bioavailability', 'F', 'BA', 'F(%)'], 
                              standard_relation='=',
                              assay_organism='Homo sapiens')
        records = []
        for r in res[:2000]: # Limit for execution time
            if r.get('canonical_smiles') and r.get('standard_value'):
                records.append({
                    'Drug_ID': r.get('molecule_chembl_id'),
                    'Drug': r.get('canonical_smiles'),
                    'Y': float(r.get('standard_value')),
                    'units': r.get('standard_units'),
                    'type': r.get('standard_type'),
                    'source': 'ChEMBL'
                })
        if records:
            df = pd.DataFrame(records)
            df.to_csv(os.path.join(output_dir, 'chembl.csv'), index=False)
            print(f"ChEMBL data saved ({len(records)} records).")
        else:
            print("No ChEMBL data found.")
    except Exception as e:
        print(f"Failed to collect ChEMBL data: {e}")

def main():
    output_dir = os.path.join(os.path.dirname(__file__), 'data', 'raw')
    os.makedirs(output_dir, exist_ok=True)
    
    collect_tdc_data(output_dir)
    collect_hobpre_data(output_dir)
    collect_chembl_data(output_dir)
    print("Data collection completed.")

if __name__ == '__main__':
    main()
