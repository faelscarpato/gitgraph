import type { Analysis } from "./graph-types";

function download(filename: string, content: string | Blob, mime = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function exportJson(a: Analysis) {
  const payload = {
    ...a,
    _export: {
      exportedAt: new Date().toISOString(),
      schema: "genia-analyzer/v2",
      quality: a.quality,
      sourceUsed: a.sourceUsed,
      attempted: a.attempted,
      limitations: a.limitations,
    },
  };
  download(`${a.repo}-${a.branch}.json`, JSON.stringify(payload, null, 2), "application/json");
}

export function exportGraphML(a: Analysis) {
  const esc = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
    );
  const nodes = a.nodes
    .map(
      (n) =>
        `    <node id="${esc(n.id)}"><data key="label">${esc(n.label)}</data><data key="kind">${n.kind}</data></node>`,
    )
    .join("\n");
  const edges = a.edges
    .map(
      (e, i) =>
        `    <edge id="e${i}" source="${esc(e.source)}" target="${esc(e.target)}"><data key="kind">${e.kind}</data></edge>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- GenIA Analyzer v2 · quality=${a.quality} · source=${a.sourceUsed} -->
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="kind" for="node" attr.name="kind" attr.type="string"/>
  <key id="kind" for="edge" attr.name="kind" attr.type="string"/>
  <graph id="G" edgedefault="directed">
${nodes}
${edges}
  </graph>
</graphml>`;
  download(`${a.repo}-${a.branch}.graphml`, xml, "application/xml");
}

export function exportPng(svg: SVGSVGElement | null, a: Analysis) {
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bbox = svg.getBoundingClientRect();
  clone.setAttribute("width", String(bbox.width));
  clone.setAttribute("height", String(bbox.height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const source = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = bbox.width * scale;
    canvas.height = bbox.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0d1424";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) download(`${a.repo}-${a.branch}.png`, blob, "image/png");
    }, "image/png");
  };
  img.src = url;
}

