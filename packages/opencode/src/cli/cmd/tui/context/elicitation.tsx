import { createEffect, onCleanup } from "solid-js"
import { Bus } from "@/bus"
import { TuiEvent } from "../event"
import { useDialog } from "../ui/dialog"
import { DialogElicitation } from "../ui/dialog-elicitation"

/**
 * Sets up a global listener for elicitation requests from MCP servers.
 * When a request comes in, shows the elicitation dialog and publishes the response.
 */
export function ElicitationHandler() {
  const dialog = useDialog()

  createEffect(() => {
    const unsubscribe = Bus.subscribe(TuiEvent.ElicitationRequest, async (event) => {
      // Show the elicitation dialog
      const result = await DialogElicitation.show(
        dialog,
        event.message,
        event.fields,
      )

      // Publish the response
      const action = result === null ? "cancel" : "accept"
      await Bus.publish(TuiEvent.ElicitationResponse, {
        id: event.id,
        action,
        content: result ?? {},
      })
    })

    onCleanup(() => unsubscribe())
  })

  return null
}
