// Tree-sitter based function extraction using web-tree-sitter
// This provides accurate AST-based function extraction for multiple languages

import type { GraphNode } from "@/lib/graph-types";
import type { ExtractedFunction } from "./functions";

// Import web-tree-sitter
import * as webTreeSitter from "web-tree-sitter";

// Tree-sitter parser types
interface TreeSitterLanguage {
  // Tree-sitter Language object - using unknown as placeholder
  _brand: "TreeSitterLanguage";
}

interface TreeSitterParser {
  parse: (sourceCode: string) => TreeSitterTree;
  setLanguage: (language: TreeSitterLanguage) => void;
}

interface TreeSitterTree {
  rootNode: TreeSitterNode;
}

interface TreeSitterNode {
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  namedChildren: TreeSitterNode[];
  childCount: number;
  children: TreeSitterNode[];
  child: (index: number) => TreeSitterNode | null;
  field: (name: string) => TreeSitterNode | null;
}

// Language to WASM file mapping
const LANGUAGE_WASM_MAP: Record<string, string> = {
  javascript: "/tree-sitter/tree-sitter-javascript.wasm",
  typescript: "/tree-sitter/tree-sitter-typescript.wasm",
  tsx: "/tree-sitter/tree-sitter-tsx.wasm",
  python: "/tree-sitter/tree-sitter-python.wasm",
  go: "/tree-sitter/tree-sitter-go.wasm",
  rust: "/tree-sitter/tree-sitter-rust.wasm",
  java: "/tree-sitter/tree-sitter-java.wasm",
  cpp: "/tree-sitter/tree-sitter-cpp.wasm",
  c: "/tree-sitter/tree-sitter-c.wasm",
  php: "/tree-sitter/tree-sitter-php.wasm",
  ruby: "/tree-sitter/tree-sitter-ruby.wasm",
};

// Function node types by language
const FUNCTION_NODE_TYPES: Record<string, string[]> = {
  javascript: [
    "function_declaration",
    "method_definition",
    "arrow_function",
    "function_expression",
    "generator_function_declaration",
  ],
  typescript: [
    "function_declaration",
    "method_definition",
    "arrow_function",
    "function_expression",
    "generator_function_declaration",
  ],
  tsx: [
    "function_declaration",
    "method_definition",
    "arrow_function",
    "function_expression",
    "generator_function_declaration",
  ],
  python: ["function_definition", "async_function_definition"],
  go: ["function_declaration", "method_declaration"],
  rust: ["function_item", "method_item"],
  java: ["method_declaration", "constructor_declaration"],
  cpp: ["function_definition", "function_declaration", "method_definition"],
  c: ["function_definition", "function_declaration"],
  php: ["function_definition", "method_declaration"],
  ruby: ["method", "def", "defs", "defp"],
};

let parser: TreeSitterParser | null = null;
const loadedLanguages: Map<string, webTreeSitter.Language> = new Map();
let initialized = false;

/**
 * Initialize web-tree-sitter
 */
async function initTreeSitter(): Promise<void> {
  if (initialized) return;

  try {
    await webTreeSitter.init();
    parser = webTreeSitter.Parser();
    initialized = true;
  } catch (error) {
    console.warn("Failed to initialize web-tree-sitter:", error);
  }
}

/**
 * Load a language from WASM file
 */
