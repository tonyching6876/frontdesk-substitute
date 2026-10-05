function dayKey(d) { return d.toISOString().slice(0,10); }
function shiftDay(k,n) { var d=new Date(k+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return dayKey(d); }
function cycleFor(k) {var d=new Date(k+'T00:00:00Z');var s=shiftDay(k,-((d.getUTCDay()+4)%7));return Array.from({length:7},function(_,i){return shiftDay(s,i);});}
function parseShift(raw) {
  var code=String(raw||'').replace(/\s+/g,'').toUpperCase();
  if(!code)return {known:true,slots:[],raw:''};
  if(/^[NCER]{2}$/.test(code))return {known:true,slots:[2,3],raw:code};
  if(/^(?:[NCER][123])+$/.test(code))return {known:true,slots:Array.from(new Set(code.match(/[123]/g).map(Number))),raw:code};
  return {known:false,slots:[],raw:code};
}
function columnsFor(values,year,month) {
  var dates={},currentMonth=month-1,prev=0,header=values[0]||[];
  for(var c=2;c<header.length;c++){
    var n=Number(header[c]);if(!Number.isInteger(n)||n<1||n>31)continue;
    if(!prev&&n>1)currentMonth--;
    if(prev&&n<prev)currentMonth++;
    var d=new Date(Date.UTC(year,currentMonth,n));
    if(d.getUTCDate()!==n)throw Error('班表日期欄位異常');
    var weekday='日一二三四五六'[d.getUTCDay()];
    if(String((values[1]||[])[c]||'').trim()!==weekday)throw Error('班表日期與星期不符，請確認年份及格式');
    dates[dayKey(d)]=c;prev=n;
  }
  if(!Object.keys(dates).length)throw Error('找不到班表日期欄位');
  return dates;
}
function addSheetDays(people,values,year,month,overwrite) {
  var columns=columnsFor(values,year,month);
  var byId={};people.forEach(function(p){byId[p.id]=p;});
  for(var row=2;row<values.length;row++){
    var cells=values[row]||[],p=byId[String(cells[0]||'').trim()];if(!p)continue;
    Object.keys(columns).forEach(function(k){if(overwrite||!Object.prototype.hasOwnProperty.call(p.days,k))p.days[k]=String(cells[columns[k]]||'').trim();});
  }
  return columns;
}
function checkCandidate(person,date,slot,maxDays) {
  var today=Object.prototype.hasOwnProperty.call(person.days,date)?parseShift(person.days[date]):{known:false,slots:[],raw:''};
  if(!today.known)return {status:'pending',reason:'當日班別待確認'};
  if(today.slots.indexOf(Number(slot))>=0)return {status:'blocked',reason:'查詢時段已有班'};
  var cycle=cycleFor(date),workdays=0,missing=0,unknown=0;
  cycle.forEach(function(k){if(!Object.prototype.hasOwnProperty.call(person.days,k)){missing++;return;}var s=parseShift(person.days[k]);if(!s.known)unknown++;if(s.raw)workdays++;});
  if(today.slots.length)return {status:'eligible',reason:'當日已有其他時段的班；不增加值勤日',workdays:workdays,missing:missing,unknown:unknown,cycle:cycle};
  if(workdays>=maxDays)return {status:'blocked',reason:'本週期已值勤 '+workdays+' 天',workdays:workdays,cycle:cycle};
  if(missing||unknown)return {status:'pending',reason:'週期資料不足或班別待確認',workdays:workdays,missing:missing,unknown:unknown,cycle:cycle};
  return {status:'eligible',reason:'本週期已值勤 '+workdays+' 天；代班後 '+(workdays+1)+' 天',workdays:workdays,cycle:cycle};
}
