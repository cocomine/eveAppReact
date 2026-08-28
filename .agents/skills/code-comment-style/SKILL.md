---
name: code-comment-style
description: Apply this project's JSDoc, code classification, and JSX classification conventions whenever writing or modifying code.
---

# Code Comment Style

Use comments to divide code into easy-to-scan categories, then document what each
category does. Prefer short titles, lists, and examples over long prose.

## Comment types

| Type                | Purpose                                             | Format                 |
|---------------------|-----------------------------------------------------|------------------------|
| JSDoc               | Explain a declaration's responsibility and contract | `/** ... */`           |
| Code classification | Divide declarations, branches, and workflow stages  | `// Simple title`      |
| JSX classification  | Divide independent UI sections                      | `{/* Simple title */}` |
| Block explanation   | Show a shape, rule set, diagram, or worked example  | `/* ... */`            |

## Core rules

- **Classify first:** split dense code into meaningful groups or stages.
- **Use simple titles:** prefer `// Send to server`, `// Clear local draft`, or
  `// No validation error` over a sentence-length heading.
- **Explain the category:** use JSDoc, a short list, or focused comments inside the
  category to describe its responsibility, rules, and non-obvious behavior.
- **Keep related code together:** a title applies until the next classification title or
  the end of the surrounding block.
- **Use English:** keep titles and explanations concise and easy to understand.
- **Preserve project terms:** use established names such as "checkpoint", "preview",
  "publication", and "visible axis".
- **Keep documentation-only changes behavior-free:** do not change runtime logic, APIs,
  declaration order, or unrelated formatting while adding comments.
- **Keep comments current:** update or remove a title and its explanation when the code's
  responsibility changes.

## 1. JSDoc

### What it does

- Defines the responsibility of a function, component, hook, type, or constant.
- Documents parameters, return values, errors, side effects, and invariants when needed.
- Explains why a declaration exists instead of narrating its implementation line by line.

### Simple declaration

```ts
/** Preset stroke colours available from the drawing toolbar. */
const DRAWING_COLORS = [...];
```

### Function contract

```ts
/**
 * Rasterizes rotation and visible-axis flips before cropping.
 *
 * This keeps the crop overlay and exported pixels in the same coordinate system.
 *
 * @param sourceFile - Original image decoded into the preview raster.
 * @param rotation - Clockwise quarter-turn rotation in degrees.
 * @returns Encoded preview blob and its transformed dimensions.
 */
export async function createPreview(...) { ... }
```

### Props and type fields

Document the type and each field when ownership or behavior matters:

```ts
/** Configures the controlled Markdown editor. */
export type EditorProps = {
  /** Canonical Markdown value owned by the parent. */
    value: string;
  /** Receives Markdown after the editor serializes the document. */
    onChange: (markdown: string) => void;
  /** Optional image pipeline; uploads are rejected when it is absent. */
    onImageUpload?: (file: File) => Promise<string>;
};
```

### Use JSDoc for

- Exported functions, components, hooks, types, and public props.
- Non-trivial internal helpers.
- Styled components that own a layout or interaction invariant.
- Persistence, API, storage, and restoration boundaries.
- Immutable snapshots and resumable workflows where ordering or idempotency matters.

## 2. Code classification

### What it does

- Gives each declaration group or workflow stage a simple, scannable title.
- Shows where one responsibility ends and the next begins.
- Makes long functions and hooks readable without turning every line into prose.

### Declaration groups

```ts
// Publication state
const [publicationSnapshot, setPublicationSnapshot] = useState<Snapshot | null>(null);
const [publicationStep, setPublicationStep] = useState<PublicationStep>("validation");

// Swipe navigation
const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);
const swipeStartRef = useRef<number | null>(null);

// Validation feedback
const publicationValidation = useMemo(
        () => validatePaperPublication(editorState, registry),
        [editorState, registry],
);
```

The title names what the group owns. Add a focused comment only when a value has a
non-obvious invariant:

```ts
// Persistence queue
const saveRevisionRef = useRef(0);
// Serializes writes so an older operation cannot overwrite a newer snapshot.
const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
```

