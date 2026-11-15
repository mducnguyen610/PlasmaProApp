// Công cụ đo cho audit giao diện theo tác vụ (13/11/2026). Chạy: npx expo export -p web; node serve.cjs dist (cổng 8600); node do-cuon.cjs <thư mục ảnh>.
// Đo chiều cao nội dung cuộn và vị trí đáy nút chính ở 320x640, 360x740, 390x844, 768x1024. Chỉ đọc dữ liệu mẫu.
// Đo chiều cao cuộn và vị trí nút chính. Không đổi dữ liệu ngoài giả lập phiên ở T02 (trong trình duyệt riêng).
const { chromium } = require('playwright'); const path=require('path');
const BASE='http://localhost:8600'; const OUT=process.argv[2]||'.';
const PHOTO='/home/user/plasmaproapp/assets/demo/demo_1.png';
const SIZES=[[320,640],[360,740],[390,844],[768,1024]];
const R={
 bacsi:[['B01','/doctor',null],['B02','/doctor/patients','Thêm mới'],['B03','/patients/new','Lưu hồ sơ và tạo tài khoản'],['B04','/patients/p-1',null],['B05','/wounds/w-1','Chụp ảnh có hướng dẫn'],
  ['B06','/plan/p-1?woundId=w-1','Tiếp'],['B07','/evaluate/w-1',/^Lưu (và công bố|đánh giá)/],['B08','/compare/w-1',null],['B09','/capture','Chụp có hướng dẫn'],['B10','/guided-capture?woundId=w-1','Mở camera'],
  ['B10r','/guided-capture?woundId=w-1#review',/^Lưu ảnh/],['B11','/images/IMG0003',/^(Nhập diện tích|Sửa số đo)/],['B11u','/images/IMG0004',/^(Nhập diện tích|Sửa số đo)/],['B12','/doctor/dataset',null],['B13','/devices/d-1','Kết nối máy và nạp liệu trình'],
  ['T01b','/connect-device?patientId=p-1','Kết nối']],
 benhnhan:[['N02','/patient',null],['N03','/schedule',null],['N04','/patient/history',null],['N05','/wounds/w-1',null],['N06','/plan/p-1',null],['N07','/patient/device',null],['N08','/report','Gửi'],['N09','/patient/account','Đăng xuất'],
  ['T01','/connect-device?patientId=p-1','Kết nối'],['T02','/session-monitor?patientId=p-1&woundId=w-1','Bắt đầu điều trị'],['T02run','/session-monitor?patientId=p-1&woundId=w-1#run','Dừng điều trị']],
};
(async()=>{const b=await chromium.launch();const rows=[];
for(const [user,list] of Object.entries(R)){for(const [w,h] of SIZES){
 const ctx=await b.newContext({viewport:{width:w,height:h},locale:'vi-VN'});const p=await ctx.newPage();p.on('dialog',d=>d.type()==='beforeunload'?d.accept():d.dismiss());
 await p.goto(BASE+'/');await p.waitForTimeout(1000);
 await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
 await p.getByText('Đăng nhập',{exact:true}).last().click();await p.waitForTimeout(1000);
 const cb=p.getByRole('checkbox');if(await cb.count()){await cb.first().click();await p.getByText('Đăng nhập',{exact:true}).last().click();await p.waitForTimeout(1200);}
 const sk=p.getByText('Bỏ qua');if(await sk.count()){await sk.first().click();await p.waitForTimeout(600);}
 for(const [id,url,prim] of list){
  const u=url.split('#')[0];try{await p.goto(BASE+u);}catch(e){await p.waitForTimeout(500);await p.goto(BASE+u);}await p.waitForTimeout(1500);
  try{
  if(url.endsWith('#review')){const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:5000}),p.getByText('Chọn ảnh có sẵn',{exact:true}).click()]);await fc.setFiles(PHOTO);await p.waitForTimeout(3500);}
  if(url.endsWith('#run')){const k=p.getByText('Kết nối',{exact:true});if(await k.count()){await k.first().click();await p.waitForTimeout(1500);}await p.getByText('Bắt đầu điều trị').click();await p.waitForTimeout(2000);}
  }catch(e){rows.push({id,user,w,h,err:String(e).slice(0,80)});continue;}
  const m=await p.evaluate(()=>{let sc=null,H=document.documentElement.scrollHeight;for(const el of document.querySelectorAll('body *')){const cs=getComputedStyle(el);if((cs.overflowY==='auto'||cs.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+2){if(!sc||el.scrollHeight>sc.scrollHeight)sc=el;}}
   const vis=sc?sc.clientHeight:window.innerHeight;const top=sc?sc.getBoundingClientRect().top:0;const content=sc?sc.scrollHeight:H;
   const nBtn=[...document.querySelectorAll('[role=button],button,[role=link],input,textarea,[role=switch],[role=radio]')].filter(e=>e.getBoundingClientRect().width>0).length;
   return {content,vis,top,nBtn};});
  let pr=null;
  if(prim){const loc=typeof prim==='string'?p.getByText(prim,{exact:true}):p.getByText(prim);if(await loc.count()){const bb=await loc.last().boundingBox();if(bb)pr={y:Math.round(bb.y+bb.height)};}}
  const tab=(user!=='quantri'&&['/doctor','/doctor/patients','/doctor/dataset','/patient','/patient/history','/patient/device','/patient/account'].includes(u))?96:0;
  rows.push({id,user,w,h,content:m.content,vis:m.vis,screens:+(m.content/Math.max(1,m.vis-tab)).toFixed(2),nBtn:m.nBtn,primBottom:pr?pr.y:null,primFold:pr?(pr.y<=h-tab?'màn đầu':'cần cuộn'):(prim?'không thấy':'—')});
  if(w===360){await p.setViewportSize({width:w,height:Math.min(12000,Math.max(h,m.content+m.top+20))});await p.waitForTimeout(300);await p.screenshot({path:path.join(OUT,`${id}-360-toantrang.png`)});await p.setViewportSize({width:w,height:h});}
 }
 await ctx.close();}}
await b.close();require('fs').writeFileSync(path.join(OUT,'do-cuon.json'),JSON.stringify(rows,null,1));
for(const r of rows)console.log([r.id,r.w,r.content,r.screens,r.nBtn,r.primBottom,r.primFold,r.err||''].join('\t'));})();
