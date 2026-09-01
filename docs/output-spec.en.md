# tegakari Output Specification

**English** | [日本語](./output-spec.md)

## Overview

The Chrome extension "tegakari" lets you select elements on a web page and generates their contextual information in Markdown or JSONL format.
The generated text is copied to the clipboard and pasted into an AI editor such as Claude Code or Cursor for use.

## Supported Frameworks

- React (including Next.js)
- Vue (including Nuxt)
- Svelte (including SvelteKit). Component information is only collected in dev builds (see [Component Tree](#4-component-tree) for details)
- Also works when no framework is detected (some sections are omitted)

## Output Formats

In addition to the five built-in output presets (`jsonl` / `markdown` / `claude-code` / `cursor` / `minimal`) available from the Toolbar dropdown, a user-defined [custom template](#custom-templates) can also be selected. The result is copied to the clipboard for use. The default is `minimal`. See [Output Presets](#output-presets) for details on each preset.

## Section Structure

### 1. User Instruction

Free-form text entered by the user, describing what change or check they want made to the selected element.
It is placed at the top of the output so that when pasted into an AI editor, it reads in the order "what to do → the context of the target."

- The UI provides a text area
- Copied together with the other sections when copying to the clipboard

#### Tags (Quick Instruction Chips)

The pin's popover places six fixed category chips around the instruction text area. This feature lets even non-engineers produce structured instructions just by picking a standard category and adding a short note.

| id | Display label |
|---|---|
| `spacing` | Spacing |
| `color` | Color |
| `text` | Text |
| `size` | Size |
| `align` | Align |
| `remove` | Remove |

- Multiple selection allowed, toggle-style. Selection order is preserved
- Saved as `Annotation.tags?: string[]` (an array of the selected chips' `id`s). If unset or empty, it is treated as "no tags," and the output reflects the same (the corresponding line/tag is omitted)
- When the popover is closed and reopened, the selection state is restored
- Reflected in the output (the content uses the `id` as-is, not the display label):
  - **JSONL**: adds `"tags":["spacing","color"]` to the `annotation` object (if empty, the `tags` key itself is omitted)
  - **Markdown** (common to full/cursor): adds `**Tags**: spacing, color` immediately after the `**Instruction**` line (if empty, the line itself is omitted)
  - **minimal (Feedback Report)**: adds `- Tags: \`spacing, color\`` right after the blockquote, above the `- Element:` line (omitted entirely when empty; see [minimal Preset Format](#minimal-preset-format))
  - **claude-code (XML)**: adds `<tags>spacing, color</tags>` immediately after `<instruction>` (output at this position even when instruction is empty but tags exist; omitted if tags is empty)

#### Style changes (On-page Style Adjustment Mode)

The pin's popover has an adjustment panel, opened via the "Adjust styles" toggle, that lets you adjust the target element's styles with a live preview in place. The v1 target properties (in this fixed order): `margin` / `padding` / `font-size` / `line-height` / `color` / `background-color` / `border-radius` / `gap`.

- Input changes are applied immediately as inline styles on the target element for a live preview. The preview is applied/reverted by first saving the element's original inline style value, then restoring it precisely on reset (so elements that already had inline styles set are not corrupted)
- On save, rows where the before and after values are identical are excluded, and the result is saved as `Annotation.styleDelta?: StyleDelta[]` (an array of `{ property, before, after }`; `property` is unique, and array order follows edit order). If unset or empty, it is treated as "no change," and the output reflects the same (the corresponding section is omitted)
- On revisiting the page (when pins are restored), the preview is not automatically reapplied. The record (styleDelta) remains, but the appearance stays as-is; opening the popover restores the saved values into the rows
- Reflected in the output:
  - **JSONL**: adds `"styleDelta":[{"property":"margin","before":"16px","after":"8px"}]` to the `annotation` object (if empty, the `styleDelta` key itself is omitted)
  - **Markdown** (common to full/cursor): adds the following immediately after the `**Tags**` line (the section is omitted entirely if there is no styleDelta)
    ```
    **Style changes**:
      - margin: 16px → 8px
      - color: rgb(51, 51, 51) → #2563eb
    ```
  - **claude-code (XML)**: adds the following immediately after `<tags>` (at this position even when tags is absent) (the tag is omitted entirely if there is no styleDelta)
    ```
    <style-changes>
    margin: 16px → 8px
    </style-changes>
    ```
    This is distinct from the existing `<style-diff>` (the same content as the Selected Element's Styles, i.e. the current effective style) — do not confuse the two
  - **minimal (Feedback Report)**: adds the following after the element lines (the section is omitted entirely if there is no styleDelta; see [minimal Preset Format](#minimal-preset-format))
    ```
    ### Style Changes
    - font-size: 13px → 16px
    ```

### 2. Page Context

| Item | Content | Retrieval method |
|---|---|---|
| URL | The page's URL | `location.href` |
| Framework | The detected framework name (only when detected. React/Vue have no version; Svelte includes the major version) | Global variable check |
| Meta Framework | The detected meta-framework name (only when detected; e.g. `Next.js (App Router)` / `Nuxt` / `SvelteKit`). A separate line from Framework | Global variable / DOM element check |
| Page Title | The page title | `document.title` |

**Framework detection method:**

- **React**: presence of `__REACT_DEVTOOLS_GLOBAL_HOOK__`
- **Next.js**: presence of `__NEXT_DATA__` (including App Router / Pages Router determination)
- **Vue**: presence of `__vue__` or `__VUE__`
- **Nuxt**: presence of `__NUXT__`
- **Svelte**: prefers `window.__svelte.v` (a Set used for version registration, supported in both dev/prod builds); if obtainable, appends the major version, e.g. `Svelte 5`. Otherwise falls back to the `svelte-` hash class name or the element's `__svelte_meta` (dev build only)
- **SvelteKit**: presence of the `#svelte-announcer` element, `data-sveltekit-*` attributes, or global variables starting with `__sveltekit_`

### 3. Selected Element

| Item | Content | Retrieval method |
|---|---|---|
| Selector | A unique CSS selector path | Traversal upward from the element |
| Tag | The HTML tag name | `element.tagName` |
| Text | The text content | `element.innerText` |
| Attributes | A list of key attributes (class, id, data-*, role, aria-*, name, type, href, etc.) | `element.attributes` |
| Styles | An excerpt of the styles actually in effect (described below) | Diff against the `getComputedStyle` defaults |
| CSS Rules | Same-origin CSS rules matching the selected element (described below) | CSSOM traversal of `document.styleSheets` + `element.matches()` |

#### Styles (Style Diff)

To let the AI respond with measured values to UI-fix instructions like "tighten up this margin" or "change the color," the selected element's computed style is included in the output. However, outputting every property (300+) would be noisy, so it is compressed in the following two stages.

1. **Only curated properties are targeted**: approximately 40 properties covering layout (display, position, flex/grid-related, etc.), box model (width, height, margin, padding, border, border-radius, etc.), typography (font-related, color, etc.), and visual (background, opacity, box-shadow, etc.)
2. **Diff against the tag's default**: the computed style of a plain element of the same tag (generated inside a `display: none` wrapper) is used as the baseline, and matching values are omitted. Values simply inherited from the page root are also included on the baseline side and are thus excluded

**Output condition**: only when there is one or more diff result. Placed after `Attributes`.

#### CSS Rules (CSS Provenance)

Styles (the computed style diff) alone doesn't reveal **which CSS rule** a value came from. So that the AI can determine, from the facts, "which file and which selector should be fixed," the CSSOM of same-origin stylesheets is traversed and the CSS rules matching the selected element are output together with their provenance (file name, selector, declarations, and @media/@supports conditions).

- **Scan target**: `document.styleSheets` (for elements inside a same-origin iframe, that iframe's document). Both `<style>` and `<link>` are scanned, and the insides of grouping rules such as `@media`/`@supports` are traversed recursively
- **Match determination**: `element.matches(rule.selectorText)` for each `CSSStyleRule`
- **Cross-origin constraint**: stylesheets from a different origin (e.g. CSS served from a CDN) raise an exception due to browser security restrictions when `cssRules` is accessed, so they are silently skipped (simply excluded from the output)
- **Collected content** (per rule):
  - `selector`: `selectorText`
  - `source`: the file name portion of the stylesheet's href (e.g. `app.css`). Rules from a `<style>` tag are `inline`
  - `declarations`: the list of `property: value` declared by the rule (`!important` is included in the value)
  - `media`: only when nested inside `@media`/`@supports`, the condition text
- **Limits**: at most 10 rules (not by specificity, but by **reverse document order = last-wins priority**, taking the 10 most recent), and at most 15 declarations per rule. Anything beyond that is truncated
- **Performance constraint**: if the total number of CSS rules on the page exceeds 5,000, the scan is aborted and the partial result gathered so far is returned

##### CSS Variables (Resolving CSS Custom Properties)

If a collected `declarations` value contains `var(--x)`, the final value resolved via `getComputedStyle(element).getPropertyValue("--x")` is separately collected as `customProperties` (up to 10). Intermediate values in a `var()` reference chain are not output — only the finally resolved value is.

**Output condition**: `CSS Rules` is output only when there is one or more matched rule, and `CSS Variables` only when there is one or more referenced custom property. Placed immediately after `Styles`.

### 4. Component Tree

**Display condition**: only when React, Vue, or Svelte is detected. The section itself is omitted when none is detected.

#### For React

- The component hierarchy path (`Parent` → `Child` → `GrandChild`)
- Source (only if obtainable)
- Props
- State

**Retrieval method**: via React Fiber (`__reactFiber$*`, `__reactProps$*`). Requires Main World injection.

#### For Vue

- The component hierarchy path
- Source (only if obtainable)
- Props
- Data

**Retrieval method**: via `__vue__` or `__vueParentComponent`. Requires Main World injection.

#### For Svelte

- The component hierarchy path (built by walking the DOM from the clicked element toward its ancestors, taking each element's `__svelte_meta.loc.file` file name with the extension stripped, ordered root → leaf with duplicates removed. Since Svelte components have no runtime "name," the source file name is used as a substitute)
- Source (`loc.file:line` of the nearest ancestor)
- Props / State are not collected (because Svelte 4's closures and Svelte 5's signals have different internal structures, there is no common runtime representation that can be safely serialized)

**Retrieval method**: searches the DOM element's `__svelte_meta` (attached only in dev builds), starting from the element itself and moving toward its ancestors. Since there is no virtual tree like a fiber/vnode tree, the real DOM is traversed directly. In prod builds `__svelte_meta` is not attached, so while Svelte itself can still be detected, the Component Tree section is omitted.

#### Source (Source Code Location)

Outputs the source file path corresponding to the selected element (with a line number if obtainable) in the form `path/to/file.tsx:42`. This saves the AI editor the effort of locating the target file.

| Framework | Retrieval method | Notes |
|---|---|---|
| React | The Fiber's `_debugSource` (the JSX location where the element is written). Falls back to searching ancestors / `_debugOwner` if not present on the element itself | Dev build only. Not obtainable in React 19, where `_debugSource` was removed |
| Vue 3 | The component's `type.__file` (assigned by the SFC compiler) | Dev build only. No line number |
| Vue 2 | `$options.__file` | Dev build only. No line number |
| Svelte | The element's `__svelte_meta.loc` (`file`/`line`) | Dev build only. Uses the loc of the nearest ancestor element |

**Output condition**: only when obtainable. Normally not obtainable in prod builds, so it is omitted.

### 5. Relations (Cross-Element Relation Annotations)

Expresses **instructions that span two elements**, such as "align the spacing between these two" or "make A the same width as B." It links two existing annotations (pins) together, and the relation itself carries instruction text.

- Clicking the "Link" button in a pin's popover enters link mode; clicking another pin creates a relation between the two pins (the instruction cannot be empty)
- `Relation`: `{ id, fromId, toId, instruction }` (`fromId`/`toId` are `Annotation.id`s; order is not distinguished)
- Duplicate relations for the same pair (regardless of order) cannot be created. When an annotation is deleted, any relation containing its ID is deleted along with it (cascade delete)
- On screen, related pins are connected by an SVG line, and clicking the numbered label at the line's midpoint lets you edit or delete the instruction

**Output condition**: **batch output only** (not included in single-copy or individual pin copy). If there are no relations, the corresponding section/line/tag is not output at all, in any of the formats below.

- **Markdown** (common to full/cursor; omitted by minimal, which uses the [Feedback Report format](#minimal-preset-format)): appended after all `## Annotation` sections
  ```
  ## Relations
  - [#1 ↔ #2] Make the spacing between these equal
  ```
- **JSONL**: one line per relation, after the `annotation` lines
  ```jsonl
  {"type":"relation","id":1,"from":1,"to":2,"instruction":"Make the spacing between these equal"}
  ```
- **claude-code (XML)**: one block per relation, after the `</annotation>` group and before `</tegakari-output>`
  ```
  <relation id="1" from="1" to="2">
  Make the spacing between these equal
  </relation>
  ```

## Output Examples

The output actually copied from the UI is always in **batch format** (`## Page Context` once at the top, followed by a repeated `## Annotation #N` per pin), even when there is only a single pin. A single-object format without an `id` (e.g. `## User Instruction` + `## Selected Element`) does not exist anywhere in the generator code.

### React (Next.js) Site

```markdown
## Page Context
- **URL**: https://example.com/dashboard/settings
- **Framework**: React
- **Meta Framework**: Next.js (App Router)
- **Page Title**: 設定 | Example App

## Annotation #1
**Instruction**: この保存ボタンをクリックしたらconfirmダイアログを表示するようにしたい
- **Selector**: `#settings-form > div:nth-child(2) > button.btn-primary`
- **Tag**: `<button>`
- **Text**: "保存する"
- **Attributes**:
  - class: `btn btn-primary px-4 py-2`
  - data-testid: `settings-submit-btn`
  - type: `submit`
- **Styles**:
  - padding: `8px 16px`
  - border-radius: `8px`
  - background-color: `rgb(37, 99, 235)`
  - color: `rgb(255, 255, 255)`
  - font-size: `14px`
- **Component**: `SettingsPage` → `SettingsForm` → `SubmitButton`
- **Source**: `src/components/SubmitButton.tsx:42`
- **Props**: `{ variant: "primary", disabled: false, onClick: fn }`
- **State**: `{ isSubmitting: false }`
```

### Static Site with No Framework Detected (Component Info Omitted)

```markdown
## Page Context
- **URL**: https://corporate.example.com/about
- **Page Title**: 会社概要 | Example Corp

## Annotation #1
**Instruction**: このリンクの遷移先を /members/tanaka/profile に変更したい
- **Selector**: `.about-section > .team-list > li:nth-child(3) > a`
- **Tag**: `<a>`
- **Text**: "田中太郎"
- **Attributes**:
  - class: `team-member__link`
  - href: `/members/tanaka`
```

### Vue (Nuxt) Site

```markdown
## Page Context
- **URL**: https://shop.example.com/products/123
- **Framework**: Vue
- **Meta Framework**: Nuxt
- **Page Title**: 商品詳細 | Example Shop

## Annotation #1
**Instruction**: 割引価格の表示フォーマットをカンマ区切りに変更したい
- **Selector**: `.product-card > .price-section > span.price`
- **Tag**: `<span>`
- **Text**: "¥1,980"
- **Attributes**:
  - class: `price price--discount`
  - data-original-price: `2,480`
- **Component**: `ProductDetail` → `PriceSection` → `PriceDisplay`
- **Props**: `{ price: 1980, originalPrice: 2480, currency: "JPY" }`
- **Data**: `{ showDiscount: true }`
```

For examples closer to the actual copy output (multiple pins, with Component info), see `docs/store-assets/sample-output.md` / `docs/store-assets/sample-output.jsonl`.

## JSONL Output Format

In JSONL (JSON Lines) format, each section is output as an independent JSON line — a format that's easy for AI editors to parse as structured data. Copying from the UI is always in **batch format**, so even copying a single pin produces one `annotation` line (with an `id`).

### Line Structure

| Line | type | Output condition |
|---|---|---|
| 1 | `prefix` | Only when a prefix rule matches (at the top) |
| 2 | `pageContext` | Always output once |
| 3+ | `annotation` | One line per pin (with `id`, one or more) |
| Last | `relation` | Only when relations exist, one line per relation (**batch output only**. See [Relations](#5-relations-cross-element-relation-annotations) for details) |

Keys composing an `annotation` line: `id` (required), `instruction` (if present), `tags` (if present), `styleDelta` (if present), `element` (required), `component` (only when a framework is detected).

`element` additionally carries a `cssRules` key if there are matched CSS rules, and a `customProperties` key if there are referenced CSS custom properties (see [CSS Rules (CSS Provenance)](#css-rules-css-provenance) for details). If neither exists, the key itself is omitted.

### JSONL Output Examples

#### React (Next.js) Site

```jsonl
{"type":"pageContext","url":"https://example.com/dashboard/settings","pageTitle":"設定 | Example App","framework":"React","metaFramework":"Next.js (App Router)"}
{"type":"annotation","id":1,"instruction":"この保存ボタンをクリックしたらconfirmダイアログを表示するようにしたい","element":{"selector":"#settings-form > div:nth-child(2) > button.btn-primary","tag":"button","text":"保存する","attributes":{"class":"btn btn-primary px-4 py-2","data-testid":"settings-submit-btn","type":"submit"},"styles":{"padding":"8px 16px","border-radius":"8px","background-color":"rgb(37, 99, 235)","color":"rgb(255, 255, 255)","font-size":"14px"}},"component":{"framework":"react","hierarchy":["SettingsPage","SettingsForm","SubmitButton"],"source":"src/components/SubmitButton.tsx:42","props":{"variant":"primary","disabled":false,"onClick":"fn"},"state":{"isSubmitting":false}}}
```

#### Static Site with No Framework Detected

```jsonl
{"type":"pageContext","url":"https://corporate.example.com/about","pageTitle":"会社概要 | Example Corp"}
{"type":"annotation","id":1,"instruction":"このリンクの遷移先を /members/tanaka/profile に変更したい","element":{"selector":".about-section > .team-list > li:nth-child(3) > a","tag":"a","text":"田中太郎","attributes":{"class":"team-member__link","href":"/members/tanaka"}}}
```

#### Vue (Nuxt) Site

```jsonl
{"type":"pageContext","url":"https://shop.example.com/products/123","pageTitle":"商品詳細 | Example Shop","framework":"Vue","metaFramework":"Nuxt"}
{"type":"annotation","id":1,"instruction":"割引価格の表示フォーマットをカンマ区切りに変更したい","element":{"selector":".product-card > .price-section > span.price","tag":"span","text":"¥1,980","attributes":{"class":"price price--discount","data-original-price":"2,480"}},"component":{"framework":"vue","hierarchy":["ProductDetail","PriceSection","PriceDisplay"],"props":{"price":1980,"originalPrice":2480,"currency":"JPY"},"data":{"showDiscount":true}}}
```

## Output Presets

In the Toolbar's format dropdown, in addition to the Markdown/JSONL described above, three more presets can be selected. Each preset is defined as a combination of "base format + which sections are kept and at what depth," and whichever preset is currently selected is applied regardless of the copy path used — single copy, batch copy, or individual pin copy. The prefix rule (`[repo=...]`) is still prepended to the very top of the output regardless of preset, as before.

| preset id | Base format | Content |
|---|---|---|
| `jsonl` | JSONL | The existing full output (default) |
| `markdown` | Markdown | The existing full output |
| `claude-code` | XML tag structure | The XML wrapper format described below. Also serves as the auto-trigger marker for the tegakari-fix skill |
| `cursor` | Markdown | A condensed version. Page Context has only url/title/framework (batch metadata is omitted); Component Tree has only names (up to the 3 levels nearest the selected element) and Source, with Props/State omitted |
| `minimal` | Markdown (own structure) | A review-comment style **Feedback Report** (the default). The instruction is quoted, followed by Tags, the element lines — Element/Selector/Classes/Text — and a `### Style Changes` block when a styleDelta exists. Attributes as a whole, Styles (effective styles), CSS Rules/CSS Variables, Component Tree and Relations are omitted. See [minimal Preset Format](#minimal-preset-format) below |

### minimal Preset Format

Produced by `src/lib/feedback-generator.ts`. Unlike the other presets it does not reuse the Markdown generator's section structure; it has its own review-comment shape.

```
[repo=my-app]            ← only when a prefix rule matches
---

# Feedback Report
URL: <page URL>

## Feedback #1
> the user's instruction text

- Tags: `spacing, color`
- Element: `<button>`
- Selector: `button.btn`
- Classes: `btn, btn-ghost, btn-lg, btn-block`
- Text: "Sign in with another account"

### Style Changes
- font-size: 13px → 16px

## Feedback #2
...
```

- The section number `#N` is the annotation's `id` (it matches the pin number on the page, not the position in the array)
- Each line of the instruction is prefixed with `> `, so multi-line text stays quoted. When the instruction is empty the blockquote is dropped entirely and only the heading remains
- `Style Changes` is emitted only when there is a `styleDelta`, **after** the element lines, as an `###` heading plus a `- property: before → after` list (so the element bullet list stays unbroken). The entry lines come from the Markdown preset's shared `styleDeltaEntryLines` helper
- `Tags` is the selected quick-instruction chip **ids** (not their display labels) joined with commas, with the whole list wrapped in a single code span. It sits above the element lines. When there are no tags the line is omitted
- `Classes` is the `class` attribute split on whitespace and joined with commas, with the whole list wrapped in a single code span. When the element has no classes the line is omitted
- When `Text` is empty its line is omitted. `Element` and `Selector` are always emitted
- With zero annotations only the header (`---` through `URL:`) is emitted
- The prefix rule (`[repo=...]`) goes above the `---`, at the very top of the output

### claude-code Preset Format

```
[repo=my-app]            ← only when a prefix rule matches
<tegakari-output version="1" preset="claude-code">
<page-context>
(Same content lines as the Page Context section)
</page-context>
<annotation id="1">
<instruction>
(User instruction text. Omitted entirely if absent)
</instruction>
<tags>spacing, color</tags>  ← only if quick-instruction chips are selected
<style-changes>
(Same content as Style changes. Omitted entirely if there is no styleDelta. Distinct from <style-diff>)
</style-changes>
<element>
(Same content lines as the Selected Element section. Styles are not included, but CSS Rules/CSS Variables are)
</element>
<component>
(Same content lines as the Component Tree section. Omitted entirely if there is no componentInfo)
</component>
<style-diff>
(Same content lines as the Selected Element's Styles. Omitted entirely if absent)
</style-diff>
</annotation>
<annotation id="2">
...
</annotation>
<relation id="1" from="1" to="2">
(The relation's instruction text)
</relation>  ← only if relations exist, after all annotations and before </tegakari-output>
</tegakari-output>
```

- The leading marker line `<tegakari-output version="1" preset="claude-code">` is an immutable contract, and the tegakari-fix skill auto-triggers on this string
- The body of each inner tag carries the same amount of information as the corresponding section of the existing Markdown generator (no `##` heading notation — just key:value line format)
- Single copy and individual pin copy use the same wrapper, with only one `<annotation>`
- `<tags>` is output only when quick-instruction chips are selected (see the Tags section under "1. User Instruction"), immediately after `<instruction>` (at this position even when instruction is absent)
- `<style-changes>` is output immediately after `<tags>` (at this position even when tags is absent), only when styleDelta exists (see [Style changes](#style-changes-on-page-style-adjustment-mode) for details)

### Custom Templates

In addition to the five built-in presets, users can define their own output format tailored to their AI workflow. It is created in the "Output Templates" section of the Options screen, and listed in the Toolbar's preset dropdown below the five built-in ones.

- **Data model** (`OutputTemplate` in `src/lib/output-templates.ts`): `{ id, name, header, annotation }`. `header` is a template string rendered once at the top per copy; `annotation` is a template string rendered repeatedly, once per annotation
- **Storage**: `chrome.storage.local` key `tegakariOutputTemplates` (an array). Limit of **10** (`MAX_OUTPUT_TEMPLATES`)
- **Selected value**: the value space of the saved preset setting takes, in addition to the five built-in values, strings of the form `custom:<id>` (where `id` is the corresponding `OutputTemplate.id`)
- **Rendering**: render `header` → render each `annotation` in order → trim leading/trailing whitespace from each part, drop any parts that become empty, then join with `\n\n`. The prefix rule (`[repo=...]`) is automatically prepended to the top of the output as before **only if** the `header` template does not contain `{{prefix}}` (if it does, the user's placement is respected)
- **Placeholders** (mustache-like `{{key}}`. No conditionals or loops. Replaced with an empty string if the value is absent; unknown placeholders are left as-is. No escaping is performed)
  - For `header`: `{{prefix}}` `{{page.url}}` `{{page.title}}` `{{page.framework}}` `{{page.metaFramework}}` `{{annotationCount}}`
  - For `annotation`: `{{id}}` `{{instruction}}` `{{tags}}` (comma-separated) `{{selector}}` `{{tag}}` `{{classes}}` (comma-separated, undecorated) `{{text}}` `{{attributes}}` (a group of `key: value` lines) `{{styles}}` (a group of `key: value` lines) `{{component.hierarchy}}` (`A → B → C`) `{{component.name}}` (the leaf component's name) `{{component.source}}` `{{component.props}}` (JSON string)
  - In v1, no placeholders are provided for `styleDelta` (Style changes), `cssRules`, `customProperties`, or Relations
- **Fallback behavior**: if, at copy time, the template entity referenced by `custom:<id>` cannot be found (e.g. it was deleted), it falls back to the `jsonl` preset's batch output
- Import/Export: a JSON array of `OutputTemplate[]`. Invalid elements are skipped with a warning (following the same import behavior as Prefix Rules)

## Technical Constraints

- Since the Content Script runs in the Isolated World, it cannot directly access the page's JS context
- Retrieving framework-specific information such as React Fiber or Vue instances requires **Main World injection** (`world: "MAIN"`)
- Communication with the Main World script uses `window.postMessage` or Plasmo's Relay Flow
- Style information includes both computed-style diff extraction (see Selected Element's Styles) and CSS provenance information from CSSOM traversal of same-origin stylesheets (see Selected Element's CSS Rules). Cross-origin stylesheets (e.g. Tailwind served from a CDN) raise an exception on `cssRules` access due to browser security restrictions and are thus not included in the output. CSS custom properties collect only the final resolved value of `var()`, not the intermediate values in the reference chain
