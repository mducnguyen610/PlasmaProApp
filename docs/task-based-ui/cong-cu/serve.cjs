const http=require('http'),fs=require('fs'),path=require('path');const root=process.argv[2];
http.createServer((q,s)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){const h=p+'.html';p=fs.existsSync(h)?h:path.join(root,'index.html');}
const ext=path.extname(p);s.writeHead(200,{'Content-Type':{'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.ttf':'font/ttf','.json':'application/json','.wasm':'application/wasm'}[ext]||'application/octet-stream'});fs.createReadStream(p).pipe(s);}).listen(8600);
