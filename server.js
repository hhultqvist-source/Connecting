const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const root = __dirname;

async function handleClaude(req,res){
  const key = process.env.CLAUDE_API_KEY;
  if (!key) {
    res.writeHead(503,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
    return res.end(JSON.stringify({message:"AI service is not configured on the server."}));
  }

  let raw="";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100000) {
      res.writeHead(413,{"Content-Type":"application/json; charset=utf-8"});
      return res.end(JSON.stringify({message:"Request too large."}));
    }
  }

  let body;
  try { body = JSON.parse(raw || "{}"); }
  catch {
    res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
    return res.end(JSON.stringify({message:"Invalid JSON."}));
  }

  const system = String(body.system || "").slice(0,20000);
  const content = String(body.content || "").slice(0,30000);
  const maxTokens = Math.max(64, Math.min(Number(body.maxTokens) || 1024, 4096));
  if (!content) {
    res.writeHead(400,{"Content-Type":"application/json; charset=utf-8"});
    return res.end(JSON.stringify({message:"Missing content."}));
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{
        "x-api-key":key,
        "anthropic-version":"2023-06-01",
        "content-type":"application/json"
      },
      body:JSON.stringify({
        model:process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
        max_tokens:maxTokens,
        system,
        messages:[{role:"user",content}]
      })
    });

    const data = await upstream.json().catch(()=>({}));
    if (!upstream.ok) {
      res.writeHead(upstream.status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
      return res.end(JSON.stringify({message:data?.error?.message || "AI request failed."}));
    }

    const text = Array.isArray(data.content)
      ? data.content.filter(x=>x && x.type==="text").map(x=>x.text || "").join("").trim()
      : "";

    res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
    return res.end(JSON.stringify({text}));
  } catch (err) {
    res.writeHead(502,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
    return res.end(JSON.stringify({message:"AI service could not be reached."}));
  }
}

const types = {
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".png":"image/png",
  ".svg":"image/svg+xml",
  ".ico":"image/x-icon",
  ".webmanifest":"application/manifest+json"
};

http.createServer((req,res)=>{
  const url = new URL(req.url, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/api/claude" && req.method === "POST") {
    return handleClaude(req,res);
  }
  if (pathname === "/" || pathname === "") pathname = "/index.html";
  const file = path.join(root, pathname.replace(/^\/+/, ""));
  if (!file.startsWith(root)) {
    res.writeHead(403); return res.end("Forbidden");
  }
  fs.readFile(file,(err,data)=>{
    if(err){
      fs.readFile(path.join(root,"index.html"),(e,fallback)=>{
        if(e){res.writeHead(404);return res.end("Not found");}
        res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"});
        res.end(Buffer.from(fallback.toString("utf8").replace("</body>","<script src=\"/ui-fix.js\"></script><script src=\"/app-fix.js\"></script></body>"),"utf8"));
      });
      return;
    }
    res.writeHead(200,{
      "Content-Type":types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": pathname.endsWith(".html") ? "no-store" : "public, max-age=3600",
      "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"same-origin"
    });
    res.end(pathname.endsWith(".html") ? Buffer.from(data.toString("utf8").replace("</body>","<script src=\"/ui-fix.js\"></script><script src=\"/app-fix.js\"></script></body>"),"utf8") : data);
  });
}).listen(port,()=>console.log("Connecting live on port "+port));