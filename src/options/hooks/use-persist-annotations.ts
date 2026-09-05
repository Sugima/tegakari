import { useCallback, useEffect, useState } from "react"

import {
  loadPersistAnnotations,
  PERSIST_ANNOTATIONS_KEY,
  setPersistAnnotations,
} from "~lib/settings"

/** Options-page hook for the "keep annotations after a reload" toggle. */
export function usePersistAnnotations(): {
  enabled: boolean
  toggle: () => void
} {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    loadPersistAnnotations().then(setEnabled)
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      setPersistAnnotations(next)
      return next
    })
  }, [])

  return { enabled, toggle }
}

export { PERSIST_ANNOTATIONS_KEY }
