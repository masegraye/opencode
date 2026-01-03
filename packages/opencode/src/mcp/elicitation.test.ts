import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { Bus } from "@/bus"
import { TuiEvent } from "@/cli/cmd/tui/event"
import { Instance } from "@/project/instance"
import { MCP } from "./index"

describe("MCP Elicitation", () => {
  beforeAll(async () => {
    // Initialize instance for Bus to work
    await Instance.init({ directory: process.cwd() })
  })

  afterAll(async () => {
    await Instance.dispose()
  })

  it("should handle elicitation request/response flow", async () => {
    // Simulate an elicitation request coming from an MCP server
    const elicitId = "test_elicit_123"
    
    // Set up a listener that will respond to the request (simulating the TUI)
    Bus.subscribe(TuiEvent.ElicitationRequest, async (event) => {
      console.log("ElicitationRequest received:", event.id)
      
      // Simulate user filling out the form and submitting
      setTimeout(async () => {
        await Bus.publish(TuiEvent.ElicitationResponse, {
          id: event.id,
          action: "accept",
          content: {
            score: 8,
            enabled: true,
          },
        })
      }, 100)
    })

    // Simulate what the MCP handler does
    const response = await new Promise<any>((resolve) => {
      const unsubscribe = Bus.subscribe(TuiEvent.ElicitationResponse, (event) => {
        if (event.id === elicitId) {
          console.log("ElicitationResponse received:", event)
          unsubscribe()
          resolve(event)
        }
      })

      // Publish the request
      Bus.publish(TuiEvent.ElicitationRequest, {
        id: elicitId,
        message: "Test message",
        fields: [
          {
            key: "score",
            type: "integer" as const,
            description: "Test score",
            default: 5,
            minimum: 1,
            maximum: 10,
          },
          {
            key: "enabled",
            type: "boolean" as const,
            description: "Enabled",
            default: false,
          },
        ],
      })

      // Timeout
      setTimeout(() => {
        unsubscribe()
        resolve({ action: "cancel" })
      }, 5000)
    })

    expect(response.action).toBe("accept")
    expect(response.content.score).toBe(8)
    expect(response.content.enabled).toBe(true)
  })
})
