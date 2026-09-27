import os
import pandas as pd
import numpy as np

def process_hia(df_list, output_dir):
    df_merged = pd.concat(df_list, ignore_index=True)
    df_merged = df_merged.dropna(subset=['Y'])
    df_merged['Y'] = pd.to_numeric(df_merged['Y'], errors='coerce')
    df_merged = df_merged.dropna(subset=['Y'])
    
    def to_percent(val):
        if val <= 1.0 and val > 0:
            return val * 100
        return val
        
    df_merged['Y'] = df_merged['Y'].apply(to_percent)
    df_merged['Label'] = (df_merged['Y'] > 30).astype(int)
    
    grouped = df_merged.groupby('Clean_Drug')
    records = []
    dropped_ambiguous = 0
    for name, group in grouped:
        labels = group['Label'].unique()
        if len(labels) > 1:
            dropped_ambiguous += 1
            continue
        else:
            records.append({
                'Clean_Drug': name,
                'Y': labels[0],
                'Source': " | ".join(group['source'].astype(str).unique())
            })
            
    final_df = pd.DataFrame(records)
    outpath = os.path.join(output_dir, 'merged_hia.csv')
    final_df.to_csv(outpath, index=False)
    
    return f"HIA Merging:\n- Total initial rows: {len(df_merged)}\n- Dropped ambiguous: {dropped_ambiguous}\n- Final unique molecules: {len(final_df)}\n\n"

def process_hob(df_list, output_dir):
    df_merged = pd.concat(df_list, ignore_index=True)
    df_merged = df_merged.dropna(subset=['Y'])
    df_merged['Y'] = pd.to_numeric(df_merged['Y'], errors='coerce')
    df_merged = df_merged.dropna(subset=['Y'])
    
    def to_percent(val):
        if val <= 1.0 and val > 0:
            return val * 100
        return val
        
    df_merged['Y'] = df_merged['Y'].apply(to_percent)
    
    grouped = df_merged.groupby('Clean_Drug')
    records = []
    dropped_ambiguous = 0
    
    for name, group in grouped:
        y_vals = group['Y'].values
        median_f = np.median(y_vals)
        if len(y_vals) > 1 and (np.max(y_vals) - np.min(y_vals) > 30):
            dropped_ambiguous += 1
            continue
            
        records.append({
            'Clean_Drug': name,
            'Y': int(median_f >= 20), # TDC Ma uses 20% cutoff
            'Y_median': median_f,
            'Label_20': int(median_f >= 20),
            'Label_30': int(median_f >= 30),
            'Label_50': int(median_f >= 50),
            'Source': " | ".join(group['source'].astype(str).unique())
        })
        
    final_df = pd.DataFrame(records)
    outpath = os.path.join(output_dir, 'merged_hob.csv')
    final_df.to_csv(outpath, index=False)
    
    return f"HOB Merging:\n- Total initial rows: {len(df_merged)}\n- Dropped ambiguous (>30% variance): {dropped_ambiguous}\n- Final unique molecules: {len(final_df)}\n\n"

def main():
    input_dir = os.path.join(os.path.dirname(__file__), 'data', 'cleaned')
    output_dir = os.path.join(os.path.dirname(__file__), 'data', 'merged')
    os.makedirs(output_dir, exist_ok=True)
    
    if not os.path.exists(input_dir):
        print(f"Input directory {input_dir} not found. Run clean_data.py first.")
        return
        
    hia_files = []
    hob_files = []
    
    for filename in os.listdir(input_dir):
        if not filename.endswith('.csv'): continue
        filepath = os.path.join(input_dir, filename)
        
        if 'hia' in filename.lower():
            hia_files.append(pd.read_csv(filepath))
        elif 'hob' in filename.lower():
            hob_files.append(pd.read_csv(filepath))
        elif 'chembl' in filename.lower():
            # Assume ChEMBL is mostly HOB for now since we filtered by BA/F
            hob_files.append(pd.read_csv(filepath))
            
    report = "Data Cleaning & Merging Report\n"
    report += "="*30 + "\n\n"
    
    if hia_files:
        report += process_hia(hia_files, output_dir)
        
    if hob_files:
        report += process_hob(hob_files, output_dir)
        
    report_path = os.path.join(os.path.dirname(__file__), 'data_cleaning_report.txt')
    with open(report_path, 'w') as f:
        f.write(report)
        
    print(f"Merge completed. Report saved to {report_path}")
    print(report)

if __name__ == '__main__':
    main()
