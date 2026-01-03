package main

import (
	"context"
	"fmt"
	"log"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "elicitation-test",
	Short: "Test MCP server for elicitation scenarios",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runServer()
	},
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}

func runServer() error {
	ctx := context.Background()

	// Create MCP server
	server := mcp.NewServer(&mcp.Implementation{
		Name:    "elicitation-test",
		Version: "1.0.0",
	}, nil)

	// Register tools with different elicitation scenarios
	registerTools(server)

	// Create stdio transport
	transport := mcp.StdioTransport{}

	// Connect and run server
	session, err := server.Connect(ctx, &transport, nil)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}

	// Wait for session to complete
	session.Wait()
	return nil
}

func registerTools(server *mcp.Server) {
	// Scenario 1: Simple form with numbers and booleans
	mcp.AddTool(server, &mcp.Tool{
		Name:        "test_simple_form",
		Description: "Test simple elicitation with numbers and booleans",
		InputSchema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
	}, simpleFormTool)

	// Scenario 2: Score-based form (like problem validation)
	mcp.AddTool(server, &mcp.Tool{
		Name:        "test_problem_scores",
		Description: "Test elicitation with problem validation scores",
		InputSchema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
	}, problemScoresTool)

	// Scenario 3: Mixed types
	mcp.AddTool(server, &mcp.Tool{
		Name:        "test_mixed_types",
		Description: "Test elicitation with all field types",
		InputSchema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
	}, mixedTypesTool)
}

// Scenario 1: Simple form
func simpleFormTool(ctx context.Context, req *mcp.CallToolRequest, args struct{}) (*mcp.CallToolResult, any, error) {
	result, err := req.Session.Elicit(ctx, &mcp.ElicitParams{
		Message: "Configure your settings:",
		RequestedSchema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"score": map[string]any{
					"type":        "integer",
					"description": "Your score (1-10)",
					"default":     7,
					"minimum":     1,
					"maximum":     10,
				},
				"enabled": map[string]any{
					"type":        "boolean",
					"description": "Enable this feature",
					"default":     true,
				},
			},
		},
	})

	if err != nil {
		return nil, nil, err
	}

	return formatResult(result), nil, nil
}

// Scenario 2: Problem validation scores
func problemScoresTool(ctx context.Context, req *mcp.CallToolRequest, args struct{}) (*mcp.CallToolResult, any, error) {
	result, err := req.Session.Elicit(ctx, &mcp.ElicitParams{
		Message: "Rate this problem on each criteria (1-10 scale):",
		RequestedSchema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"business_impact": map[string]any{
					"type":        "integer",
					"description": "Revenue/cost savings potential",
					"default":     7,
					"minimum":     1,
					"maximum":     10,
				},
				"urgency": map[string]any{
					"type":        "integer",
					"description": "How critical to solve now",
					"default":     6,
					"minimum":     1,
					"maximum":     10,
				},
				"stakeholder_support": map[string]any{
					"type":        "integer",
					"description": "Who cares and their power",
					"default":     7,
					"minimum":     1,
					"maximum":     10,
				},
				"solution_clarity": map[string]any{
					"type":        "integer",
					"description": "How well-defined is solution",
					"default":     8,
					"minimum":     1,
					"maximum":     10,
				},
				"competitive_advantage": map[string]any{
					"type":        "integer",
					"description": "Defensible value created",
					"default":     5,
					"minimum":     1,
					"maximum":     10,
				},
			},
		},
	})

	if err != nil {
		return nil, nil, err
	}

	return formatResult(result), nil, nil
}

// Scenario 3: Mixed types
func mixedTypesTool(ctx context.Context, req *mcp.CallToolRequest, args struct{}) (*mcp.CallToolResult, any, error) {
	result, err := req.Session.Elicit(ctx, &mcp.ElicitParams{
		Message: "Fill out all fields:",
		RequestedSchema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"name": map[string]any{
					"type":        "string",
					"description": "Your name",
					"default":     "Test User",
				},
				"age": map[string]any{
					"type":        "integer",
					"description": "Your age",
					"default":     25,
					"minimum":     0,
					"maximum":     120,
				},
				"active": map[string]any{
					"type":        "boolean",
					"description": "Is active",
					"default":     true,
				},
				"rating": map[string]any{
					"type":        "number",
					"description": "Rating (0-5)",
					"default":     3.5,
					"minimum":     0,
					"maximum":     5,
				},
			},
		},
	})

	if err != nil {
		return nil, nil, err
	}

	return formatResult(result), nil, nil
}

func formatResult(result *mcp.ElicitResult) *mcp.CallToolResult {
	var text string
	if result.Action == "accept" {
		text = "✅ Elicitation successful!\n\nYou submitted:\n"
		for key, value := range result.Content {
			text += fmt.Sprintf("  %s: %v\n", key, value)
		}
	} else {
		text = fmt.Sprintf("❌ Elicitation was %s", result.Action)
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: text},
		},
	}
}