### Workflow stages

Short action or outcome titles are valid classifications, including `Send to server`,
`Clear`, and `No error` when they accurately divide the workflow:

```ts
// Validate
const validation = validatePaperPublication(editorState, registry);

// Invalid
if (!validation.valid) {
  focusFirstPublicationError(validation);
    return;
}

// Send to server
await runPaperPublication(checkpoint);

// Clear local draft
await clearPaperEditorDraft();

// No error
navigate(subjectPath);
```

Prefer a slightly more specific title when it stays simple:

| Generic title | Clearer title          |
|---------------|------------------------|
| `// Clear`    | `// Clear local draft` |
| `// Error`    | `// Publication error` |
| `// Data`     | `// Preview data`      |
| `// Send`     | `// Send to server`    |

### Algorithm stages

```ts
// Initial scan state
let cursor = 0;
let fence: string | null = null;

// Find image label
const labelStart = markdown.indexOf("![", cursor);

// Parse image destination
const destination = parseImageDestination(markdown, labelStart);

// Replace from back to front
for (const image of images.toReversed()) {
  markdown = replaceImageDestination(markdown, image);
}

// Final integrity check
assertNoLocalImageUrls(markdown);
```

### Local explanations

Inside a category, add `//` explanations for:

- Race prevention and asynchronous ordering.
- Security or trust boundaries.
- Coordinate-system rules.
- Cleanup requirements.
- Browser or framework behavior that is not obvious from the code.
- A deliberately unusual implementation choice.

```ts
// Image dimensions
// A 90-degree turn exchanges the visible width and height.
const width = swapsDimensions ? image.naturalHeight : image.naturalWidth;
```

Do not comment self-evident assignments individually:

```ts
// Bad: repeats the syntax without adding a category or useful explanation.
busyRef.current = true; // Set busy to true.
```

## 3. JSX classification

### What it does

- Divides a long render tree into independent UI sections.
- Identifies what each section renders or controls.
- Lets readers find dialogs, actions, feedback, and editor areas quickly.

### Example

```tsx
{/* Validation feedback */
}
<PublicationValidationAlert issues={issues}/>

{/* Question editor */
}
<PaperQuestionCard questionId={questionId}/>

{/* Retry action */
}
<Button onClick={retryPublication}>Retry</Button>

{/* Progress dialog */
}
<PublicationProgressDialog step={publicationStep}/>
```

### Title style

- Use a short noun or action phrase.
- Use normal capitalization and spacing.
- Keep existing domain terms.
- A title may be simple when its enclosed JSX clearly explains the details.

```tsx
{/* Good */
}
{/* Student preview */
}
{/* Draft action */
}
{/* Publish action */
}
{/* Internal error */
}

{/* Avoid inconsistent spacing or unclear abbreviations */
}
{/*student Preview*/
}
{/*btn*/
}
```

Do not classify every isolated element. Add a title when the section contains related
controls, a distinct branch, or an important dialog or feedback surface.

## 4. Block explanations

### What it does

- Presents information that is easier to understand as a list, shape, diagram, or table.
- Keeps a complex validation contract next to the code that enforces it.

### Shape example

```ts
/*
Accepted persisted record:
- Non-null object
- Matching schema version
- Valid editor state
- One binary record per referenced asset ID
*/
assertPaperEditorRecord(value);
```

### Diagram example

```ts
/*
Original image:     1200 x 800
Rotation 0 / 180:  1200 x 800
Rotation 90 / 270:  800 x 1200
*/
```

Use JSDoc instead when documenting a declaration's public contract.

## Classification checklist

Before finishing:

- [ ] Dense declarations are divided by responsibility.
- [ ] Long workflows are divided into clear stages and outcomes.
- [ ] Long JSX is divided into meaningful UI sections.
- [ ] Every title is short and easy to understand.
- [ ] Each category's code or explanation makes its responsibility clear.
- [ ] Complex contracts use JSDoc, lists, shapes, or examples instead of one long paragraph.
- [ ] Comments do not change or misrepresent runtime behavior.
- [ ] Comments use current project terminology and consistent formatting.
