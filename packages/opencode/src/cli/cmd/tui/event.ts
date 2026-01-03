import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import z from "zod"

export const TuiEvent = {
  PromptAppend: BusEvent.define("tui.prompt.append", z.object({ text: z.string() })),
  CommandExecute: BusEvent.define(
    "tui.command.execute",
    z.object({
      command: z.union([
        z.enum([
          "session.list",
          "session.new",
          "session.share",
          "session.interrupt",
          "session.compact",
          "session.page.up",
          "session.page.down",
          "session.half.page.up",
          "session.half.page.down",
          "session.first",
          "session.last",
          "prompt.clear",
          "prompt.submit",
          "agent.cycle",
        ]),
        z.string(),
      ]),
    }),
  ),
  ToastShow: BusEvent.define(
    "tui.toast.show",
    z.object({
      title: z.string().optional(),
      message: z.string(),
      variant: z.enum(["info", "success", "warning", "error"]),
      duration: z.number().default(5000).optional().describe("Duration in milliseconds"),
    }),
  ),
  SessionSelect: BusEvent.define(
    "tui.session.select",
    z.object({
      sessionID: z.string().regex(/^ses/).describe("Session ID to navigate to"),
    }),
  ),
  ElicitationRequest: BusEvent.define(
    "tui.elicitation.request",
    z.object({
      id: z.string().describe("Unique ID for this elicitation request"),
      message: z.string().describe("Message to show the user"),
      fields: z.array(z.object({
        key: z.string(),
        type: z.enum(["string", "number", "integer", "boolean"]),
        description: z.string().optional(),
        default: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
        minimum: z.number().optional(),
        maximum: z.number().optional(),
      })),
    }),
  ),
  ElicitationResponse: BusEvent.define(
    "tui.elicitation.response",
    z.object({
      id: z.string().describe("ID of the elicitation request"),
      action: z.enum(["accept", "decline", "cancel"]),
      content: z.object({}).passthrough().optional(),
    }),
  ),
}
