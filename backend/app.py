import os
import io
import pickle
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, StreamingResponse
from pydantic import BaseModel
from rdkit import Chem
from rdkit.Chem import Draw, AllChem
from train_models import get_morgan_fingerprints, get_maccs_keys, get_rdkit_2d
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="OralAbsPredict API")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files for models (like summary_plot.png)
os.makedirs(os.path.join(BASE_DIR, "models"), exist_ok=True)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "models")), name="static")

class PredictRequest(BaseModel):
    smiles: str

# Global dictionary to hold pipelines
pipelines = {}

@app.on_event("startup")
def load_models():
    # Load HIA
    hia_path = os.path.join(BASE_DIR, "models", "HIA_pipeline.pkl")
    if os.path.exists(hia_path):
        with open(hia_path, "rb") as f:
            pipelines['HIA'] = pickle.load(f)
            
    # Load HOB
    hob_path = os.path.join(BASE_DIR, "models", "HOB_pipeline.pkl")
    if os.path.exists(hob_path):
        with open(hob_path, "rb") as f:
            pipelines['HOB'] = pickle.load(f)

def run_prediction(pipeline, smiles):
    # 1. Calc descriptors
    desc_type = pipeline.get('descriptor_type', 'RDKit2D')
    if desc_type == 'MACCS':
        df, valid = get_maccs_keys([smiles])
    elif desc_type == 'Morgan':
        df, valid = get_morgan_fingerprints([smiles])
    else:
        df, valid = get_rdkit_2d([smiles])
        
    if not valid:
        raise ValueError(f"Invalid SMILES string: {smiles}")
        
    # 2. Select matching features
    feature_names = pipeline['feature_names']
    df = df.reindex(columns=feature_names, fill_value=np.nan)
    
    # 3. Impute & Scale
    X = df.values
    X_imp = pipeline['imputer'].transform(X)
    X_scaled = pipeline['scaler'].transform(X_imp)
    
    # 4. Predict probability
    prob = pipeline['model'].predict_proba(X_scaled)[0][1]
    
    # 5. Applicability Domain (AD) check
    if 'ad_knn' in pipeline and 'ad_threshold' in pipeline:
        ad_knn = pipeline['ad_knn']
        ad_threshold = pipeline['ad_threshold']
        dist, _ = ad_knn.kneighbors(X_scaled)
        avg_dist = dist.mean(axis=1)[0]
        in_domain = bool(avg_dist <= ad_threshold)
        ad_info = {
            "in_domain": in_domain,
            "explanation": f"Average distance to training data ({avg_dist:.2f}) is {'below' if in_domain else 'above'} threshold ({ad_threshold:.2f})."
        }
    else:
        ad_info = {"in_domain": True, "explanation": "No AD information available."}
    
    # 6. SHAP Explainer
    explainer = pipeline['explainer']
    shap_values = explainer.shap_values(X_scaled)
    # TreeExplainer might return list for classification
    if isinstance(shap_values, list):
        shap_vals = shap_values[1][0]
    else:
        shap_vals = shap_values[0]
        if shap_vals.ndim == 2:
            shap_vals = shap_vals[:, 1] if shap_vals.shape[1] == 2 else shap_vals
        
    # Get top 5 features
    top_indices = np.argsort(np.abs(shap_vals))[-5:]
    top_features = [{"name": feature_names[i], "value": float(shap_vals[i])} for i in top_indices]
    
    return {
        "probability": float(prob),
        "model_used": pipeline['model_name'],
        "descriptor_used": desc_type,
        "top_features": top_features[::-1], # Descending order
        "ad_info": ad_info
    }

@app.post("/predict")
def predict(req: PredictRequest):
    if not pipelines:
        raise HTTPException(status_code=500, detail="Models not loaded")
        
    response = {}
    try:
        if 'HIA' in pipelines:
            response['HIA'] = run_prediction(pipelines['HIA'], req.smiles)
        if 'HOB' in pipelines:
            response['HOB'] = run_prediction(pipelines['HOB'], req.smiles)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return response

@app.post("/predict_batch")
async def predict_batch(file: UploadFile = File(...)):
    if not pipelines:
        raise HTTPException(status_code=500, detail="Models not loaded")
        
    content = await file.read()
    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV format")
    
    # Check if SMILES column exists
    smiles_col = None
    for col in df.columns:
        if col.lower() in ['smiles', 'structure', 'canonical_smiles']:
            smiles_col = col
            break
            
    if not smiles_col:
        raise HTTPException(status_code=400, detail="No SMILES column found in CSV. Ensure column is named 'SMILES'")
        
    results = []
    for smiles in df[smiles_col]:
        res = {"SMILES": smiles}
        try:
            if 'HIA' in pipelines:
                hia_res = run_prediction(pipelines['HIA'], smiles)
                res['HIA_Probability'] = round(hia_res['probability'], 4)
                res['HIA_InDomain'] = hia_res['ad_info']['in_domain']
            if 'HOB' in pipelines:
                hob_res = run_prediction(pipelines['HOB'], smiles)
                res['HOB_Probability'] = round(hob_res['probability'], 4)
                res['HOB_InDomain'] = hob_res['ad_info']['in_domain']
            res['Status'] = 'Success'
        except Exception as e:
            res['Status'] = f"Failed: {str(e)}"
        results.append(res)
        
    out_df = pd.DataFrame(results)
    stream = io.StringIO()
    out_df.to_csv(stream, index=False)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=predictions.csv"
    return response

@app.get("/molecule_image")
def get_molecule_image(smiles: str):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise HTTPException(status_code=400, detail="Invalid SMILES")
    
    # Generate SVG
    img = Draw.MolsToGridImage([mol], molsPerRow=1, subImgSize=(300, 300), useSVG=True)
    return Response(content=img, media_type="image/svg+xml")

@app.get("/molecule_3d")
def get_molecule_3d(smiles: str):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise HTTPException(status_code=400, detail="Invalid SMILES")
    
    # Add hydrogens and generate 3D coords
    mol = Chem.AddHs(mol)
    AllChem.EmbedMolecule(mol, AllChem.ETKDGv3())
    try:
        AllChem.MMFFOptimizeMolecule(mol)
    except Exception:
        pass # Fallback to embedded coords if optimization fails
    
    # Return as SDF block
    sdf_block = Chem.MolToMolBlock(mol)
    return Response(content=sdf_block, media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
