import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentPage, setCurrentPage]           = useState('upload')
  const [navHistory, setNavHistory]             = useState([])
  const [companies, setCompanies]               = useState([])   // KPI summary per company
  const [metrics, setMetrics]                   = useState({})   // time-series per company
  const [meta, setMeta]                         = useState(null) // upload metadata
  const [primaryCompany, setPrimaryCompany]     = useState(null) // the company being analysed
  const [selectedCompanies, setSelectedCompanies] = useState([]) // comparison companies
  const [selectedYears, setSelectedYears]       = useState(5)    // "Last N years" filter
  const [activeSection, setActiveSection]       = useState('financial-benchmarking')
  const [isDataReady, setIsDataReady]           = useState(false)
  const [aiInsights, setAiInsights]             = useState(null)
  const [chatHistory, setChatHistory]           = useState([])

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
      const c = await cRes.json()
      const m = await mRes.json()
      const d = await metaRes.json()

      setCompanies(c)
      setMetrics(m)
      setMeta(d)
      setIsDataReady(true)

      if (c.length > 0) {
        setPrimaryCompany(c[0].name)
        setSelectedCompanies(c.slice(1).map(co => co.name))
      }
    } catch (e) {
      console.error('loadData failed:', e)
    }
  }, [])

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
      isDataReady,       setIsDataReady,
      loadData,
      aiInsights,  setAiInsights,
      chatHistory, setChatHistory,
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