export function exportDot(a: Analysis) {
  const esc = (s: string) => s.replace(/[\\"]/g, (c) => ({ "\\": "\\\\", '"': '\\"' })[c]!);

  const nodeGroups = new Map<string, string[]>();

  for (const n of a.nodes) {
    const cluster = n.group ?? "default";
    if (!nodeGroups.has(cluster)) nodeGroups.set(cluster, []);
    const attrs = [
      `label="${esc(n.label)}"`,
      `kind="${n.kind}"`,
      n.loc != null ? `loc=${n.loc}` : "",
      n.complexity != null ? `complexity=${n.complexity}` : "",
      n.language ? `language="${n.language}"` : "",
      n.entrypoint ? "entrypoint=true" : "",
    ]
      .filter(Boolean)
      .join(", ");
    nodeGroups.get(cluster)!.push(`    "${esc(n.id)}" [${attrs}]`);
  }

  const edgeLines: string[] = [];
  for (const e of a.edges) {
    edgeLines.push(
      `    "${esc(e.source)}" -> "${esc(e.target)}" [label="${e.kind}", weight=${e.weight}]`,
    );
  }

  let dot = `// GenIA Analyzer · ${a.owner}/${a.repo} @ ${a.branch}\n`;
  dot += `// quality=${a.quality} · ${a.nodes.length} nodes · ${a.edges.length} edges\n`;
  dot += `digraph "${esc(a.repo)}" {\n`;
  dot += `  graph [rankdir=LR, splines=ortho, bgcolor="#0d1424", fontname="Inter"]\n`;
  dot += `  node [shape=box, style=filled, fillcolor="#1e2a44", color="#3b5998", fontname="Inter"]\n`;
  dot += `  edge [color="#4a6fa5", fontname="Inter"]\n\n`;

  for (const [cluster, nodes] of nodeGroups) {
    if (cluster !== "default") {
      dot += `  subgraph "cluster_${esc(cluster)}" {\n`;
      dot += `    label="${esc(cluster)}"\n`;
      dot += `    color="#3b5998"\n`;
      dot += `    style=filled\n`;
      dot += `    fillcolor="#111a2e"\n\n`;
      dot += nodes.join("\n") + "\n";
      dot += `  }\n\n`;
    } else {
      dot += nodes.join("\n") + "\n";
    }
  }

  dot += `\n  ${edgeLines.join("\n  ")}\n`;
  dot += "}\n";

  download(`${a.repo}-${a.branch}.dot`, dot, "text/plain");
}

export function exportMermaid(a: Analysis) {
  const esc = (s: string) => s.replace(/[^a-zA-Z0-9_]/g, (c) => `_${c.charCodeAt(0)}_`);

  const nodeDefs: string[] = [];
  for (const n of a.nodes) {
    const shape =
      n.kind === "function"
        ? n.functionData?.isMethod
          ? "(["
          : "("
        : n.kind === "module"
          ? "((("
          : "[";
    const close =
      n.kind === "function"
        ? n.functionData?.isMethod
          ? ")]"
          : ")"
        : n.kind === "module"
          ? ")))"
          : "]";
    nodeDefs.push(`    ${esc(n.id)}${shape}${n.label}${close}`);
  }

  const edgeLines: string[] = [];
  const edgeStyle = new Map<string, string>();
  edgeStyle.set("import", "-->");
  edgeStyle.set("call", "==>");
  edgeStyle.set("config", "-.->");

  for (const e of a.edges) {
    const style = edgeStyle.get(e.kind) ?? "-->";
    edgeLines.push(`    ${esc(e.source)} ${style} ${esc(e.target)}`);
  }

  const mmd = `%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#1e2a44', 'primaryTextColor': '#e6ecf5', 'primaryBorderColor': '#3b5998', 'lineColor': '#4a6fa5', 'secondaryColor': '#111a2e' }}}%%
graph TD
    %% GenIA Analyzer · ${a.owner}/${a.repo} @ ${a.branch}
    %% quality=${a.quality} · ${a.nodes.length} nodes · ${a.edges.length} edges

${nodeDefs.join("\n")}

${edgeLines.join("\n")}
`;

  download(`${a.repo}-${a.branch}.mmd`, mmd, "text/plain");
}

export function exportHtml(a: Analysis) {
  const data = JSON.stringify(a).replace(/</g, "\\u003c");
  const warnings = (a.metrics.warnings ?? []).map((w) => `<li>${w}</li>`).join("");
  const limits = (a.limitations ?? []).map((w) => `<li>${w}</li>`).join("");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${a.owner}/${a.repo} — GenIA export</title>
<meta name="genia:quality" content="${a.quality}">
<meta name="genia:source" content="${a.sourceUsed}">
<style>
  body{font:14px/1.5 Inter,system-ui,sans-serif;margin:0;padding:32px;background:#0d1424;color:#e6ecf5}
  h1{font-size:20px;margin:0 0 8px}
  .meta{color:#94a3b8;font-size:12px;margin-bottom:24px}
  .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin-right:6px}
  .tag.full{background:#0f5132;color:#7ee2a8}
  .tag.partial{background:#664d03;color:#f6c96b}
  .tag.degraded{background:#582424;color:#f38b8b}
  ul{padding-left:18px;color:#cbd5e1;font-size:12px}
  table{border-collapse:collapse;width:100%;margin-top:16px}
  th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #1e2a44;font-size:12px}
  th{color:#94a3b8;font-weight:500;text-transform:uppercase;letter-spacing:.08em;font-size:10px}
  pre{background:#111a2e;padding:16px;border-radius:8px;overflow:auto;font-size:11px}
</style></head><body>
<h1>${a.owner}/${a.repo} <span style="color:#1978E5">@ ${a.branch}</span></h1>
<div class="meta">
  <span class="tag ${a.quality}">${a.quality} analysis</span>
  <span>source: <b>${a.sourceUsed}</b></span> · exported ${new Date().toISOString()}
</div>
<div>Nodes: <b>${a.metrics.nodes}</b> · Edges: <b>${a.metrics.edges}</b> · Density: <b>${a.metrics.density}</b> · Max complexity: <b>${a.metrics.maxComplexity}</b></div>
${warnings ? `<h3 style="margin-top:20px;color:#f6c96b">Warnings</h3><ul>${warnings}</ul>` : ""}
${limits ? `<h3 style="margin-top:12px;color:#f6c96b">Limitations</h3><ul>${limits}</ul>` : ""}
<h2 style="margin-top:32px;font-size:14px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8">Nodes</h2>
<table><thead><tr><th>ID</th><th>Kind</th><th>Label</th><th>LOC</th><th>Complexity</th></tr></thead><tbody>
${a.nodes.map((n) => `<tr><td>${n.id}</td><td>${n.kind}</td><td>${n.label}</td><td>${n.loc ?? ""}</td><td>${n.complexity ?? ""}</td></tr>`).join("")}
</tbody></table>
<h2 style="margin-top:32px;font-size:14px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8">Raw data</h2>
<pre id="data"></pre>
<script>document.getElementById("data").textContent = JSON.stringify(${data}, null, 2)</script>
</body></html>`;
  download(`${a.repo}-${a.branch}.html`, html, "text/html");
}
