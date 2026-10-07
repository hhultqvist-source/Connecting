const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const sharp = require("sharp");

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
    if (raw.length > 8 * 1024 * 1024) {
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
  const content = Array.isArray(body.content)
    ? body.content
    : String(body.content || "").slice(0,30000);
  const maxTokens = Math.max(64, Math.min(Number(body.maxTokens) || 1024, 4096));
  if (!content || (Array.isArray(content) && content.length === 0)) {
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



async function handleTTS(req,res){
  const key=process.env.ELEVENLABS_API_KEY;
  if(!key){ res.writeHead(503,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}); return res.end(JSON.stringify({message:"Voice service is not configured."})); }
  let raw="";
  for await(const chunk of req){ raw+=chunk; if(raw.length>256000){ res.writeHead(413,{"Content-Type":"application/json"}); return res.end(JSON.stringify({message:"Text is too long."})); } }
  let body; try{ body=JSON.parse(raw||"{}"); }catch{ res.writeHead(400,{"Content-Type":"application/json"}); return res.end(JSON.stringify({message:"Invalid JSON."})); }
  const text=String(body.text||"").trim().slice(0,12000);
  const language=String(body.language||"");
  if(!text){ res.writeHead(400,{"Content-Type":"application/json"}); return res.end(JSON.stringify({message:"Missing text."})); }
  // ElevenLabs' multilingual model speaks the supplied target-language text directly.
  const requestedVoice=String(body.voice||"standard");
  const voiceId=requestedVoice==="henrik" ? "sCiXutfHwQk7QxzQ8t39" : (process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb");
  try{
    const upstream=await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+encodeURIComponent(voiceId)+"?output_format=mp3_44100_128",{
      method:"POST",headers:{"xi-api-key":key,"content-type":"application/json","accept":"audio/mpeg"},
      body:JSON.stringify(language==="Norwegian" ? {text,model_id:"eleven_flash_v2_5",language_code:"no"} : {text,model_id:"eleven_multilingual_v2"})
    });
    if(!upstream.ok){ const err=await upstream.text().catch(()=>""); res.writeHead(upstream.status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}); return res.end(JSON.stringify({message:"Voice generation failed.",detail:err.slice(0,300)})); }
    const audio=Buffer.from(await upstream.arrayBuffer());
    res.writeHead(200,{"Content-Type":"audio/mpeg","Content-Length":audio.length,"Cache-Control":"no-store"}); return res.end(audio);
  }catch(err){ res.writeHead(502,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}); return res.end(JSON.stringify({message:"Voice service could not be reached."})); }
}

async function handleVoiceVideo(req,res){
  const key=process.env.ELEVENLABS_API_KEY;
  if(!key){ res.writeHead(503,{"Content-Type":"application/json"}); return res.end(JSON.stringify({message:"Voice service is not configured."})); }
  let raw=""; for await(const chunk of req){ raw+=chunk; if(raw.length>256000){res.writeHead(413);return res.end();} }
  let body; try{body=JSON.parse(raw||"{}");}catch{res.writeHead(400,{"Content-Type":"application/json"});return res.end(JSON.stringify({message:"Invalid JSON."}));}
  const text=String(body.text||"").trim().slice(0,12000), language=String(body.language||"");
  if(!text){res.writeHead(400,{"Content-Type":"application/json"});return res.end(JSON.stringify({message:"Missing text."}));}
  const id=Date.now()+"-"+Math.random().toString(36).slice(2), mp3=path.join(os.tmpdir(),id+".mp3"), png=path.join(os.tmpdir(),id+".png"), mp4=path.join(os.tmpdir(),id+".mp4");
  try{
    const upstream=await fetch("https://api.elevenlabs.io/v1/text-to-speech/sCiXutfHwQk7QxzQ8t39?output_format=mp3_44100_128",{
      method:"POST",headers:{"xi-api-key":key,"content-type":"application/json","accept":"audio/mpeg"},
      body:JSON.stringify(language==="Norwegian"?{text,model_id:"eleven_flash_v2_5",language_code:"no"}:{text,model_id:"eleven_multilingual_v2"})
    });
    if(!upstream.ok) throw new Error("Voice generation failed.");
    fs.writeFileSync(mp3,Buffer.from(await upstream.arrayBuffer()));
    const svg=`<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><rect width="1080" height="1920" fill="#07132f"/><rect x="190" y="610" width="700" height="700" rx="56" fill="#0b1b43"/><circle cx="540" cy="855" r="145" fill="#142b62"/><rect x="500" y="745" width="80" height="180" rx="40" fill="#a9c8ff"/><path d="M455 865v20c0 48 38 86 85 86s85-38 85-86v-20" fill="none" stroke="#a9c8ff" stroke-width="22" stroke-linecap="round"/><path d="M540 971v65M480 1036h120" stroke="#a9c8ff" stroke-width="22" stroke-linecap="round"/><g stroke="#5b91ff" stroke-width="18" stroke-linecap="round"><path d="M310 850v60"/><path d="M355 815v130"/><path d="M400 845v70"/><path d="M680 845v70"/><path d="M725 815v130"/><path d="M770 850v60"/></g><text x="540" y="1150" text-anchor="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="600">Incoming voice message</text></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(png);
    await new Promise((resolve,reject)=>execFile(ffmpegPath,["-y","-loop","1","-framerate","30","-i",png,"-i",mp3,"-c:v","libx264","-preset","veryfast","-tune","stillimage","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-shortest","-movflags","+faststart",mp4],{timeout:120000},(e)=>e?reject(e):resolve()));
    const video=fs.readFileSync(mp4);
    res.writeHead(200,{"Content-Type":"video/mp4","Content-Length":video.length,"Content-Disposition":"attachment; filename=\"incoming-voice-message.mp4\"","Cache-Control":"no-store"});
    res.end(video);
  }catch(e){res.writeHead(502,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify({message:"Could not create voice video."}));}
  finally{try{fs.unlinkSync(mp3)}catch{} try{fs.unlinkSync(png)}catch{} try{fs.unlinkSync(mp4)}catch{}}
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
  if (pathname === "/api/tts" && req.method === "POST") {
    return handleTTS(req,res);
  }
  if (pathname === "/api/voice-video" && req.method === "POST") {
    return handleVoiceVideo(req,res);
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
        res.end(Buffer.from(fallback.toString("utf8").replace("</body>","<script src=\"/ui-fix.js?v=20261005b\"></script><script src=\"/app-fix.js?v=20261005b\"></script></body>"),"utf8"));
      });
      return;
    }
    res.writeHead(200,{
      "Content-Type":types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": (pathname.endsWith(".html") || pathname.endsWith(".js")) ? "no-store" : "public, max-age=3600",
      "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"same-origin"
    });
    res.end(pathname.endsWith(".html") ? Buffer.from(data.toString("utf8").replace("</body>","<script src=\"/ui-fix.js?v=20261005b\"></script><script src=\"/app-fix.js?v=20261005b\"></script></body>"),"utf8") : data);
  });
}).listen(port,()=>console.log("Connecting live on port "+port));