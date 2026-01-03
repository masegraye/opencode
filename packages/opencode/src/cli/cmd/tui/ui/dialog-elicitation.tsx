import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog, type DialogContext } from "./dialog"
import { createStore } from "solid-js/store"
import { onMount, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"

export type ElicitationField = {
  key: string
  type: "string" | "number" | "integer" | "boolean"
  description?: string
  default?: any
  minimum?: number
  maximum?: number
}

export type DialogElicitationProps = {
  message: string
  fields: ElicitationField[]
  onConfirm?: (values: Record<string, any>) => void
  onCancel?: () => void
}

export function DialogElicitation(props: DialogElicitationProps) {
  const dialog = useDialog()
  const { theme } = useTheme()
  
  // Initialize values from defaults
  const initialValues: Record<string, any> = {}
  props.fields.forEach((field) => {
    initialValues[field.key] = field.default ?? (
      field.type === "boolean" ? false :
      field.type === "number" || field.type === "integer" ? field.minimum ?? 0 :
      ""
    )
  })
  
  const [store, setStore] = createStore({
    values: initialValues,
    activeIndex: 0,
    editing: false,
    editBuffer: "",
  })

  const activeField = () => props.fields[store.activeIndex]
  
  // Register editing state with dialog to prevent global Escape from closing while editing
  onMount(() => {
    dialog.setSize("large")
    dialog.setEscapeCloseHandler(() => store.editing)
  })

  useKeyboard((evt) => {
    const field = activeField()
    
    // If editing a text field - handle ALL keys to prevent dialog from processing them
    if (store.editing && field.type === "string") {
      console.log("ELICIT HANDLER - In edit mode, handling key:", evt.name)
      evt.preventDefault()
      
      if (evt.name === "escape") {
        console.log("ELICIT HANDLER - Escape in edit mode - canceling edit")
        setStore("editing", false)
        setStore("editBuffer", "")
        console.log("ELICIT HANDLER - Edit cancelled, editing now:", store.editing)
        return
      }
      
      if (evt.name === "return") {
        // Confirm edit
        setStore("values", field.key, store.editBuffer)
        setStore("editing", false)
        return
      }
      
      if (evt.name === "backspace") {
        setStore("editBuffer", store.editBuffer.slice(0, -1))
        return
      }
      
      // Add typed character
      if (evt.sequence && evt.sequence.length === 1) {
        setStore("editBuffer", store.editBuffer + evt.sequence)
        return
      }
      
      return
    }
    
    // Not editing - handle dialog-level keys
    if (evt.name === "return" && !store.editing) {
      props.onConfirm?.(store.values)
      dialog.clear()
      evt.preventDefault()
    }
    
    if (evt.name === "escape" && !store.editing) {
      props.onCancel?.()
      dialog.clear()
      evt.preventDefault()
    }
    
    if (evt.name === "tab" || evt.name === "down") {
      setStore("activeIndex", (store.activeIndex + 1) % props.fields.length)
      evt.preventDefault()
    }
    
    if (evt.name === "up") {
      setStore("activeIndex", (store.activeIndex - 1 + props.fields.length) % props.fields.length)
      evt.preventDefault()
    }
    
    // Handle field-specific input
    if (field.type === "boolean" && evt.name === "space") {
      setStore("values", field.key, !store.values[field.key])
      evt.preventDefault()
    }
    
    if (field.type === "string" && evt.name === "space") {
      // Start editing
      setStore("editing", true)
      setStore("editBuffer", (store.values[field.key] || "").toString())
      evt.preventDefault()
    }
    
    if ((field.type === "number" || field.type === "integer") && (evt.name === "left" || evt.name === "right")) {
      const current = store.values[field.key] as number
      const min = field.minimum ?? 0
      const max = field.maximum ?? 100
      const step = field.type === "integer" ? 1 : 0.1
      
      if (evt.name === "right" && current < max) {
        setStore("values", field.key, Math.min(max, current + step))
      }
      if (evt.name === "left" && current > min) {
        setStore("values", field.key, Math.max(min, current - step))
      }
      evt.preventDefault()
    }
  })

  onMount(() => {
    dialog.setSize("large")
  })

  const renderField = (field: ElicitationField, index: number, isActive: () => boolean, value: () => any) => {
    // Boolean checkbox
    if (field.type === "boolean") {
      return (
        <box
          flexDirection="column"
          gap={0}
          paddingLeft={1}
          paddingTop={1}
          paddingBottom={1}
          backgroundColor={isActive() ? theme.backgroundElement : undefined}
          onMouseUp={() => setStore("activeIndex", index)}
        >
          <box flexDirection="row" gap={2}>
            <text fg={isActive() ? theme.primary : theme.textMuted}>
              {value() ? "[x]" : "[ ]"}
            </text>
            <text fg={isActive() ? theme.primary : theme.text}>
              {field.key.replace(/_/g, " ")}
            </text>
          </box>
          <Show when={field.description}>
            <text fg={theme.textMuted} paddingLeft={5}>
              {field.description}
            </text>
          </Show>
        </box>
      )
    }

    // Number slider
    if (field.type === "number" || field.type === "integer") {
      const min = field.minimum ?? 0
      const max = field.maximum ?? 10
      const numValue = () => value() as number
      const percentage = () => ((numValue() - min) / (max - min)) * 100
      const barWidth = 30
      const filledWidth = () => Math.round((barWidth * percentage()) / 100)
      const emptyWidth = () => barWidth - filledWidth()
      
      return (
        <box
          flexDirection="column"
          gap={0}
          paddingLeft={1}
          paddingTop={1}
          paddingBottom={1}
          backgroundColor={isActive() ? theme.backgroundElement : undefined}
          onMouseUp={() => setStore("activeIndex", index)}
        >
          <box flexDirection="row" gap={2}>
            <text fg={isActive() ? theme.primary : theme.text}>
              {field.key.replace(/_/g, " ")}
            </text>
            <text fg={theme.textMuted}>
              ({numValue()}/{max})
            </text>
          </box>
          <Show when={field.description}>
            <text fg={theme.textMuted} paddingLeft={2}>
              {field.description}
            </text>
          </Show>
          <box flexDirection="row" paddingLeft={2} paddingTop={0}>
            <text fg={isActive() ? theme.primary : theme.textMuted}>
              [{"=".repeat(filledWidth())}{">"}{"·".repeat(Math.max(0, emptyWidth() - 1))}]
            </text>
          </box>
        </box>
      )
    }

    // String input (text field)
    const isEditing = () => isActive() && store.editing
    const displayValue = () => isEditing() ? store.editBuffer : (value() || "")
    
    return (
      <box
        flexDirection="column"
        gap={0}
        paddingLeft={1}
        paddingTop={1}
        paddingBottom={1}
        backgroundColor={isActive() ? theme.backgroundElement : undefined}
        onMouseUp={() => setStore("activeIndex", index)}
      >
        <text fg={isActive() ? theme.primary : theme.text}>
          {field.key.replace(/_/g, " ")}
          {isEditing() ? " (editing)" : ""}
        </text>
        <Show when={field.description}>
          <text fg={theme.textMuted} paddingLeft={2}>
            {field.description}
          </text>
        </Show>
        <text fg={isActive() ? theme.primary : theme.textMuted} paddingLeft={2}>
          {displayValue() || "(empty)"}
          {isEditing() ? "_" : ""}
        </text>
      </box>
    )
  }

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Review & Adjust
        </text>
        <text fg={theme.textMuted}>esc to cancel</text>
      </box>
      
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>{props.message}</text>
      </box>

      <box flexDirection="column" gap={0}>
        <For each={props.fields}>
          {(field, index) => {
            const isActive = () => store.activeIndex === index()
            const value = () => store.values[field.key]
            
            return renderField(field, index(), isActive, value)
          }}
        </For>
      </box>

      <box paddingTop={1}>
        <Show when={store.editing && activeField().type === "string"}>
          <text fg={theme.textMuted}>
            Type to edit, {" "}
            <span style={{ fg: theme.text }}>return</span> to save, {" "}
            <span style={{ fg: theme.text }}>esc</span> to cancel edit
          </text>
        </Show>
        <Show when={!store.editing && activeField().type === "boolean"}>
          <text fg={theme.textMuted}>
            Press <span style={{ fg: theme.text }}>space</span> to toggle, {" "}
            <span style={{ fg: theme.text }}>↑↓</span> to navigate, {" "}
            <span style={{ fg: theme.text }}>return</span> to confirm
          </text>
        </Show>
        <Show when={!store.editing && (activeField().type === "number" || activeField().type === "integer")}>
          <text fg={theme.textMuted}>
            Press <span style={{ fg: theme.text }}>←→</span> to adjust, {" "}
            <span style={{ fg: theme.text }}>↑↓</span> to navigate, {" "}
            <span style={{ fg: theme.text }}>return</span> to confirm
          </text>
        </Show>
        <Show when={!store.editing && activeField().type === "string"}>
          <text fg={theme.textMuted}>
            Press <span style={{ fg: theme.text }}>space</span> to edit, {" "}
            <span style={{ fg: theme.text }}>↑↓</span> to navigate, {" "}
            <span style={{ fg: theme.text }}>return</span> to confirm
          </text>
        </Show>
      </box>
    </box>
  )
}

DialogElicitation.show = (
  dialog: DialogContext,
  message: string,
  fields: ElicitationField[],
) => {
  return new Promise<Record<string, any> | null>((resolve) => {
    let resolved = false
    
    dialog.replace(
      () => (
        <DialogElicitation
          message={message}
          fields={fields}
          onConfirm={(values) => {
            if (!resolved) {
              resolved = true
              resolve(values)
            }
          }}
          onCancel={() => {
            if (!resolved) {
              resolved = true
              resolve(null)
            }
          }}
        />
      ),
      () => {
        if (!resolved) {
          resolved = true
          resolve(null)
        }
      },
    )
  })
}
