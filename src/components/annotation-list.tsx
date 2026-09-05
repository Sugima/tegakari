import { type DragEvent, useCallback, useState } from "react"

import { type Theme, useTheme } from "~lib/theme"
import type { Annotation } from "~lib/types"

import { AnnotationRow } from "./annotation-row"
import { type DropEdge, emptyStyle, listStyle } from "./inbox-styles"

interface Props {
  annotations: Annotation[]
  activeAnnotationId: number | null
  copiedItemId: number | null
  onSelectAnnotation: (id: number) => void
  onCopyItem: (annotation: Annotation) => void
  onDeleteAnnotation: (id: number) => void
  onReorderAnnotations: (fromIndex: number, toIndex: number) => void
}

export function AnnotationList(props: Props) {
  const { theme } = useTheme()
  const drag = useRowDrag(props.onReorderAnnotations)

  if (props.annotations.length === 0) {
    return <EmptyList theme={theme} />
  }

  return (
    <div style={listStyle}>
      {props.annotations.map((annotation, index) => (
        <AnnotationRow
          key={annotation.id}
          annotation={annotation}
          isSelected={props.activeAnnotationId === annotation.id}
          copiedItemId={props.copiedItemId}
          drag={{
            dragging: drag.fromIndex === index,
            dropEdge: drag.dropEdgeFor(index),
            onDragStart: () => drag.start(index),
            onDragOver: (e) => drag.over(e, index),
            onDrop: () => drag.drop(index),
            onDragEnd: drag.end,
          }}
          onSelect={() => props.onSelectAnnotation(annotation.id)}
          onCopy={() => props.onCopyItem(annotation)}
          onDelete={() => props.onDeleteAnnotation(annotation.id)}
        />
      ))}
    </div>
  )
}

function EmptyList({ theme }: { theme: Theme }) {
  return (
    <div style={listStyle}>
      <div style={emptyStyle(theme)}>Click elements on the page to annotate</div>
    </div>
  )
}

/**
 * Native HTML5 drag state for the list. Dropping on a row inserts the dragged
 * annotation at that row's index; the indicator line is drawn on the edge the
 * dragged row is coming from, so it reads as "it lands here".
 */
function useRowDrag(onReorder: (fromIndex: number, toIndex: number) => void) {
  const [fromIndex, setFromIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const end = useCallback(() => {
    setFromIndex(null)
    setOverIndex(null)
  }, [])

  const over = useCallback((e: DragEvent, index: number) => {
    // Required, or the browser refuses the drop.
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setOverIndex(index)
  }, [])

  const drop = useCallback(
    (index: number) => {
      if (fromIndex !== null && fromIndex !== index) onReorder(fromIndex, index)
      end()
    },
    [fromIndex, onReorder, end]
  )

  const dropEdgeFor = useCallback(
    (index: number): DropEdge => {
      if (fromIndex === null || overIndex !== index || fromIndex === index) return null
      return fromIndex > index ? "top" : "bottom"
    },
    [fromIndex, overIndex]
  )

  return { fromIndex, start: setFromIndex, over, drop, end, dropEdgeFor }
}
