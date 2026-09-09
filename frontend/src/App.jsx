import { useState, useRef, useEffect } from 'react';
import { Activity, Beaker, Pill, RefreshCw, AlertCircle, FileUp, Download, Info, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function App() {
  const [activeTab, setActiveTab] = useState('single');
  const [smiles, setSmiles] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [moleculeImg, setMoleculeImg] = useState('');
  const [molecule3D, setMolecule3D] = useState('');
  const viewerRef = useRef(null);

  // Batch state
  const [batchFile, setBatchFile] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!smiles) return;

    setLoading(true);
    setError('');
    setResults(null);
    setMoleculeImg('');
    setMolecule3D('');
    if (viewerRef.current) viewerRef.current.clear();

    try {
      // 1. Fetch prediction
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Prediction failed');
      }

      const data = await res.json();
      setResults(data);

      // 2. Fetch molecule image (2D)
      const imgRes = await fetch(`/api/molecule_image?smiles=${encodeURIComponent(smiles)}`);
      if (imgRes.ok) {
        const svgText = await imgRes.text();
        setMoleculeImg(svgText);
      }

      // 3. Fetch molecule 3D SDF
      const sdfRes = await fetch(`/api/molecule_3d?smiles=${encodeURIComponent(smiles)}`);
      if (sdfRes.ok) {
        const sdfText = await sdfRes.text();
        setMolecule3D(sdfText);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (molecule3D && window.$3Dmol) {
      const element = document.getElementById('mol3d-container');
      if (element) {
        element.innerHTML = '';
        viewerRef.current = window.$3Dmol.createViewer(element, { backgroundColor: 'white' });
        viewerRef.current.addModel(molecule3D, 'sdf');
        viewerRef.current.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.25 } });
        viewerRef.current.zoomTo();
        viewerRef.current.render();
      }
    }
  }, [molecule3D]);

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!batchFile) return;

    setBatchLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', batchFile);
      
      const res = await fetch('/api/predict_batch', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Batch prediction failed');
      }
      
      // Handle file download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'predictions.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const getScoreColor = (prob) => {
    if (prob > 0.7) return 'var(--success)';
    if (prob > 0.4) return 'var(--secondary)';
    return 'var(--error)';
  };

  const renderResultCard = (title, data, icon) => {
    if (!data) return null;
    const probability = (data.probability * 100).toFixed(1);
    const color = getScoreColor(data.probability);
    const isADOk = data.ad_info.in_domain;

    // Prepare SHAP data for chart
    const shapData = data.top_features.map(f => ({
      name: f.name.length > 10 ? f.name.substring(0, 10) + '...' : f.name,
      fullName: f.name,
      value: Math.abs(f.value),
      isPositive: f.value > 0
    }));

    return (
      <div className="glass-panel p-6 sm:p-8 animate-fade-in delay-2 mb-8" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {icon}
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{title}</h2>
          </div>
          
          {/* Applicability Domain Badge */}
          <div title={data.ad_info.explanation} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: '20px',
            background: isADOk ? 'rgba(0, 255, 127, 0.1)' : 'rgba(255, 61, 0, 0.1)',
            color: isADOk ? 'var(--success)' : 'var(--error)',
            border: `1px solid ${isADOk ? 'rgba(0, 255, 127, 0.3)' : 'rgba(255, 61, 0, 0.3)'}`
          }}>
            {isADOk ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              {isADOk ? 'In Domain' : 'Out of Domain'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {/* Score Gauge */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>Probability Score</p>
            <div style={{
              width: '180px', height: '180px',
              borderRadius: '50%',
              background: `conic-gradient(${color} ${probability}%, rgba(255,255,255,0.1) 0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
              position: 'relative'
            }}>
              <div style={{
                width: '150px', height: '150px',
                background: 'var(--bg-dark)',
                borderRadius: '50%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'white' }}>{probability}%</span>
              </div>
            </div>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
              Model: <strong style={{ color: 'white' }}>{data.model_used}</strong> ({data.descriptor_used})
            </p>
          </div>

          {/* SHAP Values Chart */}
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>
              Key Molecular Features (Explainable AI)
            </p>
            <div style={{ height: '220px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shapData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                  <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.8)" width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    formatter={(val, name, props) => [val.toFixed(3), props.payload.fullName]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {shapData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isPositive ? 'var(--primary)' : 'var(--accent)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 12, height: 12, background: 'var(--primary)', borderRadius: '2px' }}></span> Increases Score
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 12, height: 12, background: 'var(--accent)', borderRadius: '2px' }}></span> Decreases Score
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <header className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '1rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(0, 210, 255, 0.1)', color: 'var(--primary)', marginBottom: '1.5rem' }}>
          <Activity size={32} />
        </div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-1px' }}>
          OralAbs<span className="gradient-text">Predict</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          A data-driven framework to predict human intestinal absorption (HIA) and human oral bioavailability (HOB) from chemical structures.
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }} className="animate-fade-in delay-1">
        <button 
          onClick={() => setActiveTab('single')} 
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
                   background: activeTab === 'single' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                   color: activeTab === 'single' ? '#000' : 'white',
                   transition: 'all 0.2s' }}
        >
          Single Molecule
        </button>
        <button 
          onClick={() => setActiveTab('batch')} 
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
                   background: activeTab === 'batch' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                   color: activeTab === 'batch' ? '#000' : 'white',
                   transition: 'all 0.2s' }}
        >
          Batch Prediction
        </button>
        <button 
          onClick={() => setActiveTab('info')} 
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
                   background: activeTab === 'info' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                   color: activeTab === 'info' ? '#000' : 'white',
                   transition: 'all 0.2s' }}
        >
          Model Info
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="animate-fade-in" style={{ background: 'rgba(255, 61, 0, 0.1)', border: '1px solid rgba(255, 61, 0, 0.3)', color: 'var(--error)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      )}

      {/* Single Prediction Tab */}
      {activeTab === 'single' && (
        <div className="animate-fade-in">
          <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
            <form onSubmit={handlePredict}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <label style={{ fontSize: '1.1rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                  Enter SMILES String
                </label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="e.g. CC(=O)Oc1ccccc1C(=O)O (Aspirin)"
                    value={smiles}
                    onChange={(e) => setSmiles(e.target.value)}
                    style={{ flex: '1 1 300px' }}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 0 auto' }}
                    disabled={loading || !smiles}
                  >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <Activity size={20} />}
                    {loading ? 'Analyzing...' : 'Predict'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setSmiles('CC(=O)Oc1ccccc1C(=O)O')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    Try Aspirin
                  </button>
                  <button type="button" onClick={() => setSmiles('CN1C=NC2=C1C(=O)N(C(=O)N2C)C')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    Try Caffeine
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Results Section */}
          {results && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Molecule Visualizations */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {moleculeImg && (
                  <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>2D Structure</p>
                    <div
                      style={{ background: 'white', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'center', minHeight: '300px', alignItems: 'center' }}
                      dangerouslySetInnerHTML={{ __html: moleculeImg }}
                    />
                  </div>
                )}
                
                {molecule3D && (
                  <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>3D Interactive Viewer</p>
                    <div
                      id="mol3d-container"
                      style={{ background: 'white', borderRadius: '12px', height: '332px', width: '100%', position: 'relative' }}
                    ></div>
                  </div>
                )}
              </div>

              {results.HIA && renderResultCard("Human Intestinal Absorption (HIA)", results.HIA, <Beaker size={28} color="var(--primary)" />)}
              {results.HOB && renderResultCard("Human Oral Bioavailability (HOB)", results.HOB, <Pill size={28} color="var(--accent)" />)}
            </div>
          )}
        </div>
      )}

      {/* Batch Prediction Tab */}
      {activeTab === 'batch' && (
        <div className="animate-fade-in glass-panel" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <FileUp size={28} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Batch Prediction</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Upload a CSV file containing a column named <strong>SMILES</strong>. The system will predict HIA and HOB for all molecules and return a downloadable CSV with the results.
          </p>
          
          <form onSubmit={handleBatchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ border: '2px dashed rgba(255,255,255,0.2)', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => setBatchFile(e.target.files[0])}
                style={{ marginBottom: '1rem' }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Supports .csv files only</p>
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={batchLoading || !batchFile}
            >
              {batchLoading ? <RefreshCw className="animate-spin" size={20} /> : <Download size={20} />}
              {batchLoading ? 'Processing Batch...' : 'Upload and Predict'}
            </button>
          </form>
        </div>
      )}

      {/* Model Info Tab */}
      {activeTab === 'info' && (
        <div className="animate-fade-in glass-panel" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <Info size={28} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Model Information & Global SHAP</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            <strong>Human Intestinal Absorption (HIA)</strong> represents the ability of a drug to be absorbed from the intestine into the bloodstream. 
            <br/><strong>Human Oral Bioavailability (HOB)</strong> indicates the fraction of the oral dose that reaches systemic circulation unchanged.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                HIA Model (MACCS Keys + Random Forest)
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Global Feature Importance Summary:</p>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                <img src="/api/static/HIA_summary_plot.png" alt="HIA SHAP Summary" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
              </div>
            </div>
            
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                HOB Model (MACCS Keys + LightGBM)
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Global Feature Importance Summary:</p>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                <img src="/api/static/HOB_summary_plot.png" alt="HOB SHAP Summary" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
