#!/usr/bin/env node

// Simple MCP server that provides a tool which triggers elicitation
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const server = new Server(
  {
    name: "test-elicitation",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register a tool that uses elicitation
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "test_elicit",
        description: "Test elicitation with a simple form",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "test_elicit") {
    // Call elicit to get user input
    const elicitResult = await request.session.elicit({
      message: "Please configure your test settings:",
      requestedSchema: {
        type: "object",
        properties: {
          score: {
            type: "integer",
            description: "Your score from 1-10",
            default: 7,
            minimum: 1,
            maximum: 10,
          },
          priority: {
            type: "integer",
            description: "Priority level",
            default: 5,
            minimum: 1,
            maximum: 10,
          },
          enabled: {
            type: "boolean",
            description: "Enable this feature",
            default: true,
          },
          name: {
            type: "string",
            description: "Your name",
            default: "Test User",
          },
        },
      },
    });

    if (elicitResult.action === "accept") {
      return {
        content: [
          {
            type: "text",
            text: `✅ Elicitation successful!\n\nYou submitted:\n${JSON.stringify(elicitResult.content, null, 2)}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `❌ Elicitation was ${elicitResult.action}`,
          },
        ],
      };
    }
  }

  return {
    content: [
      {
        type: "text",
        text: "Unknown tool",
      },
    ],
  };
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
