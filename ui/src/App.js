// src/App.js
import React, { useState, useEffect, useMemo } from "react"
import "./App.css"

function App() {
  const [village, setVillage] = useState("")
  const [soil, setSoil] = useState([])
  const [weather, setWeather] = useState([])
  const [mandi, setMandi] = useState([])
  const [loading, setLoading] = useState(false)
  const [debouncedVillage, setDebouncedVillage] = useState("")
  // Filters for weather and mandi
  const [stateFilter, setStateFilter] = useState("")
  const [startDate, setStartDate] = useState("") // yyyy-mm-dd
  const [endDate, setEndDate] = useState("")   // yyyy-mm-dd
  // Search UX state
  const [recentSearches, setRecentSearches] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)

  // Debounce the village input to avoid fetching on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedVillage(village.trim()), 400)
    return () => clearTimeout(t)
  }, [village])

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('agri_recent_villages')
      if (raw) setRecentSearches(JSON.parse(raw))
    } catch {}
  }, [])

  // Persist recent searches on change
  useEffect(() => {
    try { localStorage.setItem('agri_recent_villages', JSON.stringify(recentSearches.slice(0, 8))) } catch {}
  }, [recentSearches])

  useEffect(() => {
    const fetchData = async () => {
      if (!debouncedVillage) return;

      setLoading(true);
      try {
        // Build weather and mandi URLs with optional filters
        let weatherUrl = `http://localhost:8000/v1/weather`;
        const wParams = new URLSearchParams();
        if (stateFilter) wParams.set('state', stateFilter);
        if (startDate) wParams.set('start', startDate);
        if (endDate) wParams.set('end', endDate);
        if (wParams.toString()) weatherUrl += `?${wParams.toString()}`;

        let mandiUrl = `http://localhost:8000/v1/mandi`;
        const mParams = new URLSearchParams();
        if (stateFilter) mParams.set('state', stateFilter);
        if (startDate) mParams.set('start', startDate);
        if (endDate) mParams.set('end', endDate);
        if (mParams.toString()) mandiUrl += `?${mParams.toString()}`;

        const [soilRes, weatherRes, mandiRes] = await Promise.all([
          fetch(`http://localhost:8000/v1/soil?village=${encodeURIComponent(debouncedVillage)}`),
          fetch(weatherUrl),
          fetch(mandiUrl)
        ]);

        const soilData = await soilRes.json();
        const weatherData = await weatherRes.json();
        const mandiData = await mandiRes.json();

        setSoil(Array.isArray(soilData) ? soilData : []);
        setWeather(Array.isArray(weatherData) ? weatherData : []);
        setMandi(Array.isArray(mandiData) ? mandiData : []);
        // Update recent searches when a search occurs
        if (debouncedVillage) {
          setRecentSearches(prev => {
            const next = [debouncedVillage, ...prev.filter(v => v.toLowerCase() !== debouncedVillage.toLowerCase())]
            return next.slice(0, 8)
          })
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [debouncedVillage, stateFilter, startDate, endDate]); // Refetch when filters change

  useEffect(() => {
    console.log("SOIL UPDATED:", soil);
    console.log("WEATHER UPDATED:", weather);
    console.log("MANDI UPDATED:", mandi);
  }, [soil, weather, mandi]);

  // Derived: unique states for dropdown (from weather and mandi)
  const stateOptions = useMemo(() => {
    const set = new Set();
    weather.forEach(w => { if (w.state) set.add(w.state); });
    mandi.forEach(m => { if (m.state) set.add(m.state); });
    return Array.from(set).sort();
  }, [weather, mandi]);

  // Summary helpers
  const latestSoil = soil && soil.length ? soil[0] : null;
  const latestWeather = weather && weather.length ? weather[0] : null;
  const topMandi = useMemo(() => {
    if (!mandi || !mandi.length) return null;
    return mandi.reduce((a, b) => {
      const av = a?.modal_price_inr_per_qtl ?? -Infinity;
      const bv = b?.modal_price_inr_per_qtl ?? -Infinity;
      return bv > av ? b : a;
    });
  }, [mandi]);

  // Suggestions helper
  const getSuggestions = () => {
    const q = village.trim().toLowerCase();
    if (!q) return recentSearches.slice(0, 8);
    return recentSearches.filter(v => v.toLowerCase().includes(q)).slice(0, 8);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex flex-col items-center p-6">
      <div className="w-full max-w-3xl mb-8 lg:mb-12 text-center">
        <h1 className="text-3xl font-extrabold text-green-800 tracking-tight">🌾 स्मार्ट किसान परामर्श</h1>
        <p className="text-green-700 mt-1">Search a village to see soil, weather, and market insights.</p>
      </div>

      {/* Input Section */}
      <div className="w-full max-w-5xl mb-8 lg:mb-12 mt-10 lg:mt-20 sticky top-10 z-30 bg-transparent mx-auto">
        <div className="relative group w-full max-w-3xl mx-auto">
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-green-700 text-xl lg:text-2xl">🔎</span>
          <input
            type="text"
            value={village}
            onChange={(e) => { setVillage(e.target.value); setShowSuggestions(true); setActiveSuggestion(-1); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            onKeyDown={(e) => {
              if (!showSuggestions) return;
              const items = getSuggestions();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion(i => Math.min(i + 1, items.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion(i => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                if (activeSuggestion >= 0 && items[activeSuggestion]) {
                  setVillage(items[activeSuggestion]);
                  setShowSuggestions(false);
                }
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            placeholder="Search village..."
            className="w-full pl-14 pr-16 py-5 text-xl lg:text-2xl search-input"
          />
          {/* <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
            {village && (
              <button
                onClick={() => setVillage("")}
                className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                title="Clear"
              >
                ✖
              </button>
            )}
          </div> */}
          {/* Suggestions Dropdown */}
          {showSuggestions && getSuggestions().length > 0 && (
            <div className="suggestions-panel">
              {getSuggestions().map((s, idx) => (
                <div
                  key={`${s}-${idx}`}
                  className={`suggestion-item ${idx === activeSuggestion ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setVillage(s); setShowSuggestions(false); }}
                >
                  <span className="suggestion-icon">📍</span>
                  <span>{s}</span>
                  <span className="suggestion-meta">recent</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="filters-toolbar">
          <div className="filter-control">
            <label>State (Weather & Mandi)</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-green-200 bg-white/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500 transition"
            >
              <option value="">All States</option>
              {stateOptions.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          <div className="filter-control">
            <label>Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-green-200 bg-white/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500 transition"
            />
          </div>
          <div className="filter-control">
            <label>End date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-green-200 bg-white/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500 transition"
              />
              {(stateFilter || startDate || endDate) && (
                <button
                  onClick={() => { setStateFilter(""); setStartDate(""); setEndDate(""); }}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                  title="Clear filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1 ml-1">सुझाव: गाँव डालने पर मिट्टी का डेटा मिलेगा। मौसम और मंडी में वैकल्पिक राज्य/तारीख फ़िल्टर लागू होंगे।</div>
      </div>

      {/* Data Cards */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-4 fade-in">
            <h2 className="text-2xl font-bold text-white">
              {debouncedVillage ? `${debouncedVillage} - Agricultural Insights` : 'Search for a Village'}
            </h2>
            <p className="text-green-100 text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Summary Cards */}
          {!loading && (soil?.length || weather?.length || mandi?.length) ? (
            <div className="px-6 py-4 bg-white/60 border-b border-gray-100 fade-in delay-100">
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-icon">🧪</div>
                  <div>
                    <div className="summary-title">Soil pH</div>
                    <div className="summary-value">{latestSoil?.ph ?? '—'}</div>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">🌡️</div>
                  <div>
                    <div className="summary-title">Max Temperature</div>
                    <div className="summary-value">{latestWeather?.max_temp_c != null ? `${latestWeather.max_temp_c}°C` : '—'}</div>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">🏷️</div>
                  <div>
                    <div className="summary-title">Top Mandi Price</div>
                    <div className="summary-value">{topMandi?.modal_price_inr_per_qtl != null ? `₹${topMandi.modal_price_inr_per_qtl}` : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Loading State */}
          {loading && (
            <div className="p-8">
              <div className="flex flex-col items-center mb-6">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-green-500">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gathering data for {debouncedVillage || 'your village'}...
                </div>
              </div>
              {/* Skeletons */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[0,1,2].map(i => (
                  <div key={i} className="rounded-xl border border-gray-100 p-4 animate-pulse">
                    <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          {!loading && (soil?.length > 0 || weather?.length > 0 || mandi?.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 fade-in">
              {/* Soil Data (backend fields: ph, nitrogen, phosphorus, potassium, moisture, village, sample_date) */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 slide-up delay-100">
                <div className="bg-green-700 px-4 py-3">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <span className="mr-2">🌱</span>मिट्टी विश्लेषण
                  </h3>
                </div>
                <div className="p-4">
                  {soil?.length > 0 ? (
                    <div className="table-wrap">
                      <table className="agri-table">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr className="text-left text-gray-600">
                            <th className="px-3 py-2">गांव</th>
                            <th className="px-3 py-2">नमूना तिथि</th>
                            <th className="px-3 py-2 text-numeric">नमी</th>
                            <th className="px-3 py-2 text-numeric">pH</th>
                            <th className="px-3 py-2 text-numeric">नाइट्रोजन (N)</th>
                            <th className="px-3 py-2 text-numeric">फॉस्फोरस (P)</th>
                            <th className="px-3 py-2 text-numeric">पोटैशियम (K)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {soil.map((item, idx) => (
                            <tr key={idx} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 font-medium text-gray-900">{item.village || '—'}</td>
                              <td className="px-3 py-2">{item.sample_date ? new Date(item.sample_date).toLocaleDateString() : '—'}</td>
                              <td className="px-3 py-2 text-numeric">{item.moisture != null ? `${item.moisture}%` : '—'}</td>
                              <td className="px-3 py-2 text-numeric">{item.ph ?? '—'}</td>
                              <td className="px-3 py-2 text-numeric">{item.nitrogen ?? '—'}</td>
                              <td className="px-3 py-2 text-numeric">{item.phosphorus ?? '—'}</td>
                              <td className="px-3 py-2 text-numeric">{item.potassium ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No soil data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Weather Data (backend fields: max_temp_c, min_temp_c, rainfall_mm, humidity_pct, date, state, district) */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 slide-up delay-200">
                <div className="bg-blue-600 px-4 py-3">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <span className="mr-2">🌦️</span>मौसम की स्थिति
                  </h3>
                </div>
                <div className="p-4">
                  {weather?.length > 0 ? (
                    <div className="table-wrap">
                      <table className="agri-table">
                        <thead className="bg-blue-50 sticky top-0 z-10">
                          <tr className="text-left text-blue-700">
                            <th className="px-3 py-2 text-numeric">अधिकतम तापमान (°C)</th>
                            <th className="px-3 py-2 text-numeric">न्यूनतम तापमान (°C)</th>
                            <th className="px-3 py-2 text-numeric">वर्षा (मिमी)</th>
                            <th className="px-3 py-2 text-numeric">आर्द्रता (%)</th>
                            <th className="px-3 py-2">तिथि</th>
                            <th className="px-3 py-2">राज्य</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weather.map((item, idx) => (
                            <tr key={idx} className={idx % 2 ? 'bg-white' : 'bg-blue-50/40'}>
                              <td className="px-3 py-2 text-numeric font-medium text-gray-900">{item.max_temp_c != null ? item.max_temp_c : '—'}</td>
                              <td className="px-3 py-2 text-numeric">{item.min_temp_c != null ? item.min_temp_c : '—'}</td>
                              <td className="px-3 py-2 text-numeric">{item.rainfall_mm != null ? item.rainfall_mm : '—'}</td>
                              <td className="px-3 py-2 text-numeric">{item.humidity_pct != null ? item.humidity_pct : '—'}</td>
                              <td className="px-3 py-2 text-xs text-gray-600">{item.date ? new Date(item.date).toLocaleDateString() : '—'}</td>
                              <td className="px-3 py-2">{item.state || item.district || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No weather data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Market Prices (backend fields: commodity, mandi, modal_price_inr_per_qtl, date, state, arrivals_qtl, variety) */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 slide-up delay-300">
                <div className="bg-amber-600 px-4 py-3">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <span className="mr-2">🏪</span>मंडी मूल्य
                  </h3>
                </div>
                <div className="p-4">
                  {mandi?.length > 0 ? (
                    <div className="table-wrap">
                      <table className="agri-table">
                        <thead className="bg-amber-50 sticky top-0 z-10">
                          <tr className="text-left text-amber-800">
                            <th className="px-3 py-2">वस्तु</th>
                            <th className="px-3 py-2">मंडी</th>
                            <th className="px-3 py-2 text-numeric">औसत मूल्य</th>
                            <th className="px-3 py-2">किस्म</th>
                            <th className="px-3 py-2">तिथि</th>
                            <th className="px-3 py-2">राज्य</th>
                            <th className="px-3 py-2 text-numeric">आवक (क्विंटल)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mandi.map((item, idx) => (
                            <tr key={idx} className={idx % 2 ? 'bg-white' : 'bg-amber-50/40'}>
                              <td className="px-3 py-2 font-medium text-amber-900">{item.commodity || '—'}</td>
                              <td className="px-3 py-2">{item.mandi || '—'}</td>
                              <td className="px-3 py-2 text-numeric">{item.modal_price_inr_per_qtl != null ? `₹${item.modal_price_inr_per_qtl}` : '—'}</td>
                              <td className="px-3 py-2">{item.variety || '—'}</td>
                              <td className="px-3 py-2">{item.date ? new Date(item.date).toLocaleDateString() : '—'}</td>
                              <td className="px-3 py-2">{item.state || '—'}</td>
                              <td className="px-3 py-2 text-numeric">{item.arrivals_qtl != null ? item.arrivals_qtl : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No market price data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !soil?.length && !weather?.length && !mandi?.length && village && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No data found</h3>
              <p className="text-gray-500">We couldn't find any data for {village}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
