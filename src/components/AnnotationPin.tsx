import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from "react"

import { TrashIcon } from "~components/icons"
import { stopOverlayKeyPropagation } from "~lib/overlay-keys"
import { type Theme, useTheme } from "~lib/theme"
import type { Annotation, StyleDelta } from "~lib/types"

import {
  headerActionsStyle,
  headerTextStyle,
  iconButtonStyle,
  idBadgeStyle,
  linkButtonStyle,
  type PinMarkerState,
  pinMarkerStyle,
  popoverContainerStyle,
  popoverTextareaStyle,
  saveButtonStyle,
  tagCodeStyle,
  thumbnailStyle,
} from "./annotation-pin-styles"
import InstructionChips from "./instruction-chips"
import StyleTweakPanel from "./style-tweak-panel"
import { useAnnotationDraft } from "./use-annotation-draft"
import { usePinPopoverPlacement } from "./use-pin-popover-placement"

interface UpdatePayload {
  instruction: string
  tags?: string[]
  styleDelta?: StyleDelta[]
}

interface Props {
  annotation: Annotation
  isActive: boolean
  onClick: () => void
  onUpdateInstruction: (id: number, payload: UpdatePayload) => void
  onDelete: (id: number) => void
  onDeselect: () => void
  /** This pin is the current "Link" source (see `use-link-mode.ts`). */
  isLinkSource?: boolean
  /** Link mode is active (for some pin, not necessarily this one). */
  linkModeActive?: boolean
  onStartLink: () => void
}

export default function AnnotationPin(props: Props) {
  const { annotation, isActive, onClick, onUpdateInstruction, onDeselect } =
    props
  const { theme } = useTheme()
  const {
    draft,
    setDraft,
    draftTags,
    onToggleTag: handleToggleTag,
    draftStyleDelta,
    setDraftStyleDelta,
    textareaRef,
  } = useAnnotationDraft(annotation, isActive)

  const handleSave = () => {
    onUpdateInstruction(annotation.id, {
      instruction: draft,
      tags: draftTags,
      styleDelta: draftStyleDelta,
    })
    onDeselect()
  }

  // Convert document-relative position to viewport-relative
  const pos = {
    x: annotation.pageX - window.scrollX,
    y: annotation.pageY - window.scrollY,
  }
  const placement = usePinPopoverPlacement(pos, isActive)

  return (
    <>
      <PinMarker
        pos={pos}
        id={annotation.id}
        theme={theme}
        state={{
          isActive,
          isLinkSource: props.isLinkSource,
          linkModeActive: props.linkModeActive,
        }}
        onActivate={() => (isActive ? handleSave() : onClick())}
      />
      {isActive && (
        <PinPopover
          annotation={annotation}
          theme={theme}
          draft={draft}
          setDraft={setDraft}
          draftTags={draftTags}
          onToggleTag={handleToggleTag}
          onStyleDeltaChange={setDraftStyleDelta}
          textareaRef={textareaRef}
          placement={placement}
          onSave={handleSave}
          onDelete={props.onDelete}
          onDeselect={onDeselect}
          onStartLink={props.onStartLink}
        />
      )}
    </>
  )
}

interface PinMarkerProps {
  pos: { x: number; y: number }
  id: number
  theme: Theme
  state: PinMarkerState
  onActivate: () => void
}

function PinMarker({ pos, id, theme, state, onActivate }: PinMarkerProps) {
  return (
    <div
      data-testid={`tegakari-pin-${id}`}
      onClick={(e) => {
        e.stopPropagation()
        onActivate()
      }}
      style={pinMarkerStyle(theme, pos, state)}
    >
      {id}
    </div>
  )
}

interface PinPopoverProps {
  annotation: Annotation
  theme: Theme
  draft: string
  setDraft: (value: string) => void
  draftTags: string[]
  onToggleTag: (id: string) => void
  onStyleDeltaChange: (styleDelta: StyleDelta[] | undefined) => void
  textareaRef: RefObject<HTMLTextAreaElement>
  placement: {
    ref: RefObject<HTMLDivElement>
    style: CSSProperties
  }
  onSave: () => void
  onDelete: (id: number) => void
  onDeselect: () => void
  onStartLink: () => void
}

function PinPopover({
  annotation,
  theme,
  draft,
  setDraft,
  draftTags,
  onToggleTag,
  onStyleDeltaChange,
  textareaRef,
  placement,
  onSave,
  onDelete,
  onDeselect,
  onStartLink,
}: PinPopoverProps) {
  return (
    <div
      ref={placement.ref}
      data-testid={`tegakari-popover-${annotation.id}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={stopOverlayKeyPropagation}
      onKeyUp={stopOverlayKeyPropagation}
      style={{ ...popoverContainerStyle(theme), ...placement.style }}
    >
      <PinPopoverHeader
        annotation={annotation}
        theme={theme}
        onDelete={() => {
          onDelete(annotation.id)
          onDeselect()
        }}
        onStartLink={() => {
          onStartLink()
          onDeselect()
        }}
      />
      {annotation.screenshot && (
        <img
          src={annotation.screenshot}
          alt="Element screenshot"
          style={thumbnailStyle(theme)}
        />
      )}
      <InstructionChips
        theme={theme}
        selected={draftTags}
        onToggle={onToggleTag}
      />
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => handlePopoverKey(e, onSave)}
        placeholder="指示を入力... (Cmd+Enter で保存)"
        rows={3}
        style={popoverTextareaStyle(theme)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.accent
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = theme.border
        }}
      />
      <StyleTweakPanel
        theme={theme}
        annotation={annotation}
        isActive={true}
        onChange={onStyleDeltaChange}
      />
      <button onClick={onSave} style={saveButtonStyle(theme)}>
        Save
      </button>
    </div>
  )
}

interface PinPopoverHeaderProps {
  annotation: Annotation
  theme: Theme
  onDelete: () => void
  onStartLink: () => void
}

function PinPopoverHeader({
  annotation,
  theme,
  onDelete,
  onStartLink,
}: PinPopoverHeaderProps) {
  const { tag, text } = annotation.elementInfo
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={idBadgeStyle(theme)}>{annotation.id}</span>
      <code style={tagCodeStyle(theme)}>{`<${tag}>`}</code>
      {text && (
        <span style={headerTextStyle(theme)}>
          {text.slice(0, 15)}
          {text.length > 15 ? "..." : ""}
        </span>
      )}
      <div style={headerActionsStyle}>
        <button
          onClick={onStartLink}
          title="Link to another pin"
          style={linkButtonStyle(theme)}
        >
          Link
        </button>
        <IconButton title="Delete" onClick={onDelete}>
          <TrashIcon color={theme.danger} />
        </IconButton>
      </div>
    </div>
  )
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button onClick={onClick} title={title} style={iconButtonStyle}>
      {children}
    </button>
  )
}

function handlePopoverKey(
  e: KeyboardEvent<HTMLTextAreaElement>,
  onSave: () => void
) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    onSave()
  }
  if (e.key === "Escape") {
    e.stopPropagation()
    onSave()
  }
}
