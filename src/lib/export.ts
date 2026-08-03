import type { Analysis, GraphEdge, GraphNode } from "./graph-types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\-./]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function baseName(a: Analysis): string {
  return slugify(`${a.owner}-${a.repo}-${a.branch}`);
}

function download(
  filename: string,
  content: string | Blob,
  mime = "text/plain;charset=utf-8",
) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return char;
    }
  });
}

function dotEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function idSafe(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

function summarizeNode(node: GraphNode): string {
  const parts: string[] = [];
  parts.push(node.label);
  parts.push(`[${node.kind}]`);
  if (node.path) parts.push(`path=${node.path}`);
  if (node.language) parts.push(`lang=${node.language}`);
  if (typeof node.loc === "number") parts.push(`loc=${node.loc}`);
  if (typeof node.complexity === "number")
    parts.push(`complexity=${node.complexity}`);
  if (node.entrypoint) parts.push("entrypoint=true");
  if (node.functionData?.className)
    parts.push(`class=${node.functionData.className}`);
  if (typeof node.functionData?.line === "number")
    parts.push(`line=${node.functionData.line}`);
  return parts.join(" · ");
}

function getNodeMap(a: Analysis): Map<string, GraphNode> {
  return new Map(a.nodes.map((node) => [node.id, node]));
}

function getLanguageCounts(a: Analysis): Array<[string, number]> {
  if (a.metrics.languages)
    return Object.entries(a.metrics.languages).sort((a, b) => b[1] - a[1]);

  const counts = new Map<string, number>();
  for (const node of a.nodes) {
    if (!node.language) continue;
    counts.set(node.language, (counts.get(node.language) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function getTopNodesByDegree(a: Analysis, limit = 12) {
  const degree = new Map<string, number>();
  for (const node of a.nodes) degree.set(node.id, 0);
  for (const edge of a.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  return a.nodes
    .map((node) => ({
      node,
      degree: degree.get(node.id) ?? 0,
    }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, limit);
}

function getTopComplexityNodes(a: Analysis, limit = 12) {
  return [...a.nodes]
    .filter((node) => typeof node.complexity === "number")
    .sort((a, b) => (b.complexity ?? 0) - (a.complexity ?? 0))
    .slice(0, limit);
}

function makeMetadata(a: Analysis) {
  return {
    exportedAt: new Date().toISOString(),
    schema: "gitgraph/export/v1",
    repo: `${a.owner}/${a.repo}`,
    branch: a.branch,
    quality: a.quality,
    sourceUsed: a.sourceUsed,
    status: a.status,
    nodes: a.nodes.length,
    edges: a.edges.length,
  };
}

function buildMarkdownReport(a: Analysis): string {
  const languages = getLanguageCounts(a);
  const topDegree = getTopNodesByDegree(a, 10);
  const topComplexity = getTopComplexityNodes(a, 10);

  return `# Gitgraph Report — ${a.owner}/${a.repo}

## Repository
- **URL:** ${a.repoUrl}
- **Owner:** ${a.owner}
- **Repository:** ${a.repo}
- **Branch:** ${a.branch}
- **Generated at:** ${new Date(a.createdAt).toISOString()}
- **Exported at:** ${new Date().toISOString()}
- **Status:** ${a.status}
- **Quality:** ${a.quality}
- **Source used:** ${a.sourceUsed}

## Metrics
- **Nodes:** ${a.metrics.nodes}
- **Edges:** ${a.metrics.edges}
- **Modules:** ${a.metrics.modules}
- **Files:** ${a.metrics.files}
- **Functions:** ${a.metrics.functions}
- **Externals:** ${a.metrics.externals}
- **Average degree:** ${a.metrics.avgDegree}
- **Density:** ${a.metrics.density}
- **Max complexity:** ${a.metrics.maxComplexity}

## Languages
${
  languages.length > 0
    ? languages.map(([lang, count]) => `- **${lang}:** ${count}`).join("\n")
    : "- No language metadata available."
}

## Warnings
${
  a.metrics.warnings?.length
    ? a.metrics.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- No warnings."
}

## Limitations
${
  a.limitations?.length
    ? a.limitations.map((item) => `- ${item}`).join("\n")
    : "- No explicit limitations reported."
}

## Highest connectivity
${
  topDegree.length
    ? topDegree
        .map(
          ({ node, degree }) =>
            `- **${node.label}** (${node.kind}) — degree ${degree}`,
        )
        .join("\n")
    : "- No degree data available."
}

## Highest complexity
${
  topComplexity.length
    ? topComplexity
        .map(
          (node) =>
            `- **${node.label}** (${node.kind}) — complexity ${node.complexity}`,
        )
        .join("\n")
    : "- No complexity data available."
}

## Suggested LLM usage
Use this report together with the JSON or Mermaid exports to reduce unnecessary code rereading. The JSON is better for agents and automation; Mermaid is better for docs, prompts and quick visual understanding.

## Node inventory
${a.nodes.map((node) => `- ${summarizeNode(node)}`).join("\n")}

## Edge inventory
${a.edges
  .map(
    (edge) =>
      `- ${edge.source} -> ${edge.target} · kind=${edge.kind} · weight=${edge.weight}`,
  )
  .join("\n")}
`;
}

function buildTxtReport(a: Analysis): string {
  const languages = getLanguageCounts(a);
  const topDegree = getTopNodesByDegree(a, 10);
  const topComplexity = getTopComplexityNodes(a, 10);

  return `
GITGRAPH ANALYSIS REPORT
========================

Repository: ${a.owner}/${a.repo}
URL: ${a.repoUrl}
Branch: ${a.branch}
Generated at: ${new Date(a.createdAt).toISOString()}
Exported at: ${new Date().toISOString()}
Status: ${a.status}
Quality: ${a.quality}
Source used: ${a.sourceUsed}

METRICS
-------
Nodes: ${a.metrics.nodes}
Edges: ${a.metrics.edges}
Modules: ${a.metrics.modules}
Files: ${a.metrics.files}
Functions: ${a.metrics.functions}
Externals: ${a.metrics.externals}
Average degree: ${a.metrics.avgDegree}
Density: ${a.metrics.density}
Max complexity: ${a.metrics.maxComplexity}

LANGUAGES
---------
${
  languages.length
    ? languages.map(([lang, count]) => `${lang}: ${count}`).join("\n")
    : "No language metadata available."
}

WARNINGS
--------
${a.metrics.warnings?.length ? a.metrics.warnings.join("\n") : "No warnings."}

LIMITATIONS
-----------
${
  a.limitations?.length
    ? a.limitations.join("\n")
    : "No explicit limitations reported."
}

TOP CONNECTIVITY
----------------
${
  topDegree.length
    ? topDegree
        .map(
          ({ node, degree }) =>
            `${node.label} [${node.kind}] - degree ${degree}`,
        )
        .join("\n")
    : "No connectivity data."
}

TOP COMPLEXITY
--------------
${
  topComplexity.length
    ? topComplexity
        .map(
          (node) =>
            `${node.label} [${node.kind}] - complexity ${node.complexity}`,
        )
        .join("\n")
    : "No complexity data."
}

SUGGESTED LLM USAGE
-------------------
Use JSON for agent pipelines and structured prompts.
Use Mermaid for markdown docs, chat prompts and lightweight visual context.
Use TXT when you need a compact export for copy/paste.

NODES
-----
${a.nodes.map((node) => summarizeNode(node)).join("\n")}

EDGES
-----
${a.edges
  .map(
    (edge) =>
      `${edge.source} -> ${edge.target} | ${edge.kind} | weight=${edge.weight}`,
  )
  .join("\n")}
`.trim();
}

function buildMermaidFlowchart(a: Analysis): string {
  const edgeMap: Record<GraphEdge["kind"], string> = {
    import: "-->",
    call: "==>",
    config: "-.->",
  };

  const nodeLines = a.nodes.map((node) => {
    const id = idSafe(node.id);
    const label = node.label.replace(/"/g, '\\"');

    if (node.kind === "module") return `    ${id}["${label}"]`;
    if (node.kind === "file") return `    ${id}["${label}"]`;
    if (node.kind === "function") return `    ${id}(["${label}"])`;
    if (node.kind === "external") return `    ${id}[/"${label}"/]`;
    return `    ${id}{{"${label}"}}`;
  });

  const edgeLines = a.edges.map((edge) => {
    const source = idSafe(edge.source);
    const target = idSafe(edge.target);
    return `    ${source} ${edgeMap[edge.kind] ?? "-->"} ${target}`;
  });

  const classAssignments = a.nodes
    .map((node) => `    class ${idSafe(node.id)} ${node.kind}`)
    .join("\n");

  return `%% Gitgraph Mermaid export
%% Repo: ${a.owner}/${a.repo}
%% Branch: ${a.branch}
%% Quality: ${a.quality}
flowchart TD
${nodeLines.join("\n")}

${edgeLines.join("\n")}

classDef module fill:#1f3252,stroke:#4a78c2,color:#f4f7fb;
classDef file fill:#18263d,stroke:#365885,color:#f4f7fb;
classDef function fill:#143348,stroke:#1d85b8,color:#f4f7fb;
classDef external fill:#2a2036,stroke:#8c62bd,color:#f4f7fb;
classDef config fill:#3d2f16,stroke:#d59a2f,color:#f4f7fb;

${classAssignments}
`;
}

function buildMermaidMindmap(a: Analysis): string {
  const byGroup = new Map<string, GraphNode[]>();

  for (const node of a.nodes) {
    const group = node.group || node.language || node.kind;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group)!.push(node);
  }

  const lines: string[] = [];
  lines.push("mindmap");
  lines.push(`  root((${a.repo}))`);

  for (const [group, nodes] of Array.from(byGroup.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    lines.push(`    ${group}`);
    for (const node of nodes.slice(0, 20)) {
      lines.push(`      ${node.label}`);
    }
    if (nodes.length > 20) {
      lines.push(`      ... +${nodes.length - 20} items`);
    }
  }

  return `%% Gitgraph Mermaid mindmap export
%% Repo: ${a.owner}/${a.repo}
%% Branch: ${a.branch}
${lines.join("\n")}
`;
}

function buildDot(a: Analysis): string {
  const groupedNodes = new Map<string, GraphNode[]>();

  for (const node of a.nodes) {
    const cluster = node.group || "default";
    if (!groupedNodes.has(cluster)) groupedNodes.set(cluster, []);
    groupedNodes.get(cluster)!.push(node);
  }

  const lines: string[] = [];
  lines.push(`digraph "${dotEscape(a.repo)}" {`);
  lines.push(`  rankdir=LR;`);
  lines.push(
    `  graph [bgcolor="#0b1220", pad="0.3", nodesep="0.3", ranksep="0.9"];`,
  );
  lines.push(
    `  node [shape=box, style="rounded,filled", fillcolor="#172033", color="#32415f", fontcolor="#e8eef8", fontname="Inter"];`,
  );
  lines.push(
    `  edge [color="#5b6f96", fontcolor="#c2d1ee", fontname="Inter"];`,
  );
  lines.push("");

  for (const [cluster, nodes] of groupedNodes) {
    if (cluster !== "default") {
      lines.push(`  subgraph "cluster_${dotEscape(cluster)}" {`);
      lines.push(`    label="${dotEscape(cluster)}";`);
      lines.push(`    color="#2d3c5d";`);
      lines.push(`    style="rounded";`);
      for (const node of nodes) {
        lines.push(
          `    "${dotEscape(node.id)}" [label="${dotEscape(node.label)}", tooltip="${dotEscape(
            summarizeNode(node),
          )}"];`,
        );
      }
      lines.push("  }");
      lines.push("");
    } else {
      for (const node of nodes) {
        lines.push(
          `  "${dotEscape(node.id)}" [label="${dotEscape(node.label)}", tooltip="${dotEscape(
            summarizeNode(node),
          )}"];`,
        );
      }
      lines.push("");
    }
  }

  for (const edge of a.edges) {
    lines.push(
      `  "${dotEscape(edge.source)}" -> "${dotEscape(edge.target)}" [label="${dotEscape(
        edge.kind,
      )}", penwidth=${Math.max(1, Math.min(4, edge.weight || 1))}];`,
    );
  }

  lines.push("}");
  return lines.join("\n");
}

function buildGraphML(a: Analysis): string {
  const nodeLines = a.nodes
    .map((node) => {
      return `    <node id="${xmlEscape(node.id)}">
      <data key="label">${xmlEscape(node.label)}</data>
      <data key="kind">${xmlEscape(node.kind)}</data>
      <data key="path">${xmlEscape(node.path ?? "")}</data>
      <data key="language">${xmlEscape(node.language ?? "")}</data>
      <data key="group">${xmlEscape(node.group ?? "")}</data>
      <data key="complexity">${String(node.complexity ?? "")}</data>
      <data key="loc">${String(node.loc ?? "")}</data>
    </node>`;
    })
    .join("\n");

  const edgeLines = a.edges
    .map(
      (
        edge,
        index,
      ) => `    <edge id="e${index}" source="${xmlEscape(edge.source)}" target="${xmlEscape(
        edge.target,
      )}">
      <data key="kind">${xmlEscape(edge.kind)}</data>
      <data key="weight">${String(edge.weight)}</data>
    </edge>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="kind" for="node" attr.name="kind" attr.type="string"/>
  <key id="path" for="node" attr.name="path" attr.type="string"/>
  <key id="language" for="node" attr.name="language" attr.type="string"/>
  <key id="group" for="node" attr.name="group" attr.type="string"/>
  <key id="complexity" for="node" attr.name="complexity" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
  <key id="kind" for="edge" attr.name="kind" attr.type="string"/>

  <graph id="${xmlEscape(a.repo)}" edgedefault="directed">
${nodeLines}
${edgeLines}
  </graph>
</graphml>`;
}

function buildJson(a: Analysis) {
  return {
    ...a,
    _export: makeMetadata(a),
  };
}

function buildHtml(a: Analysis): string {
  const languages = getLanguageCounts(a);
  const topDegree = getTopNodesByDegree(a, 12);
  const topComplexity = getTopComplexityNodes(a, 12);
  const payload = JSON.stringify(buildJson(a)).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${a.owner}/${a.repo} — Gitgraph Export</title>
<style>
  :root{
    --bg:#0b1220;
    --surface:#121b2d;
    --surface-2:#182338;
    --border:#24314d;
    --text:#e7eefb;
    --muted:#9fb0cf;
    --primary:#4c8df6;
    --success:#2fbf71;
    --warning:#f0b24a;
  }
  *{box-sizing:border-box}
  body{
    margin:0;
    font-family:Inter,system-ui,sans-serif;
    background:var(--bg);
    color:var(--text);
    line-height:1.5;
  }
  .wrap{
    max-width:1200px;
    margin:0 auto;
    padding:32px 20px 60px;
  }
  .hero{
    display:grid;
    gap:16px;
    margin-bottom:24px;
  }
  .title{
    font-size:clamp(2rem,4vw,3rem);
    font-weight:700;
    margin:0;
  }
  .meta,.muted{color:var(--muted)}
  .grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
    gap:14px;
    margin:24px 0;
  }
  .card{
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:18px;
    padding:18px;
  }
  h2{
    font-size:14px;
    text-transform:uppercase;
    letter-spacing:.12em;
    color:var(--muted);
    margin:0 0 12px;
  }
  h3{
    margin:0 0 8px;
    font-size:16px;
  }
  ul{margin:0;padding-left:18px}
  li{margin:6px 0}
  pre{
    white-space:pre-wrap;
    word-break:break-word;
    background:var(--surface-2);
    border:1px solid var(--border);
    padding:16px;
    border-radius:16px;
    overflow:auto;
    font-size:12px;
  }
  table{
    width:100%;
    border-collapse:collapse;
    font-size:13px;
  }
  th,td{
    padding:10px 12px;
    border-bottom:1px solid var(--border);
    text-align:left;
    vertical-align:top;
  }
  th{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
  .pill{
    display:inline-flex;
    padding:4px 10px;
    border-radius:999px;
    background:#182846;
    color:#dce8ff;
    font-size:12px;
    border:1px solid #27406f;
  }
</style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div>
        <span class="pill">${a.quality}</span>
      </div>
      <h1 class="title">${a.owner}/${a.repo}</h1>
      <p class="meta">
        Branch: <strong>${a.branch}</strong> · Status: <strong>${a.status}</strong> · Source: <strong>${a.sourceUsed}</strong>
      </p>
      <p class="muted">
        This export is designed for fast structural review, documentation, and LLM-assisted understanding.
      </p>
    </section>

    <section class="grid">
      <div class="card"><h2>Nodes</h2><div>${a.metrics.nodes}</div></div>
      <div class="card"><h2>Edges</h2><div>${a.metrics.edges}</div></div>
      <div class="card"><h2>Functions</h2><div>${a.metrics.functions}</div></div>
      <div class="card"><h2>Max complexity</h2><div>${a.metrics.maxComplexity}</div></div>
    </section>

    <section class="grid">
      <div class="card">
        <h2>Languages</h2>
        <ul>
          ${
            languages.length
              ? languages
                  .map(
                    ([lang, count]) =>
                      `<li><strong>${lang}</strong>: ${count}</li>`,
                  )
                  .join("")
              : "<li>No language metadata available.</li>"
          }
        </ul>
      </div>

      <div class="card">
        <h2>Warnings</h2>
        <ul>
          ${
            a.metrics.warnings?.length
              ? a.metrics.warnings.map((item) => `<li>${item}</li>`).join("")
              : "<li>No warnings.</li>"
          }
        </ul>
      </div>
    </section>

    <section class="card" style="margin-bottom:14px">
      <h2>Highest connectivity</h2>
      <table>
        <thead>
          <tr><th>Node</th><th>Kind</th><th>Degree</th></tr>
        </thead>
        <tbody>
          ${topDegree
            .map(
              ({ node, degree }) =>
                `<tr><td>${node.label}</td><td>${node.kind}</td><td>${degree}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </section>

    <section class="card" style="margin-bottom:14px">
      <h2>Highest complexity</h2>
      <table>
        <thead>
          <tr><th>Node</th><th>Kind</th><th>Complexity</th></tr>
        </thead>
        <tbody>
          ${topComplexity
            .map(
              (node) =>
                `<tr><td>${node.label}</td><td>${node.kind}</td><td>${node.complexity ?? ""}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2>Raw JSON</h2>
      <pre id="payload"></pre>
    </section>
  </div>
  <script>
    const data = ${payload};
    document.getElementById("payload").textContent = JSON.stringify(data, null, 2);
  </script>
</body>
</html>`;
}

export function exportJson(a: Analysis) {
  const filename = `${baseName(a)}.json`;
  download(
    filename,
    JSON.stringify(buildJson(a), null, 2),
    "application/json;charset=utf-8",
  );
}

export function exportTxt(a: Analysis) {
  const filename = `${baseName(a)}.txt`;
  download(filename, buildTxtReport(a), "text/plain;charset=utf-8");
}

export function exportMarkdown(a: Analysis) {
  const filename = `${baseName(a)}.md`;
  download(filename, buildMarkdownReport(a), "text/markdown;charset=utf-8");
}

export function exportGraphML(a: Analysis) {
  const filename = `${baseName(a)}.graphml`;
  download(filename, buildGraphML(a), "application/xml;charset=utf-8");
}

export function exportDot(a: Analysis) {
  const filename = `${baseName(a)}.dot`;
  download(filename, buildDot(a), "text/plain;charset=utf-8");
}

export function exportMermaid(a: Analysis) {
  const filename = `${baseName(a)}.mmd`;
  download(filename, buildMermaidFlowchart(a), "text/plain;charset=utf-8");
}

export function exportMermaidMindmap(a: Analysis) {
  const filename = `${baseName(a)}.mindmap.mmd`;
  download(filename, buildMermaidMindmap(a), "text/plain;charset=utf-8");
}

export function exportHtml(a: Analysis) {
  const filename = `${baseName(a)}.html`;
  download(filename, buildHtml(a), "text/html;charset=utf-8");
}

export function exportSvg(
  svg: SVGSVGElement | null,
  a: Analysis,
  fileSuffix = "mindmap",
) {
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bounds = svg.getBoundingClientRect();
  const width = Math.max(
    1,
    Math.round(bounds.width || Number(svg.getAttribute("width")) || 1600),
  );
  const height = Math.max(
    1,
    Math.round(bounds.height || Number(svg.getAttribute("height")) || 1000),
  );

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute(
    "viewBox",
    clone.getAttribute("viewBox") || `0 0 ${width} ${height}`,
  );

  const source = new XMLSerializer().serializeToString(clone);
  download(
    `${baseName(a)}-${fileSuffix}.svg`,
    source,
    "image/svg+xml;charset=utf-8",
  );
}

export function exportPng(svg: SVGSVGElement | null, a: Analysis) {
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bounds = svg.getBoundingClientRect();
  const width = Math.max(
    1,
    Math.round(bounds.width || Number(svg.getAttribute("width")) || 1200),
  );
  const height = Math.max(
    1,
    Math.round(bounds.height || Number(svg.getAttribute("height")) || 800),
  );

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute(
    "viewBox",
    clone.getAttribute("viewBox") || `0 0 ${width} ${height}`,
  );

  const source = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  const image = new Image();

  image.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      download(`${baseName(a)}.png`, blob, "image/png");
    }, "image/png");
  };

  image.src = url;
}
