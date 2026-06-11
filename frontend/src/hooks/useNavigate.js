import { useApp } from '../context/AppContext'

export function useNavigate() {
  const { navigate, goBack } = useApp()
  return { navigate, goBack }
}
