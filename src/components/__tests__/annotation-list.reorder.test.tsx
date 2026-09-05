import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"

import type { Annotation } from "~lib/types"

import { AnnotationList } from "../annotation-list"

afterEach(cleanup)

function annotation(id: number): Annotation {
  return {
    id,
    elementInfo: { selector: `#a${id}`, tag: "div", text: `row ${id}`, attributes: {} },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX: 0,
    pageY: 0,
    createdAt: id,
  }
}

function dataTransfer() {
  return { setData: vi.fn(), effectAllowed: "", dropEffect: "" }
}

function renderList(onReorder = vi.fn()) {
  render(
    <AnnotationList
      annotations={[annotation(1), annotation(2), annotation(3)]}
      activeAnnotationId={null}
      copiedItemId={null}
      onSelectAnnotation={vi.fn()}
      onCopyItem={vi.fn()}
      onDeleteAnnotation={vi.fn()}
      onReorderAnnotations={onReorder}
    />
  )
  const rows = screen.getAllByText(/row \d/).map((el) => el.closest("[draggable]"))
  return { rows: rows as HTMLElement[], onReorder }
}

it("reports the dragged row's index and the row it was dropped on", () => {
  const { rows, onReorder } = renderList()

  fireEvent.dragStart(rows[0], { dataTransfer: dataTransfer() })
  fireEvent.dragOver(rows[2], { dataTransfer: dataTransfer() })
  fireEvent.drop(rows[2], { dataTransfer: dataTransfer() })

  expect(onReorder).toHaveBeenCalledWith(0, 2)
})

it("ignores a drop on the row being dragged", () => {
  const { rows, onReorder } = renderList()

  fireEvent.dragStart(rows[1], { dataTransfer: dataTransfer() })
  fireEvent.drop(rows[1], { dataTransfer: dataTransfer() })

  expect(onReorder).not.toHaveBeenCalled()
})

it("marks the drop target with an indicator line on the side the row comes from", () => {
  const { rows } = renderList()

  fireEvent.dragStart(rows[2], { dataTransfer: dataTransfer() })
  fireEvent.dragOver(rows[0], { dataTransfer: dataTransfer() })

  // Dragging upwards → the line sits on the target's top edge.
  expect(rows[0].style.boxShadow).toContain("inset 0 2px 0 0")
  expect(rows[1].style.boxShadow).toBe("none")
  // The dragged row itself is dimmed while it travels.
  expect(rows[2].style.opacity).toBe("0.4")
})

it("clears the drag state when the drag is abandoned", () => {
  const { rows } = renderList()

  fireEvent.dragStart(rows[0], { dataTransfer: dataTransfer() })
  fireEvent.dragOver(rows[1], { dataTransfer: dataTransfer() })
  fireEvent.dragEnd(rows[0])

  expect(rows[1].style.boxShadow).toBe("none")
  expect(rows[0].style.opacity).toBe("1")
})
