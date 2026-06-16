import { useState, useEffect, useRef } from 'react'

/**
 * Animates a number from its previous value to `target` over `duration` ms.
 * Starts the next animation from the current animated position (smooth chaining).
 */
export function useCountUp(target, duration = 550) {
  const [display, setDisplay] = useState(target)
  const currentRef = useRef(target)   // tracks live animated value, not the target
  const rafRef     = useRef(null)

  useEffect(() => {
    if (target == null) {
      setDisplay(null)
      currentRef.current = null
      return
    }
    if (currentRef.current == null) {
      currentRef.current = target
      setDisplay(target)
      return
    }
    if (target === currentRef.current) return

    const from  = currentRef.current
    const start = performance.now()

    cancelAnimationFrame(rafRef.current)

    function tick(now) {
      const t     = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)          // ease-out cubic
      const val   = from + (target - from) * eased
      currentRef.current = val
      setDisplay(val)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        currentRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return display
}