async function loadLanguage(languageName: string): Promise<webTreeSitter.Language | null> {
  if (loadedLanguages.has(languageName)) {
    return loadedLanguages.get(languageName)!;
  }

  const wasmPath = LANGUAGE_WASM_MAP[languageName];
  if (!wasmPath) {
    return null;
  }

  try {
    const response = await fetch(wasmPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch WASM: ${response.status}`);
    }
    const wasmBytes = await response.arrayBuffer();
    const language = await webTreeSitter.Language.load(wasmBytes);
    loadedLanguages.set(languageName, language);
    return language;
  } catch (error) {
    console.warn(`Failed to load language ${languageName}:`, error);
    return null;
  }
}

/**
 * Extract functions from code using Tree-sitter
 */
export async function extractFunctionsWithTreeSitter(
  path: string,
  content: string,
  language: string,
): Promise<ExtractedFunction[]> {
  const ext = path.split(".").pop()?.toLowerCase() ?? language.toLowerCase();

  // Map extension to language
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    php: "php",
    rb: "ruby",
  };

  const treeSitterLang = langMap[ext] || language.toLowerCase();
  const nodeTypes = FUNCTION_NODE_TYPES[treeSitterLang];

  if (!nodeTypes || nodeTypes.length === 0) {
    return [];
  }

  await initTreeSitter();
  if (!parser) return [];

  const loadedLanguage = await loadLanguage(treeSitterLang);
  if (!loadedLanguage) return [];

  try {
    parser.setLanguage(loadedLanguage);
    const tree = parser.parse(content);
    const rootNode = tree.rootNode;

    const functions: ExtractedFunction[] = [];

    // Traverse the AST to find function nodes
    function visit(node: TreeSitterNode, parentClassName?: string) {
      if (nodeTypes.includes(node.type)) {
        // Extract function name
        let name = "";
        let params: string[] = [];
        let isMethod = false;
        const className = parentClassName;

        // Find the name node
        const nameNode = node.namedChildren.find(
          (child) => child.type === "identifier" || child.type === "property_identifier",
        );
        if (nameNode) {
          name = nameNode.text;
        }

        // Find parameters
        const paramsNode = node.namedChildren.find(
          (child) => child.type === "formal_parameters" || child.type === "parameters",
        );
        if (paramsNode) {
          params = paramsNode.namedChildren
            .filter((child) => child.type === "identifier" || child.type === "parameter")
            .map((child) => child.text);
        }

        // Check if it's a method (inside a class)
        if (parentClassName) {
          isMethod = true;
        }

        // Check for class context
        let currentClass = parentClassName;
        if (node.type === "class_declaration" || node.type === "class") {
          const classNameNode = node.namedChildren.find(
            (child) => child.type === "identifier" || child.type === "type_identifier",
          );
          if (classNameNode) {
            currentClass = classNameNode.text;
          }
        }

        // Calculate line number
        const before = content.substring(0, node.startIndex);
        const lineNumber = before.split("\n").length;

        if (name) {
          functions.push({
            name,
            path,
            line: lineNumber,
            language: treeSitterLang.charAt(0).toUpperCase() + treeSitterLang.slice(1),
            parameters: params,
            isMethod,
            className: currentClass,
          });
        }

        // Recursively visit children
        for (const child of node.namedChildren) {
          visit(child, currentClass);
        }
      } else {
        // For class nodes, pass class name to children
        let currentClass = parentClassName;
        if (node.type === "class_declaration" || node.type === "class") {
          const classNameNode = node.namedChildren.find(
            (child) => child.type === "identifier" || child.type === "type_identifier",
          );
          if (classNameNode) {
            currentClass = classNameNode.text;
          }
        }
        for (const child of node.namedChildren) {
          visit(child, currentClass);
        }
      }
    }

    visit(rootNode);

    // Deduplicate by name + line
    const seen = new Set<string>();
    return functions.filter((f) => {
      const key = `${f.path}:${f.line}:${f.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (error) {
    console.error(`Failed to parse ${path} with Tree-sitter:`, error);
    return [];
  }
}

/**
 * Check if Tree-sitter is available for a language
 */
export function isTreeSitterAvailable(language: string): boolean {
  const ext = language.toLowerCase();
  return Object.keys(LANGUAGE_WASM_MAP).includes(ext);
}

/**
 * Get Tree-sitter node types for function definitions by language
 */
export function getFunctionNodeTypes(language: string): string[] {
  return FUNCTION_NODE_TYPES[language.toLowerCase()] || [];
}
