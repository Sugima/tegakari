import { type ReactNode, useCallback, useState } from "react"

import { TrashIcon } from "~components/icons"
import { stopOverlayKeyPropagation } from "~lib/overlay-keys"
import { type Theme, useTheme } from "~lib/theme"
import type { Annotation, PageMetadata, Relation } from "~lib/types"

import { AnnotationList } from "./annotation-list"
import { RelationRow } from "./relation-row"
import { ShareBar } from "./share-bar"
import {
  clearButtonStyle,
  headerStyle,
  panelStyle,
  prefixInputStyle,
  prefixRowStyle,
  relationsHeaderStyle,
  relationsSectionStyle,
} from "./inbox-styles"

interface Props {
  annotations: Annotation[]
  activeAnnotationId: number | null
  metadata: PageMetadata | null
  relations: Relation[]
  prefix: string
  matchedPrefix: string | null
  copiedItemId: number | null
  onPrefixChange: (value: string) => void
  onSelectAnnotation: (id: number) => void
  onCopyItem: (annotation: Annotation) => void
  onDeleteAnnotation: (id: number) => void
  onReorderAnnotations: (fromIndex: number, toIndex: number) => void
  onDeleteRelation: (id: number) => void
  onClearAll: () => void
  onImportAnnotations: (imported: Annotation[], relations?: Relation[]) => void
}

export default function InboxPanel(props: Props) {
  const { theme } = useTheme()

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={stopOverlayKeyPropagation}
      onKeyUp={stopOverlayKeyPropagation}
      style={panelStyle(theme)}>
      <InboxHeader
        theme={theme}
        count={props.annotations.length}
        onClearAll={props.onClearAll}
        shareBar={
          <ShareBar
            theme={theme}
            annotations={props.annotations}
            relations={props.relations}
            metadata={props.metadata}
            onImportAnnotations={props.onImportAnnotations}
          />
        }
      />
      <PrefixInput
        theme={theme}
        prefix={props.prefix}
        matchedPrefix={props.matchedPrefix}
        onPrefixChange={props.onPrefixChange}
      />
      <AnnotationList
        annotations={props.annotations}
        activeAnnotationId={props.activeAnnotationId}
        copiedItemId={props.copiedItemId}
        onSelectAnnotation={props.onSelectAnnotation}
        onCopyItem={props.onCopyItem}
        onDeleteAnnotation={props.onDeleteAnnotation}
        onReorderAnnotations={props.onReorderAnnotations}
      />
      <RelationsSection
        theme={theme}
        relations={props.relations}
        onDeleteRelation={props.onDeleteRelation}
      />
    </div>
  )
}

function RelationsSection({
  theme,
  relations,
  onDeleteRelation,
}: {
  theme: Theme
  relations: Relation[]
  onDeleteRelation: (id: number) => void
}) {
  if (relations.length === 0) return null
  return (
    <div style={relationsSectionStyle(theme)}>
      <div style={relationsHeaderStyle(theme)}>Relations ({relations.length})</div>
      {relations.map((relation) => (
        <RelationRow
          key={relation.id}
          relation={relation}
          onDelete={() => onDeleteRelation(relation.id)}
        />
      ))}
    </div>
  )
}

interface HeaderProps {
  theme: Theme
  count: number
  onClearAll: () => void
  shareBar: ReactNode
}

function InboxHeader({ theme, count, onClearAll, shareBar }: HeaderProps) {
  const [confirmClear, setConfirmClear] = useState(false)

  const handleClearAll = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    onClearAll()
    setConfirmClear(false)
  }, [confirmClear, onClearAll])

  return (
    <div style={headerStyle(theme)}>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary }}>
        Annotations{count > 0 ? ` (${count})` : ""}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {shareBar}
        {count > 0 && (
          <button
            onClick={handleClearAll}
            style={clearButtonStyle(
              theme,
              confirmClear ? theme.danger : theme.textMuted
            )}
            title={confirmClear ? "Click again to confirm" : "Clear all"}>
            <TrashIcon color={confirmClear ? theme.danger : theme.textMuted} />
            {confirmClear && (
              <span style={{ fontSize: 10, fontWeight: 600 }}>Confirm?</span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function PrefixInput({
  theme,
  prefix,
  matchedPrefix,
  onPrefixChange,
}: {
  theme: Theme
  prefix: string
  matchedPrefix: string | null
  onPrefixChange: (value: string) => void
}) {
  return (
    <div style={prefixRowStyle(theme)}>
      <input
        type="text"
        value={prefix}
        onChange={(e) => onPrefixChange(e.target.value)}
        placeholder="Prefix (e.g., [repo=my-app])"
        style={prefixInputStyle(theme, Boolean(matchedPrefix))}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.accent
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = matchedPrefix
            ? theme.accent
            : theme.border
        }}
      />
    </div>
  )
}
