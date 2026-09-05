import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"

import AnnotationPin from "~components/AnnotationPin"
import HighlightBox from "~components/HighlightBox"
import RelationLayer from "~components/RelationLayer"
import Toolbar from "~components/Toolbar"
import { ThemeContext } from "~lib/theme"

import styleText from "data-text:~style.css"

import { useOverlay } from "./use-overlay"
import type { useAnnotations } from "./use-annotations"
import type { useLinkMode } from "./use-link-mode"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

export default function Overlay() {
  const {
    isActive,
    ann,
    picking,
    close,
    linkMode,
    activeRelationId,
    setActiveRelationId,
    theme,
    themeMode,
    toggleMode,
  } = useOverlay()

  // Close (✕ / toolbar-icon toggle) must hide the whole overlay even when
  // annotations exist — they stay persisted and are restored on reactivation.
  if (!isActive) return null

  return (
    <ThemeContext.Provider value={{ theme, mode: themeMode, toggleMode }}>
      {picking.hoveredRect && (
        <HighlightBox rect={picking.hoveredRect} label={picking.hoveredLabel} />
      )}

      <RelationSection
        ann={ann}
        linkMode={linkMode}
        activeRelationId={activeRelationId}
        setActiveRelationId={setActiveRelationId}
      />

      <AnnotationPins
        ann={ann}
        linkMode={linkMode}
        setActiveRelationId={setActiveRelationId}
      />

      <Toolbar
        annotations={ann.annotations}
        activeAnnotationId={ann.activeId}
        metadata={ann.metadata}
        relations={ann.relations}
        onSelectAnnotation={ann.setActiveId}
        onDeleteAnnotation={ann.handleDeleteAnnotation}
        onReorderAnnotations={ann.handleReorderAnnotations}
        onDeleteRelation={ann.deleteRelation}
        onClearAll={ann.handleClearAll}
        onClose={close}
        onImportAnnotations={ann.handleImportAnnotations}
      />
    </ThemeContext.Provider>
  )
}

type Ann = ReturnType<typeof useAnnotations>
type LinkMode = ReturnType<typeof useLinkMode>

interface RelationSectionProps {
  ann: Ann
  linkMode: LinkMode
  activeRelationId: number | null
  setActiveRelationId: (id: number | null) => void
}

function RelationSection({
  ann,
  linkMode,
  activeRelationId,
  setActiveRelationId,
}: RelationSectionProps) {
  if (ann.relations.length === 0 && linkMode.pendingRelation === null) return null
  return (
    <RelationLayer
      relations={ann.relations}
      annotations={ann.annotations}
      pendingRelation={linkMode.pendingRelation}
      activeRelationId={activeRelationId}
      onSelectRelation={(id) => {
        setActiveRelationId(id)
        ann.setActiveId(null)
      }}
      onDeselectRelation={() => setActiveRelationId(null)}
      onUpdateInstruction={ann.updateRelationInstruction}
      onDeleteRelation={(id) => {
        ann.deleteRelation(id)
        setActiveRelationId(null)
      }}
      onConfirmPending={(instruction) => {
        const pending = linkMode.pendingRelation
        if (!pending) return
        if (ann.addRelation(pending.fromId, pending.toId, instruction)) {
          linkMode.cancelPending()
        }
      }}
      onCancelPending={linkMode.cancelPending}
    />
  )
}

interface AnnotationPinsProps {
  ann: Ann
  linkMode: LinkMode
  setActiveRelationId: (id: number | null) => void
}

function AnnotationPins({ ann, linkMode, setActiveRelationId }: AnnotationPinsProps) {
  return (
    <>
      {ann.annotations.map((annotation) => (
        <AnnotationPin
          key={annotation.id}
          annotation={annotation}
          isActive={ann.activeId === annotation.id}
          onClick={() => {
            ann.setActiveId(annotation.id)
            setActiveRelationId(null)
          }}
          onUpdateInstruction={ann.handleUpdateInstruction}
          onDelete={ann.handleDeleteAnnotation}
          onDeselect={() => ann.setActiveId(null)}
          isLinkSource={linkMode.linkFromId === annotation.id}
          linkModeActive={linkMode.linkFromId !== null}
          onStartLink={() => linkMode.startLink(annotation.id)}
        />
      ))}
    </>
  )
}
