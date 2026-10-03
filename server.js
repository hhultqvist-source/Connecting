const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const root = __dirname;

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