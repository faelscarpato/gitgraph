// Tree-sitter based function extraction (optional, better than regex)
// This module provides more accurate function extraction using Tree-sitter parsers
// NOTE: This is a placeholder for future implementation with web-tree-sitter
// Currently falls back to regex extraction

import type { ExtractedFunction } from "./functions";

/**
 * Extract functions from code using Tree-sitter parser
 * Returns extracted functions with accurate information
 * NOTE: This is a placeholder for future implementation with web-tree-sitter
 * Currently always returns empty array and falls back to regex
 */
export async function extractFunctionsWithTreeSitter(
  _path: string,
  _content: string,
  _language: string,
): Promise<ExtractedFunction[]> {
  // TODO: Implement with web-tree-sitter
  // For now, always return empty to fall back to regex
  return [];
}

/**
 * Check if Tree-sitter is available for a language
 */
export function isTreeSitterAvailable(language: string): boolean {
  const supportedLanguages = [
    "javascript",
    "typescript",
    "ts",
    "js",
    "python",
    "py",
    "go",
    "rust",
    "rs",
    "java",
    "c",
    "cpp",
    "php",
    "ruby",
    "rb",
    "swift",
    "kotlin",
    "kt",
    "scala",
  ];

  return supportedLanguages.includes(language.toLowerCase());
}

/**
 * Get Tree-sitter node types for function definitions by language
 */
export function getFunctionNodeTypes(language: string): string[] {
  const nodeTypes: Record<string, string[]> = {
    javascript: [
      "function_declaration",
      "method_definition",
      "arrow_function",
      "function_expression",
    ],
    typescript: [
      "function_declaration",
      "method_definition",
      "arrow_function",
      "function_expression",
    ],
    python: ["function_definition"],
    go: ["function_declaration"],
    rust: ["function_item", "method_item"],
    java: ["method_declaration"],
    c: ["function_definition"],
    cpp: ["function_definition", "method_definition"],
    php: ["function_definition", "method_definition"],
    ruby: ["method", "def"],
    swift: ["function_declaration", "method_declaration"],
    kotlin: ["function_declaration", "function_literal"],
    scala: ["def", "function_declaration"],
  };

  return nodeTypes[language.toLowerCase()] || [];
}
