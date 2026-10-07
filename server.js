const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

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
  const id=Date.now()+"-"+Math.random().toString(36).slice(2), mp3=path.join(os.tmpdir(),id+".mp3"), mp4=path.join(os.tmpdir(),id+".mp4");
  try{
    const upstream=await fetch("https://api.elevenlabs.io/v1/text-to-speech/sCiXutfHwQk7QxzQ8t39?output_format=mp3_44100_128",{
      method:"POST",headers:{"xi-api-key":key,"content-type":"application/json","accept":"audio/mpeg"},
      body:JSON.stringify(language==="Norwegian"?{text,model_id:"eleven_flash_v2_5",language_code:"no"}:{text,model_id:"eleven_multilingual_v2"})
    });
    if(!upstream.ok) throw new Error("Voice generation failed.");
    fs.writeFileSync(mp3,Buffer.from(await upstream.arrayBuffer()));
    const artwork=path.join(root,"voice-video-bg.png");
    // Explicit audio duration prevents low-fps buffering from adding a silent tail.
    const duration=await new Promise((resolve,reject)=>execFile(ffmpegPath,["-hide_banner","-threads","1","-i",mp3,"-f","null","-"],{timeout:30000},(e,stdout,stderr)=>{
      const match=String(stderr).match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if(e || !match) return reject(e || new Error("Could not read voice duration."));
      resolve(String(Number(match[1])*3600+Number(match[2])*60+Number(match[3])));
    }));
    await new Promise((resolve,reject)=>execFile(ffmpegPath,["-hide_banner","-loglevel","error","-nostats","-y","-threads","1","-loop","1","-framerate","1","-i",artwork,"-i",mp3,"-filter_threads","1","-c:v","libx264","-threads","2","-preset","veryfast","-tune","stillimage","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-t",duration,"-shortest","-movflags","+faststart",mp4],{timeout:120000,maxBuffer:1024*1024},(e,stdout,stderr)=>{if(e){console.error("voice-video ffmpeg:",stderr||e.message);reject(e)}else resolve()}));
    const video=fs.readFileSync(mp4);
    res.writeHead(200,{"Content-Type":"video/mp4","Content-Length":video.length,"Content-Disposition":"attachment; filename=\"incoming-voice-message.mp4\"","Cache-Control":"no-store"});
    res.end(video);
  }catch(e){console.error("voice-video error:",JSON.stringify({message:e?.message,code:e?.code,signal:e?.signal,killed:e?.killed}));res.writeHead(502,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify({message:"Could not create voice video."}));}
  finally{try{fs.unlinkSync(mp3)}catch{} try{fs.unlinkSync(mp4)}catch{}}
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