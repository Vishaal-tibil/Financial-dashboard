import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentPage, setCurrentPage]             = useState('connecting')
  const [navHistory, setNavHistory]               = useState([])
  const [companies, setCompanies]                 = useState([])
  const [metrics, setMetrics]                     = useState({})
  const [meta, setMeta]                           = useState(null)
  const [primaryCompany, setPrimaryCompany]       = useState(null)
  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [selectedYears, setSelectedYears]         = useState(5)
  const [activeSection, setActiveSection]         = useState('overview')
  const [selectedFY, setSelectedFY]               = useState(null)
  const [selectedQuarter, setSelectedQuarter]     = useState(null)
  const [isDataReady, setIsDataReady]             = useState(false)
  const [aiInsights, setAiInsights]               = useState(null)
  const [chatHistory, setChatHistory]             = useState([])
  const [panelOpen, setPanelOpen]                 = useState(false)

  const navigate = useCallback((page) => {
    setNavHistory(h => [...h, currentPage])
    setCurrentPage(page)
  }, [currentPage])

  const goBack = useCallback(() => {
    setNavHistory(h => {
      if (!h.length) return h
      setCurrentPage(h[h.length - 1])
      return h.slice(0, -1)
    })
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [cRes, mRes, metaRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/metrics'),
        fetch('/api/meta'),
      ])
      if (!cRes.ok || !mRes.ok || !metaRes.ok) return false

      const c = await cRes.json()
      const m = await mRes.json()
      const d = await metaRes.json()

      if (!Array.isArray(c)) return false

      setCompanies(c)
      setMetrics(m)
      setMeta(d)
      setIsDataReady(true)
      if (c.length > 0) {
        setPrimaryCompany(c[0].name)
        setSelectedCompanies([])
      }
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    let alive = true

    async function poll() {
      while (alive) {
        try {
          const r = await fetch('/api/status')
          const d = await r.json()
          if (!alive) return
          if (d.ready) {
            const ok = await loadData()
            if (alive) setCurrentPage(ok ? 'overview' : 'upload')
          } else {
            if (alive) setCurrentPage('upload')
          }
          return // stop polling once backend responded
        } catch {
          // backend not reachable yet — wait 2s then retry
          await new Promise(res => setTimeout(res, 2000))
        }
      }
    }

    poll()
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={{
      currentPage, navigate, goBack,
      companies, setCompanies,
      metrics,   setMetrics,
      meta,      setMeta,
      primaryCompany,    setPrimaryCompany,
      selectedCompanies, setSelectedCompanies,
      selectedYears,     setSelectedYears,
      activeSection,     setActiveSection,
      selectedFY,        setSelectedFY,
      selectedQuarter,   setSelectedQuarter,
      isDataReady,       setIsDataReady,
      loadData,
      aiInsights,  setAiInsights,
      chatHistory, setChatHistory,
      panelOpen,   setPanelOpen,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
