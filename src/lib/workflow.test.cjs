/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = {};
function load(file) {
  const full = path.resolve(__dirname, file + '.ts');
  if (cache[full]) return cache[full];
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => load(name), mod, mod.exports);
  cache[full] = mod.exports;
  return mod.exports;
}
const { latestEvaluation, patientSeverity, canManagePatient } = load('access');
// Giai đoạn B (CN2): tập huấn luyện lấy ảnh đã xác nhận nhãn (trainingImages), thay researchImages (ảnh đã nhập diện tích và bấm chia sẻ).
const { trainingImages } = load('imageLabel');
const { researchCsv, researchCaptureMetadata, researchLabels } = load('research');
const doctor = { id: 'd1', role: 'doctor', researchAccess: true, locked: false };
const tech = { id: 't1', role: 'admin', researchAccess: true, locked: false };
const patient = { id: 'u1', role: 'patient', locked: false };
const p = { id: 'p1', code: 'BN001', researchCode: 'RS-A1B2', name: 'PRIVATE_NAME', phone: 'PRIVATE_PHONE', birthYear: 1980, doctorId: doctor.id, researchConsent: true };
const label = { imageType: 'follow_up', outline: [[0.1,0.1],[0.5,0.1],[0.5,0.5]], outlineSource: 'ai', traits: { granulation:{level:'medium'}, necrosis:{level:'none'}, exudate:{level:'low', note:'PRIVATE_NOTE'}, periwound:{level:'none'}, infection:{level:'none'} }, note: 'PRIVATE_NOTE', confidence: 'certain', quality: 'pass', confirmedAt: 'PRIVATE_TIME', confirmedBy: 'PRIVATE_DOCTOR', updatedBy: 'PRIVATE_DOCTOR' };
const image = { id: 'IMG0001', patientId: p.id, woundId: 'w1', source: 'doctor', status: 'labeled', areaCm2: 12.5, ext: 'png', filename: 'old.png', captureDate: '2026-10-12', uploadDate: '2026-10-12', label };
const data = { patients: [p], accounts: [doctor,tech,patient], images:[image], wounds:[{ id:'w1', patientId:p.id, code:'VT01', status:'active', startDate:'2026-10-01' }], evaluations:[], sessions:[] };
assert.equal(canManagePatient(doctor,p),true);
assert.equal(canManagePatient({...doctor,id:'other'},p),false);
assert.equal(canManagePatient(patient,p),false);
assert.equal(trainingImages(data,tech).length,1);
// Chỉ quản trị có quyền nghiên cứu mới xuất; bác sĩ không xuất tập huấn luyện.
for(const actor of [null,patient,doctor,{...tech,locked:true},{...tech,pendingApproval:true},{...tech,researchAccess:false}]) assert.equal(trainingImages(data,actor).length,0);
for(const patch of [{status:'excluded'},{label:{...label,confirmedAt:undefined}},{label:{...label,quality:'fail',qualityReason:'Mờ'}},{label:undefined}]) assert.equal(trainingImages({...data, images:[{...image,...patch}]},tech).length,0);
assert.equal(trainingImages({...data, images:[{...image,areaCm2:null}]},tech).length,1,'không cần diện tích');
assert.equal(trainingImages({...data, images:[{...image,source:'patient'}]},tech).length,1,'ảnh bệnh nhân chụp đã xác nhận cũng vào');
assert.equal(trainingImages({...data,patients:[{...p,researchConsent:false}]},tech).length,0);
const two = {...data, images:[image,{...image,id:'IMG0002',captureDate:'2026-10-20'}]};
const csv = researchCsv(two,two.images);
const labels = JSON.stringify(researchLabels(two,two.images));
const capture = { imageSource:'gallery',width:640,height:480,roi:{x:.15,y:.15,width:.7,height:.7},roiCoordinates:'saved_image_normalized',quality:{profileId:'experimental',profileValidated:false,lighting:'unknown',sharpness:'warn',metrics:null},visualReview:{framing:true,lighting:false,sharpness:false,reviewedAt:'PRIVATE_TIME'},manualReference:{confirmedBy:'PRIVATE_DOCTOR',method:'PRIVATE_NAME'},capabilities:{model:'PRIVATE_DEVICE'},sessionId:'PRIVATE_SESSION',capturedAt:'PRIVATE_TIME' };
const metadata = JSON.stringify(researchCaptureMetadata([{...image,capture}]));
for(const privateValue of ['PRIVATE_TIME','PRIVATE_DOCTOR','PRIVATE_NAME','PRIVATE_DEVICE','PRIVATE_SESSION']) assert.equal(metadata.includes(privateValue),false);
assert.equal(JSON.parse(metadata)[0].automatic_area_cm2,null);
assert.equal(JSON.parse(metadata)[0].area_reference_cm2,12.5);
for(const forbidden of [p.name,p.phone,p.code,String(p.birthYear),image.captureDate,'PRIVATE_NOTE','PRIVATE_TIME','PRIVATE_DOCTOR']) { assert.equal(csv.includes(forbidden),false,forbidden); assert.equal(labels.includes(forbidden),false,forbidden); }
assert.match(csv,/RS-A1B2_VT01_IMG0001_area_12.5_cm2.png/);
const rows = csv.trim().split('\n').map(r => r.split(','));
const col = name => rows[0].indexOf(name);
assert.equal(rows[1][col('split')],rows[2][col('split')]);
assert.equal(rows[1][col('days_since_start')],'11');
assert.equal(rows[2][col('capture_order')],'2');
assert.equal(rows[1][col('exudate')],'low');
assert.equal(JSON.parse(labels)[0].outline.length,3);
assert.equal(researchCsv({...data,images:[{...image,areaCm2:null}]},[{...image,areaCm2:null}]).includes('RS-A1B2_VT01_IMG0001.png'),true);
data.evaluations = [
  { id:'e1',woundId:'w1',date:'2026-10-12',severity:'mild',visibleToPatient:true },
  { id:'e2',woundId:'w1',date:'2026-10-12',severity:'severe',visibleToPatient:false },
];
assert.equal(latestEvaluation(data,'w1',true).severity,'mild');
assert.equal(latestEvaluation(data,'w1').severity,'severe');
assert.equal(patientSeverity(data,'p1'),'severe');
assert.equal(patientSeverity({...data,evaluations:[]},'p1'),undefined);
console.log('workflow: permission, consent, training set privacy, grouping and severity checks passed');

