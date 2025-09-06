"use client"

import { useState } from "react"
import "./App.css"

function App() {
  const [programName, setProgramName] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [isLocalized, setIsLocalized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [creative, setCreative] = useState(null)
  const [error, setError] = useState("")

  // Inline CreativeDisplay component
  const CreativeDisplay = ({ title, content }) => (
    <div className="creative-card">
      <h4>{title}</h4>
      <p>{content}</p>
    </div>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setCreative(null)

    try {
      const response = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_name: programName,
          target_audience: targetAudience,
          localize: isLocalized,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate creative.")
      const data = await response.json()
      setCreative(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AI Marketing Creative Engine</h1>
        <p>Generate on-brand and localized marketing content instantly.</p>
      </header>

      <main className="main-content">
        <form className="input-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Program Name:</label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g., Data Science Master's"
              required
            />
          </div>

          <div className="form-group">
            <label>Target Audience:</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Working professionals in Bangalore"
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              checked={isLocalized}
              onChange={(e) => setIsLocalized(e.target.checked)}
            />
            <label>Localize for a different market</label>
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate Creatives"}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {creative && (
          <div className="results-container">
            <h2>Generated Creatives:</h2>
            <div className="creatives-grid">
              <CreativeDisplay title="Ad Copy 1" content={creative.ad_copy_1} />
              <CreativeDisplay title="Ad Copy 2" content={creative.ad_copy_2} />
              <CreativeDisplay title="Creative Brief" content={creative.creative_brief} />
            </div>
            <div className="feedback-section">
              <h3>Simulated Performance Dashboard</h3>
              <p>
                Predicted Click-Through Rate (CTR): {creative.performance_score}%
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
