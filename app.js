const STORAGE_KEY = 'kakei-app-data-v72';
const LEGACY_KEYS = ['kakei-app-data-v7','kakei-app-data-v6','kakei-app-data-v5','kakei-app-data-v3-safe','kakei-app-data-v2','kakei-app-data'];
const APP_VERSION = '7.2.0';
const defaultCategories = ['食費','日用品','教育費','医療費','車関連','光熱費','通信費','保険','特別費','外食・レジャー','その他'];
const taxAccountOptions = {
  propertyIncome:['家賃収入','更新料','礼金・権利金','返還不要の敷金・保証金','共益費・その他収入'],
  propertyExpense:[
    '管理費・修繕積立金','固定資産税・都市計画税','損害保険料','修繕費','借入金利息','減価償却費',
    '賃貸管理手数料','広告料・AD','原状回復費','設備交換費','消耗品費','通信費・郵送費','交通費',
    '税理士報酬','登記・司法書士','ローン事務手数料・保証料','振込手数料','その他経費'
  ],
  nonDeductible:['ローン元本','所得税・住民税','延滞税・加算税・罰金','私的生活費','土地取得費','建物取得費（一括不可）','自用・家事分','その他対象外'],
  furusato:['ふるさと納税']
};
const taxTypeLabels = { propertyIncome:'不動産収入', propertyExpense:'不動産経費', nonDeductible:'経費対象外メモ', furusato:'ふるさと納税' };
const taxAccountGuides = {
  '管理費・修繕積立金':{status:'経費OK', note:'賃貸中の区分所有に係る管理費・修繕積立金。自用分が混ざる場合は按分。'},
  '固定資産税・都市計画税':{status:'経費OK', note:'貸付資産に係る固定資産税・都市計画税。自宅分は対象外。'},
  '損害保険料':{status:'経費OK', note:'貸付物件の火災保険・地震保険など。複数年契約は期間対応に注意。'},
  '修繕費':{status:'経費OK/資本的支出注意', note:'原状回復や通常の修理は経費。価値や耐久性を高める工事は資本的支出として減価償却になる場合あり。'},
  '借入金利息':{status:'経費OK', note:'ローン返済全額ではなく利息部分。土地取得に対応する利息は損益通算時に制限が出る場合あり。'},
  '減価償却費':{status:'経費OK', note:'建物・設備部分を耐用年数で按分して経費化。土地は償却不可。'},
  '賃貸管理手数料':{status:'経費OK', note:'管理会社への集金代行・賃貸管理手数料。'},
  '広告料・AD':{status:'経費OK', note:'入居者募集の広告料、AD、仲介関連費用。'},
  '原状回復費':{status:'経費OK/内容確認', note:'通常損耗の補修は経費。設備更新や改良は資本的支出の可能性。'},
  '設備交換費':{status:'経費OK/減価償却注意', note:'少額・修理なら経費、長期使用する設備交換は資産計上・減価償却の可能性。'},
  '消耗品費':{status:'経費OK', note:'賃貸運営に直接使う少額備品・書類用品など。私用分は対象外。'},
  '通信費・郵送費':{status:'按分注意', note:'賃貸運営に使った分だけ。家計用スマホ・ネットと混ざる場合は合理的に按分。'},
  '交通費':{status:'按分注意', note:'物件確認・管理会社訪問など賃貸運営目的の交通費。家族旅行や私用は対象外。'},
  '税理士報酬':{status:'経費OK/按分注意', note:'不動産所得の申告・相談に関する部分。給与や家計全体の相談分が混ざる場合は按分。'},
  '登記・司法書士':{status:'取得費/経費区分注意', note:'取得時費用は取得費になるものと経費になるものがあるため明細確認。売却時にも区分注意。'},
  'ローン事務手数料・保証料':{status:'期間按分注意', note:'内容により一括経費・期間按分・取得費の判断が分かれる可能性。明細保管。'},
  '振込手数料':{status:'経費OK', note:'賃貸経営に係る支払いの振込手数料。'},
  'ローン元本':{status:'経費NG', note:'元本返済は経費ではない。残債が減るだけ。'},
  '所得税・住民税':{status:'経費NG', note:'個人の所得税・住民税は不動産所得の必要経費にしない。'},
  '延滞税・加算税・罰金':{status:'経費NG', note:'税金のペナルティや罰金は原則として経費にしない。'},
  '私的生活費':{status:'経費NG', note:'家計・生活費・家族利用分は対象外。'},
  '土地取得費':{status:'経費NG', note:'土地は減価償却できない。売却時の取得費として管理。'},
  '建物取得費（一括不可）':{status:'一括経費NG', note:'建物部分は一括経費ではなく減価償却で経費化。'},
  '自用・家事分':{status:'経費NG', note:'自宅・私用に対応する費用は必要経費にしない。'}
};
const STRAIGHT_LINE_RATES = {2:.5,3:.334,4:.25,5:.2,6:.167,7:.143,8:.125,9:.112,10:.1,11:.091,12:.084,13:.077,14:.072,15:.067,16:.063,17:.059,18:.056,19:.053,20:.05,21:.048,22:.046,23:.044,24:.042,25:.04,26:.039,27:.038,28:.036,29:.035,30:.034,31:.033,32:.032,33:.031,34:.03,35:.029,36:.028,37:.028,38:.027,39:.026,40:.025,41:.025,42:.024,43:.024,44:.023,45:.023,46:.022,47:.022,48:.021,49:.021,50:.02};

function safeUuid(){ return (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function currentDate(){ return new Date().toISOString().slice(0,10); }
function currentYm(){ return currentDate().slice(0,7); }
function ym(dateStr){ return String(dateStr || '').slice(0,7); }
function yearFromYm(ymStr){ return Number(String(ymStr).slice(0,4)); }
function monthNumFromYm(ymStr){ return Number(String(ymStr).slice(5,7)); }
function addMonths(ymStr, delta){ const [y,m] = ymStr.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function formatYen(n){ const num = Number(n || 0); const sign = num < 0 ? '-' : ''; return `${sign}¥${Math.abs(Math.round(num)).toLocaleString('ja-JP')}`; }
function numberValue(id){ return Number(document.getElementById(id).value || 0); }
function textValue(id){ return document.getElementById(id).value.trim(); }
function escapeHtml(str){ return String(str ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function buildDefaultInvestment(){
  return { enabled:true, rentKawasaki:0, rentYokohama:0, loanKawasaki:0, loanYokohama:0, mgmtKawasakiBase:0, mgmtKawasakiIncrease:0, increaseStartYm:currentYm(), mgmtYokohama:0, propertyTaxAnnual:0 };
}
function buildDefaultPropertyAssets(){
  return {
    '物件1': { displayName:'投資用物件1', purchasePrice:0, landRatio:0, structureRatio:70, equipmentRatio:30, newDate:'', acquisitionDate:'', useStartDate:'', structureLegalLife:47, equipmentLegalLife:15, structureUsefulLifeOverride:'', equipmentUsefulLifeOverride:'' },
    '物件2': { displayName:'投資用物件2', purchasePrice:0, landRatio:0, structureRatio:70, equipmentRatio:30, newDate:'', acquisitionDate:'', useStartDate:'', structureLegalLife:47, equipmentLegalLife:15, structureUsefulLifeOverride:'', equipmentUsefulLifeOverride:'' }
  };
}
function buildDefaultTaxSettings(){ return { selectedProperty:'物件1', propertyAssets: buildDefaultPropertyAssets() }; }
function buildPublicDefaultData(){
  const nowYm = currentYm();
  const year = yearFromYm(nowYm);
  return {
    appVersion: APP_VERSION,
    settings:{ year, salaryMonthly:0, allowanceMonthly:0, otherIncomeMonthly:0, targetSavings:50000 },
    monthlyIncomes:{},
    currentYm: nowYm,
    categories: defaultCategories,
    expenses: [],
    taxEntries: [],
    taxSettings: buildDefaultTaxSettings(),
    fixedCosts: [
      {id:safeUuid(), name:'住宅ローン', mode:'monthly', monthly:0, annual:0},
      {id:safeUuid(), name:'ガソリン', mode:'monthly', monthly:0, annual:0},
      {id:safeUuid(), name:'電気', mode:'monthly', monthly:0, annual:0},
      {id:safeUuid(), name:'水道', mode:'monthly', monthly:0, annual:0},
      {id:safeUuid(), name:'通信費', mode:'monthly', monthly:0, annual:0},
      {id:safeUuid(), name:'自宅 固定資産税', mode:'annual', monthly:0, annual:0},
    ],
    investment: buildDefaultInvestment(),
    openingBalances: {},
    cashFlows: [],
  };
}
function normalizeFixedCost(f){
  f.id ||= safeUuid(); f.name ||= '固定費'; f.mode ||= 'monthly';
  f.monthly = Number(f.monthly || 0); f.annual = Number(f.annual || 0);
  if(f.mode === 'monthly') f.annual = Math.round(f.monthly * 12);
  if(f.mode === 'annual') f.monthly = Math.round(f.annual / 12);
}
function migrateData(raw){
  const parsed = JSON.parse(raw);
  if(!parsed.settings) parsed.settings = buildPublicDefaultData().settings;
  if(parsed.settings.otherIncomeMonthly === undefined) parsed.settings.otherIncomeMonthly = 0;
  if(!parsed.monthlyIncomes) parsed.monthlyIncomes = {};
  if(!parsed.categories) parsed.categories = defaultCategories;
  if(!parsed.currentYm) parsed.currentYm = currentYm();
  if(!parsed.expenses) parsed.expenses = [];
  if(!parsed.cashFlows) parsed.cashFlows = [];
  if(!parsed.taxEntries) parsed.taxEntries = [];
  if(!parsed.taxSettings) parsed.taxSettings = buildDefaultTaxSettings();
  if(!parsed.taxSettings.propertyAssets) parsed.taxSettings.propertyAssets = buildDefaultPropertyAssets();
  const defaultAssets = buildDefaultPropertyAssets();
  Object.keys(defaultAssets).forEach(k=>{ parsed.taxSettings.propertyAssets[k] = {...defaultAssets[k], ...(parsed.taxSettings.propertyAssets[k] || {})}; });
  parsed.taxSettings.selectedProperty ||= '物件1';
  if(!parsed.openingBalances) parsed.openingBalances = {};
  if(!parsed.fixedCosts) parsed.fixedCosts = [];
  if(!parsed.investment) parsed.investment = buildDefaultInvestment();
  parsed.fixedCosts = parsed.fixedCosts.filter(f => !String(f.name || '').includes('投資用不動産差額'));
  parsed.fixedCosts.forEach(normalizeFixedCost);
  parsed.appVersion = APP_VERSION;
  return parsed;
}
function loadData(){
  try{
    const own = localStorage.getItem(STORAGE_KEY);
    if(own) return migrateData(own);
    for(const key of LEGACY_KEYS){
      const raw = localStorage.getItem(key);
      if(raw){
        const migrated = migrateData(raw);
        try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); }catch(_e){}
        return migrated;
      }
    }
    return buildPublicDefaultData();
  }catch(e){ return buildPublicDefaultData(); }
}
let data = loadData();
function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); renderAll(); }

const screens = [...document.querySelectorAll('.screen')];
function navigate(name){
  screens.forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  window.scrollTo({ top:0, behavior:'smooth' });
  renderAll();
}
document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.nav)));

function getMonthlyIncomeRecord(targetYm){
  const rec = data.monthlyIncomes?.[targetYm];
  if(rec) return { salary:Number(rec.salary||0), allowance:Number(rec.allowance||0), other:Number(rec.other||0), memo:rec.memo||'', explicit:true };
  return { salary:Number(data.settings.salaryMonthly||0), allowance:Number(data.settings.allowanceMonthly||0), other:Number(data.settings.otherIncomeMonthly||0), memo:'標準収入を使用', explicit:false };
}
function getMonthlyIncome(targetYm){ const r = getMonthlyIncomeRecord(targetYm); return r.salary + r.allowance + r.other; }
function baseFixedMonthlyTotal(){ return data.fixedCosts.reduce((sum, f) => sum + Number(f.monthly||0), 0); }
function baseFixedAnnualTotal(){ return data.fixedCosts.reduce((sum, f) => sum + Number(f.annual||0), 0); }
function expensesForYm(targetYm){ return data.expenses.filter(e => ym(e.date) === targetYm); }
function cashFlowsForYm(targetYm){ return data.cashFlows.filter(c => ym(c.date) === targetYm); }

function investmentParts(targetYm){
  const inv = data.investment || buildDefaultInvestment();
  const rent = Number(inv.rentKawasaki||0) + Number(inv.rentYokohama||0);
  const loans = Number(inv.loanKawasaki||0) + Number(inv.loanYokohama||0);
  const start = String(inv.increaseStartYm || '9999-12');
  const kawasakiMgmt = Number(inv.mgmtKawasakiBase||0) + (targetYm >= start ? Number(inv.mgmtKawasakiIncrease||0) : 0);
  const management = kawasakiMgmt + Number(inv.mgmtYokohama||0);
  const taxMonthly = Math.round(Number(inv.propertyTaxAnnual||0) / 12);
  const diff = loans + management + taxMonthly - rent;
  return { rent, loans, management, taxMonthly, diff:Math.round(diff) };
}
function investmentMonthlyExpense(targetYm){
  const inv = data.investment || buildDefaultInvestment();
  if(inv.enabled === false) return 0;
  return investmentParts(targetYm).diff;
}
function fixedMonthlyTotal(targetYm){ return baseFixedMonthlyTotal() + investmentMonthlyExpense(targetYm); }
function fixedAnnualEstimate(){ let total = baseFixedAnnualTotal(); for(let m=1;m<=12;m++) total += investmentMonthlyExpense(`${data.settings.year}-${String(m).padStart(2,'0')}`); return total; }
function getMonthlySummary(targetYm){
  const expenses = expensesForYm(targetYm);
  const variableExpense = expenses.reduce((sum,e)=>sum+Number(e.amount||0),0);
  const fixed = fixedMonthlyTotal(targetYm);
  const income = getMonthlyIncome(targetYm);
  const totalExpense = fixed + variableExpense;
  const monthEnd = income - totalExpense;
  const remainingAfterTarget = monthEnd - Number(data.settings.targetSavings||0);
  return { income, fixed, variableExpense, totalExpense, monthEnd, remainingAfterTarget, expenses };
}
function monthlyYmsForYear(year){ return Array.from({length:12}, (_,i)=>`${year}-${String(i+1).padStart(2,'0')}`); }

function renderAll(){
  renderHeaderMonth(); renderHome(); renderExpenseFormOptions(); renderRecentExpenses(); renderIncomeEditor(); renderMonthly(); renderGraphs(); renderTax(); renderTaxExpenseGuide(); renderDepreciationCalculator(); renderFixedCosts(); renderCategoryManager(); renderInvestment(); renderCashflow(); renderReceiptOptions();
}
function renderHeaderMonth(){
  const label = `${data.currentYm.replace('-', '年')}月`;
  document.getElementById('currentMonthLabel').textContent = label;
  document.getElementById('monthlyHeaderLabel').textContent = `${data.currentYm} の集計`;
  document.getElementById('graphsHeaderLabel').textContent = `${data.settings.year}年 / ${data.currentYm}`;
  document.getElementById('cashflowHeaderLabel').textContent = `${data.currentYm} の予定入出金`;
  const taxLabel = document.getElementById('taxHeaderLabel'); if(taxLabel) taxLabel.textContent = `${data.settings.year}年分の申告用メモ`;
}
function renderHome(){
  const s = getMonthlySummary(data.currentYm);
  const cf = cashFlowsForYm(data.currentYm);
  const cardOut = cf.filter(x => x.type==='expense' && x.tag==='カード引落').reduce((a,b)=>a+Number(b.amount),0);
  const postpayOut = cf.filter(x => x.type==='expense' && x.tag==='ファミペイ後払い').reduce((a,b)=>a+Number(b.amount),0);
  document.getElementById('remainingBudget').textContent = formatYen(s.remainingAfterTarget);
  document.getElementById('remainingBudget').className = `hero-value ${s.remainingAfterTarget < 0 ? 'negative' : ''}`;
  const progress = s.income ? Math.max(0, Math.min(100, (s.monthEnd / Math.max(1, Number(data.settings.targetSavings||0))) * 100)) : 0;
  document.getElementById('monthlyProgress').style.width = `${progress}%`;
  document.getElementById('monthEndForecast').textContent = formatYen(s.monthEnd);
  document.getElementById('monthEndForecast').className = `value ${s.monthEnd < 0 ? 'negative' : 'positive'}`;
  document.getElementById('savingsProgress').textContent = formatYen(data.settings.targetSavings || 0);
  document.getElementById('incomeSummary').textContent = formatYen(s.income);
  document.getElementById('expenseSummary').textContent = formatYen(s.totalExpense);
  document.getElementById('cardOutflowSummary').textContent = formatYen(cardOut);
  document.getElementById('postpayOutflowSummary').textContent = formatYen(postpayOut);
  const incomeRec = getMonthlyIncomeRecord(data.currentYm);
  const alerts = [];
  if(!incomeRec.explicit) alerts.push('給与は月ごとに変わるため、「月間収支」でこの月の収入を入力してください。未入力時は標準収入を使います。');
  if(s.income === 0) alerts.push('収入が未入力です。月間収支で給与・児童手当を入力してください。');
  if(s.remainingAfterTarget < 0) alerts.push('残し目標に届かない見込みです。変動費を確認してください。');
  if(cardOut + postpayOut > 100000) alerts.push('引落予定が大きめです。資金繰り画面を確認してください。');
  if(data.openingBalances[data.currentYm] === undefined) alerts.push('月初残高が未設定です。');
  alerts.push('月末振込の給与は、翌月の生活費として使うなら翌月収入に入力する運用でOKです。');
  document.getElementById('alertsList').innerHTML = alerts.map(a=>`<li>${escapeHtml(a)}</li>`).join('');
}
function renderExpenseFormOptions(){
  const select = document.getElementById('expenseCategory'); const current = select.value;
  select.innerHTML = '<option value="">選択してください</option>' + data.categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
  if(data.categories.includes(current)) select.value = current;
  if(!document.getElementById('expenseDate').value) document.getElementById('expenseDate').value = currentDate();
}
function renderReceiptOptions(){
  const select = document.getElementById('ocrCategory'); const current = select.value;
  select.innerHTML = data.categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
  if(data.categories.includes(current)) select.value = current;
  if(!select.value) select.value = 'その他';
}
function renderRecentExpenses(){
  const el = document.getElementById('recentExpenses');
  const items = expensesForYm(data.currentYm).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,14);
  el.innerHTML = items.length ? items.map(e=>`
    <div class="expense-row">
      <div><strong>${escapeHtml(e.category)}</strong><br><small>${escapeHtml(e.date)}・${escapeHtml(e.memo || 'メモなし')}・${escapeHtml(e.method)}</small></div>
      <div><strong>${formatYen(e.amount)}</strong><div class="row-actions"><button class="ghost-btn small" onclick="editExpense('${e.id}')">編集</button><button class="ghost-btn small" onclick="deleteExpense('${e.id}')">削除</button></div></div>
    </div>`).join('') : '<div class="muted">まだ支出がありません。</div>';
}
window.deleteExpense = function(id){ if(!confirm('この支出を削除しますか？')) return; data.expenses = data.expenses.filter(e=>e.id!==id); saveData(); };
window.editExpense = function(id){ const e = data.expenses.find(x=>x.id===id); if(!e) return; document.getElementById('editingExpenseId').value=e.id; document.getElementById('expenseAmount').value=e.amount; document.getElementById('expenseDate').value=e.date; document.getElementById('expenseCategory').value=e.category; document.getElementById('expenseMethod').value=e.method; document.getElementById('expenseMemo').value=e.memo||''; document.getElementById('saveExpenseBtn').textContent='更新する'; navigate('entry'); };

function renderIncomeEditor(){
  const rec = getMonthlyIncomeRecord(data.currentYm);
  document.getElementById('incomeSalary').value = rec.salary || '';
  document.getElementById('incomeAllowance').value = rec.allowance || '';
  document.getElementById('incomeOther').value = rec.other || '';
  document.getElementById('incomeMemo').value = rec.explicit ? rec.memo : '';
}
function renderMonthly(){
  const s = getMonthlySummary(data.currentYm);
  document.getElementById('monthlySummaryTable').innerHTML = `
    <div class="row"><span>収入合計</span><strong>${formatYen(s.income)}</strong></div>
    <div class="row"><span>固定費合計</span><strong>${formatYen(s.fixed)}</strong></div>
    <div class="row"><span>変動費合計</span><strong>${formatYen(s.variableExpense)}</strong></div>
    <div class="row"><span>支出合計</span><strong>${formatYen(s.totalExpense)}</strong></div>
    <div class="row"><span>月末残額</span><strong class="${s.monthEnd<0?'negative':'positive'}">${formatYen(s.monthEnd)}</strong></div>
    <div class="row"><span>先取り後残額</span><strong class="${s.remainingAfterTarget<0?'negative':'positive'}">${formatYen(s.remainingAfterTarget)}</strong></div>`;
  const inv = investmentMonthlyExpense(data.currentYm);
  const fixedBreakdown = [...data.fixedCosts.map(f=>[f.name, Number(f.monthly||0)]), ['投資用不動産差額', inv]].filter(([,v])=>v!==0).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  document.getElementById('fixedBreakdown').innerHTML = fixedBreakdown.length ? fixedBreakdown.map(([k,v])=>`<div class="breakdown-row"><span>${escapeHtml(k)}</span><strong class="${v<0?'positive':''}">${formatYen(v)}</strong></div>`).join('') : '<div class="muted">固定費が未設定です。</div>';
  const byCat = {}; s.expenses.forEach(e=> byCat[e.category] = (byCat[e.category]||0)+Number(e.amount));
  document.getElementById('categoryBreakdown').innerHTML = Object.keys(byCat).length ? Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="breakdown-row"><span>${escapeHtml(k)}</span><strong>${formatYen(v)}</strong></div>`).join('') : '<div class="muted">まだカテゴリ別支出がありません。</div>';
}
function renderGraphs(){
  const year = Number(data.settings.year || yearFromYm(data.currentYm));
  const yms = monthlyYmsForYear(year);
  const summaries = yms.map(m => ({ym:m, ...getMonthlySummary(m)}));
  const annualIncome = summaries.reduce((a,b)=>a+b.income,0);
  const annualBalance = summaries.reduce((a,b)=>a+b.monthEnd,0);
  document.getElementById('graphYearIncome').textContent = formatYen(annualIncome);
  document.getElementById('graphYearBalance').textContent = formatYen(annualBalance);
  document.getElementById('graphYearBalance').className = `value ${annualBalance<0?'negative':'positive'}`;
  const maxExpense = Math.max(1, ...summaries.map(s=>Math.max(s.income, s.totalExpense)));
  document.getElementById('annualBars').innerHTML = summaries.map(s=>{
    const incomeW = Math.min(100, s.income / maxExpense * 100);
    const expenseW = Math.min(100, s.totalExpense / maxExpense * 100);
    const balW = Math.min(100, Math.abs(s.monthEnd) / maxExpense * 100);
    const m = monthNumFromYm(s.ym);
    return `<div class="bar-row"><div class="bar-label">${m}月</div><div class="bar-track"><div class="bar-income" style="width:${incomeW}%"></div><div class="bar-expense" style="width:${expenseW}%;top:0;height:45%"></div><div class="bar-balance" style="width:${balW}%;background:${s.monthEnd<0?'linear-gradient(90deg,#fca5a5,#ef4444)':'linear-gradient(90deg,#86efac,#16a34a)'}"></div></div><div class="bar-value">${formatYen(s.monthEnd)}</div></div>`;
  }).join('');
  const current = getMonthlySummary(data.currentYm);
  const byCat = {}; current.expenses.forEach(e => byCat[e.category]=(byCat[e.category]||0)+Number(e.amount));
  const maxCat = Math.max(1, ...Object.values(byCat));
  document.getElementById('categoryBars').innerHTML = Object.keys(byCat).length ? Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="category-row"><div class="category-head"><strong>${escapeHtml(k)}</strong><span>${formatYen(v)}</span></div><div class="category-track"><div class="category-fill" style="width:${Math.round(v/maxCat*100)}%"></div></div></div>`).join('') : '<div class="muted">今月の変動費がまだありません。</div>';
  const total = Math.max(1, current.fixed + current.variableExpense);
  const fixedPct = Math.round(current.fixed / total * 100);
  document.getElementById('expenseMix').innerHTML = `<div class="donut" style="--p:${fixedPct}%"></div><div class="mix-legend"><div><span class="legend-dot dot-fixed"></span>固定費 ${formatYen(current.fixed)} / ${fixedPct}%</div><div><span class="legend-dot dot-variable"></span>変動費 ${formatYen(current.variableExpense)} / ${100-fixedPct}%</div><div class="hint">投資用不動産は差額のみ固定費側に入れています。</div></div>`;
}

function renderFixedCosts(){
  document.getElementById('settingsYear').value = data.settings.year;
  document.getElementById('salaryMonthly').value = data.settings.salaryMonthly;
  document.getElementById('allowanceMonthly').value = data.settings.allowanceMonthly;
  document.getElementById('otherIncomeMonthly').value = data.settings.otherIncomeMonthly || 0;
  document.getElementById('targetSavings').value = data.settings.targetSavings;
  const wrap = document.getElementById('fixedCostsList'); wrap.innerHTML = '';
  const tpl = document.getElementById('fixedCostRowTemplate');
  data.fixedCosts.forEach(item=>{
    normalizeFixedCost(item);
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.fixed-name').value = item.name;
    node.querySelector('.fixed-type').textContent = item.mode === 'monthly' ? '毎月' : '年払い';
    node.querySelector('.fixed-monthly').value = item.monthly;
    node.querySelector('.fixed-annual').value = item.annual;
    node.querySelector('.fixed-mode').value = item.mode;
    node.querySelector('.fixed-name').addEventListener('change', e=>{ item.name=e.target.value; saveData(); });
    node.querySelector('.fixed-monthly').addEventListener('change', e=>{ item.monthly=Number(e.target.value||0); if(item.mode==='monthly') item.annual=item.monthly*12; saveData(); });
    node.querySelector('.fixed-annual').addEventListener('change', e=>{ item.annual=Number(e.target.value||0); if(item.mode==='annual') item.monthly=Math.round(item.annual/12); saveData(); });
    node.querySelector('.fixed-mode').addEventListener('change', e=>{ item.mode=e.target.value; normalizeFixedCost(item); saveData(); });
    node.querySelector('.delete-fixed').addEventListener('click', ()=>{ if(confirm('この固定費を削除しますか？')){ data.fixedCosts=data.fixedCosts.filter(x=>x.id!==item.id); saveData(); }});
    wrap.appendChild(node);
  });
}

function renderCategoryManager(){
  const wrap = document.getElementById('categoryManagerList');
  if(!wrap) return;
  wrap.innerHTML = data.categories.map((cat, idx)=>`
    <div class="category-manager-row">
      <input class="category-name-input" type="text" value="${escapeHtml(cat)}" data-index="${idx}" aria-label="カテゴリ名" />
      <button class="ghost-btn small delete-category-btn" type="button" data-index="${idx}">削除</button>
    </div>`).join('');
  wrap.querySelectorAll('.category-name-input').forEach(input=>{
    input.addEventListener('change', e=>{
      const idx = Number(e.target.dataset.index);
      const oldName = data.categories[idx];
      const newName = e.target.value.trim();
      if(!newName){ e.target.value = oldName; return alert('カテゴリ名を入力してください。'); }
      if(data.categories.some((c,i)=>i!==idx && c===newName)){ e.target.value = oldName; return alert('同じカテゴリ名があります。'); }
      data.categories[idx] = newName;
      data.expenses.forEach(exp=>{ if(exp.category === oldName) exp.category = newName; });
      saveData();
    });
  });
  wrap.querySelectorAll('.delete-category-btn').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const idx = Number(e.target.dataset.index);
      const name = data.categories[idx];
      if(data.categories.length <= 1) return alert('カテゴリは最低1つ必要です。');
      if(!confirm(`カテゴリ「${name}」を削除しますか？過去の支出は「その他」に移します。`)) return;
      data.categories.splice(idx,1);
      if(!data.categories.includes('その他')) data.categories.push('その他');
      data.expenses.forEach(exp=>{ if(exp.category === name) exp.category = 'その他'; });
      saveData();
    });
  });
}

function taxEntriesForYear(year){ return (data.taxEntries||[]).filter(t => yearFromYm(ym(t.date)) === Number(year)); }

function monthsBetweenDates(startDate, endDate){
  if(!startDate || !endDate) return 0;
  const s = new Date(startDate); const e = new Date(endDate);
  if(Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(0, months);
}
function usedUsefulLife(legalLife, newDate, acquisitionDate){
  const legal = Number(legalLife || 0);
  if(!legal) return 0;
  const elapsedYears = monthsBetweenDates(newDate, acquisitionDate) / 12;
  let life = 0;
  if(elapsedYears >= legal) life = Math.floor(legal * 0.2);
  else life = Math.floor((legal - elapsedYears) + elapsedYears * 0.2);
  return Math.max(2, life || legal);
}
function depreciationRate(life){ return STRAIGHT_LINE_RATES[Number(life)] || Number((1 / Number(life || 1)).toFixed(3)); }
function monthsInServiceForYear(useStartDate, year){
  const start = new Date(useStartDate || `${year}-01-01`);
  const y = Number(year);
  if(Number.isNaN(start.getTime())) return 12;
  if(start.getFullYear() > y) return 0;
  if(start.getFullYear() < y) return 12;
  return 13 - (start.getMonth() + 1);
}
function calculateDepreciationForAsset(asset, year){
  const purchasePrice = Number(asset.purchasePrice || 0);
  const landRatio = Number(asset.landRatio || 0);
  const buildingRatio = Math.max(0, 100 - landRatio);
  const buildingAmount = Math.round(purchasePrice * buildingRatio / 100);
  const landAmount = Math.round(purchasePrice * landRatio / 100);
  const structureAmount = Math.round(buildingAmount * Number(asset.structureRatio || 70) / 100);
  const equipmentAmount = buildingAmount - structureAmount;
  const autoStructureLife = usedUsefulLife(Number(asset.structureLegalLife || 47), asset.newDate, asset.acquisitionDate);
  const autoEquipmentLife = usedUsefulLife(Number(asset.equipmentLegalLife || 15), asset.newDate, asset.acquisitionDate);
  const structureLife = Number(asset.structureUsefulLifeOverride || 0) || autoStructureLife;
  const equipmentLife = Number(asset.equipmentUsefulLifeOverride || 0) || autoEquipmentLife;
  const structureRate = depreciationRate(structureLife);
  const equipmentRate = depreciationRate(equipmentLife);
  const months = monthsInServiceForYear(asset.useStartDate || asset.acquisitionDate, year);
  const structureAnnual = Math.round(structureAmount * structureRate);
  const equipmentAnnual = Math.round(equipmentAmount * equipmentRate);
  const structureYear = Math.round(structureAnnual * months / 12);
  const equipmentYear = Math.round(equipmentAnnual * months / 12);
  return { purchasePrice, landRatio, buildingRatio, landAmount, buildingAmount, structureAmount, equipmentAmount, structureLife, equipmentLife, autoStructureLife, autoEquipmentLife, structureRate, equipmentRate, months, structureAnnual, equipmentAnnual, structureYear, equipmentYear, totalYear:structureYear + equipmentYear };
}
function selectedTaxAssetKey(){ const assets = data.taxSettings?.propertyAssets || buildDefaultPropertyAssets(); const keys = Object.keys(assets); return (data.taxSettings?.selectedProperty && assets[data.taxSettings.selectedProperty]) ? data.taxSettings.selectedProperty : (keys[0] || '物件1'); }
function selectedTaxAsset(){
  data.taxSettings ||= buildDefaultTaxSettings();
  data.taxSettings.propertyAssets ||= buildDefaultPropertyAssets();
  return data.taxSettings.propertyAssets[selectedTaxAssetKey()] || Object.values(data.taxSettings.propertyAssets)[0];
}
function renderTaxExpenseGuide(){
  const el = document.getElementById('taxExpenseGuide'); if(!el) return;
  const ok = ['管理費・修繕積立金','固定資産税・都市計画税','損害保険料','借入金利息','減価償却費','賃貸管理手数料','広告料・AD','原状回復費','振込手数料'];
  const caution = ['修繕費','設備交換費','通信費・郵送費','交通費','税理士報酬','登記・司法書士','ローン事務手数料・保証料'];
  const ng = taxAccountOptions.nonDeductible;
  const renderList = arr => arr.map(k=>`<li><strong>${escapeHtml(k)}</strong><br><span>${escapeHtml(taxAccountGuides[k]?.note || '')}</span></li>`).join('');
  el.innerHTML = `
    <details open><summary>経費にしやすいもの</summary><ul class="guide-list ok">${renderList(ok)}</ul></details>
    <details><summary>条件付き・按分・資本的支出に注意</summary><ul class="guide-list caution">${renderList(caution)}</ul></details>
    <details><summary>経費にしないもの</summary><ul class="guide-list ng">${renderList(ng)}</ul></details>
    <div class="hint">この画面は台帳です。最終判断は領収書・明細・国税庁の作成コーナー・税理士確認で行ってください。</div>`;
}
function renderTaxAccountHint(){
  const el = document.getElementById('taxAccountHint'); if(!el) return;
  const account = document.getElementById('taxAccount')?.value || '';
  const guide = taxAccountGuides[account];
  if(!guide){ el.innerHTML = '<span class="muted">カテゴリを選ぶと経費判定のメモを表示します。</span>'; return; }
  const cls = guide.status.includes('NG') ? 'ng' : (guide.status.includes('注意') || guide.status.includes('按分') ? 'caution' : 'ok');
  el.innerHTML = `<div class="account-hint ${cls}"><strong>${escapeHtml(guide.status)}</strong><br>${escapeHtml(guide.note)}</div>`;
}
function renderDepreciationCalculator(){
  const select = document.getElementById('deprPropertySelect'); if(!select) return;
  data.taxSettings ||= buildDefaultTaxSettings();
  data.taxSettings.propertyAssets ||= buildDefaultPropertyAssets();
  const assets = data.taxSettings.propertyAssets;
  select.innerHTML = Object.keys(assets).map(k=>`<option value="${escapeHtml(k)}">${escapeHtml(assets[k].displayName || k)}</option>`).join('');
  select.value = selectedTaxAssetKey();
  const a = selectedTaxAsset();
  document.getElementById('deprPurchasePrice').value = a.purchasePrice || 0;
  document.getElementById('deprLandRatio').value = a.landRatio || 0;
  document.getElementById('deprStructureRatio').value = a.structureRatio || 70;
  document.getElementById('deprEquipmentRatio').value = a.equipmentRatio || 30;
  document.getElementById('deprNewDate').value = a.newDate || '';
  document.getElementById('deprAcquisitionDate').value = a.acquisitionDate || '';
  document.getElementById('deprUseStartDate').value = a.useStartDate || a.acquisitionDate || '';
  document.getElementById('deprStructureLifeLegal').value = a.structureLegalLife || 47;
  document.getElementById('deprEquipmentLifeLegal').value = a.equipmentLegalLife || 15;
  document.getElementById('deprStructureLifeOverride').value = a.structureUsefulLifeOverride || '';
  document.getElementById('deprEquipmentLifeOverride').value = a.equipmentUsefulLifeOverride || '';
  const calc = calculateDepreciationForAsset(a, Number(data.settings.year || yearFromYm(data.currentYm)));
  document.getElementById('deprSummary').innerHTML = `
    <div class="depr-grid">
      <div><span>土地</span><strong>${formatYen(calc.landAmount)}</strong><small>${calc.landRatio}% / 償却不可</small></div>
      <div><span>建物</span><strong>${formatYen(calc.buildingAmount)}</strong><small>${calc.buildingRatio.toFixed(2)}%</small></div>
      <div><span>躯体</span><strong>${formatYen(calc.structureAmount)}</strong><small>耐用年数 ${calc.structureLife}年 / 率 ${calc.structureRate}${calc.structureLife!==calc.autoStructureLife?' / 手入力補正':''}</small></div>
      <div><span>設備</span><strong>${formatYen(calc.equipmentAmount)}</strong><small>耐用年数 ${calc.equipmentLife}年 / 率 ${calc.equipmentRate}${calc.equipmentLife!==calc.autoEquipmentLife?' / 手入力補正':''}</small></div>
      <div><span>対象月数</span><strong>${calc.months}か月</strong><small>${data.settings.year}年分</small></div>
      <div><span>償却費</span><strong>${formatYen(calc.totalYear)}</strong><small>躯体 ${formatYen(calc.structureYear)} / 設備 ${formatYen(calc.equipmentYear)}</small></div>
    </div>
    <div class="hint">土地は償却しません。購入価格 × (1−土地割合) を建物部分とし、建物部分を躯体70%・設備30%に分けて概算します。中古資産の見積耐用年数は端数処理や税務判断で差が出ることがあるため、必要に応じて手入力補正を使ってください。</div>`;
}
function clearTaxEntryForm(){
  const id = document.getElementById('editingTaxEntryId'); if(!id) return;
  id.value = '';
  document.getElementById('taxDate').value = currentDate();
  document.getElementById('taxType').value = 'propertyExpense';
  document.getElementById('taxProperty').value = '共通';
  document.getElementById('taxAmount').value = '';
  document.getElementById('taxMemo').value = '';
  renderTaxAccountOptions();
}
function renderTaxPropertyOptions(){
  const prop = document.getElementById('taxProperty'); if(!prop) return;
  data.taxSettings ||= buildDefaultTaxSettings();
  data.taxSettings.propertyAssets ||= buildDefaultPropertyAssets();
  const keys = Object.keys(data.taxSettings.propertyAssets);
  const current = prop.value;
  prop.innerHTML = keys.map(k=>`<option>${escapeHtml(k)}</option>`).join('') + '<option>共通</option><option>なし</option>';
  if([...keys,'共通','なし'].includes(current)) prop.value = current;
  else prop.value = keys[0] || '共通';
}
function renderTaxAccountOptions(){
  const typeEl = document.getElementById('taxType');
  const accountEl = document.getElementById('taxAccount');
  if(!typeEl || !accountEl) return;
  const type = typeEl.value || 'propertyExpense';
  const opts = taxAccountOptions[type] || taxAccountOptions.propertyExpense;
  const current = accountEl.value;
  accountEl.innerHTML = opts.map(x=>`<option>${escapeHtml(x)}</option>`).join('');
  if(opts.includes(current)) accountEl.value = current;
  const prop = document.getElementById('taxProperty');
  if(prop) prop.disabled = type === 'furusato';
  renderTaxAccountHint();
}
function renderTax(){
  const taxScreen = document.getElementById('taxSummary'); if(!taxScreen) return;
  renderTaxPropertyOptions();
  renderTaxAccountOptions();
  if(!document.getElementById('taxDate').value) document.getElementById('taxDate').value = currentDate();
  const year = Number(data.settings.year || yearFromYm(data.currentYm));
  const entries = taxEntriesForYear(year).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const propertyIncome = entries.filter(e=>e.type==='propertyIncome').reduce((a,b)=>a+Number(b.amount||0),0);
  const propertyExpense = entries.filter(e=>e.type==='propertyExpense').reduce((a,b)=>a+Number(b.amount||0),0);
  const furusato = entries.filter(e=>e.type==='furusato').reduce((a,b)=>a+Number(b.amount||0),0);
  const net = propertyIncome - propertyExpense;
  document.getElementById('taxPropertyNet').textContent = formatYen(net);
  document.getElementById('taxPropertyNet').className = `value ${net<0?'negative':'positive'}`;
  document.getElementById('taxFurusatoTotal').textContent = formatYen(furusato);
  const byAccount = {};
  entries.forEach(e=>{ const key=`${taxTypeLabels[e.type]||e.type} / ${e.account||'未分類'}`; byAccount[key]=(byAccount[key]||0)+Number(e.amount||0); });
  taxScreen.innerHTML = `
    <div class="breakdown-row"><span>不動産収入</span><strong>${formatYen(propertyIncome)}</strong></div>
    <div class="breakdown-row"><span>不動産経費</span><strong>${formatYen(propertyExpense)}</strong></div>
    <div class="breakdown-row"><span>不動産所得 概算</span><strong class="${net<0?'negative':'positive'}">${formatYen(net)}</strong></div>
    <div class="breakdown-row"><span>ふるさと納税寄附 合計</span><strong>${formatYen(furusato)}</strong></div>
    <div class="breakdown-row"><span>寄附金控除対象の目安</span><strong>${formatYen(Math.max(0, furusato - 2000))}</strong></div>
    <details class="tax-details"><summary>申告カテゴリ別の合計</summary>${Object.keys(byAccount).length ? Object.entries(byAccount).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="breakdown-row"><span>${escapeHtml(k)}</span><strong>${formatYen(v)}</strong></div>`).join('') : '<div class="muted">まだ記録がありません。</div>'}</details>
    <div class="hint">※ふるさと納税の控除上限判定や不動産所得の最終計算は、国税庁の確定申告書等作成コーナーや税理士確認用の下書きとして使ってください。</div>`;
  const list = document.getElementById('taxEntriesList');
  list.innerHTML = entries.length ? entries.map(e=>`
    <div class="tax-entry-row">
      <div><strong>${escapeHtml(taxTypeLabels[e.type] || e.type)}｜${escapeHtml(e.account || '')}</strong><br><small>${escapeHtml(e.date)}・${escapeHtml(e.property || '')}・${escapeHtml(e.memo || 'メモなし')}</small></div>
      <div><strong>${formatYen(e.amount)}</strong><div class="row-actions"><button class="ghost-btn small" onclick="editTaxEntry('${e.id}')">編集</button><button class="ghost-btn small" onclick="deleteTaxEntry('${e.id}')">削除</button></div></div>
    </div>`).join('') : '<div class="muted">まだ申告用記録がありません。</div>';
}
window.editTaxEntry = function(id){
  const e = (data.taxEntries||[]).find(x=>x.id===id); if(!e) return;
  document.getElementById('editingTaxEntryId').value = e.id;
  document.getElementById('taxDate').value = e.date;
  document.getElementById('taxType').value = e.type;
  document.getElementById('taxProperty').value = e.property || '共通';
  renderTaxAccountOptions();
  document.getElementById('taxAccount').value = e.account || document.getElementById('taxAccount').value;
  document.getElementById('taxAmount').value = e.amount;
  document.getElementById('taxMemo').value = e.memo || '';
  navigate('tax');
};
window.deleteTaxEntry = function(id){ if(!confirm('この申告用記録を削除しますか？')) return; data.taxEntries = (data.taxEntries||[]).filter(e=>e.id!==id); saveData(); };
function exportTaxCsv(){
  const year = Number(data.settings.year || yearFromYm(data.currentYm));
  const rows = [['日付','種類','物件','申告カテゴリ','経費判定','金額','メモ']];
  taxEntriesForYear(year).forEach(e=>rows.push([e.date, taxTypeLabels[e.type]||e.type, e.property||'', e.account||'', taxAccountGuides[e.account]?.status || '', e.amount||0, e.memo||'']));
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`kakutei-tax-${year}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}

function renderInvestment(){
  const inv = data.investment || buildDefaultInvestment();
  document.getElementById('invRentKawasaki').value = inv.rentKawasaki || 0;
  document.getElementById('invRentYokohama').value = inv.rentYokohama || 0;
  document.getElementById('invLoanKawasaki').value = inv.loanKawasaki || 0;
  document.getElementById('invLoanYokohama').value = inv.loanYokohama || 0;
  document.getElementById('invMgmtKawasakiBase').value = inv.mgmtKawasakiBase || 0;
  document.getElementById('invMgmtKawasakiIncrease').value = inv.mgmtKawasakiIncrease || 0;
  document.getElementById('invIncreaseStartYm').value = inv.increaseStartYm || currentYm();
  document.getElementById('invMgmtYokohama').value = inv.mgmtYokohama || 0;
  document.getElementById('invPropertyTaxAnnual').value = inv.propertyTaxAnnual || 0;
  const p = investmentParts(data.currentYm);
  document.getElementById('investmentSummary').innerHTML = `今月の家計負担: <strong>${formatYen(p.diff)}</strong><br>家賃 ${formatYen(p.rent)} / ローン ${formatYen(p.loans)} / 管理費等 ${formatYen(p.management)} / 税月割 ${formatYen(p.taxMonthly)}`;
}
function renderCashflow(){
  document.getElementById('openingBalance').value = data.openingBalances[data.currentYm] ?? '';
  if(!document.getElementById('cashFlowDate').value) document.getElementById('cashFlowDate').value = currentDate();
  const items = cashFlowsForYm(data.currentYm).sort((a,b)=>a.date.localeCompare(b.date));
  const opening = Number(data.openingBalances[data.currentYm] || 0);
  const income = items.filter(i=>i.type==='income').reduce((a,b)=>a+Number(b.amount),0);
  const out = items.filter(i=>i.type==='expense').reduce((a,b)=>a+Number(b.amount),0);
  const forecast = opening + income - out;
  document.getElementById('cashflowForecast').textContent = formatYen(forecast);
  document.getElementById('cashflowForecast').className = `value ${forecast<0?'negative':'positive'}`;
  document.getElementById('cashflowOutflow').textContent = formatYen(out);
  document.getElementById('cashFlowList').innerHTML = items.length ? items.map(c=>`<div class="cash-row"><div><strong>${escapeHtml(c.title)}</strong><br><small>${escapeHtml(c.date)}・${escapeHtml(c.tag)}</small></div><div><strong class="${c.type==='expense'?'negative':'positive'}">${c.type==='expense'?'-':'+'}${formatYen(c.amount).replace('-','')}</strong><div class="row-actions"><button class="ghost-btn small" onclick="editCashFlow('${c.id}')">編集</button><button class="ghost-btn small" onclick="deleteCashFlow('${c.id}')">削除</button></div></div></div>`).join('') : '<div class="muted">予定入出金がありません。</div>';
}
window.deleteCashFlow = function(id){ if(!confirm('この予定を削除しますか？')) return; data.cashFlows=data.cashFlows.filter(x=>x.id!==id); saveData(); };
window.editCashFlow = function(id){ const c = data.cashFlows.find(x=>x.id===id); if(!c) return; document.getElementById('editingCashFlowId').value=c.id; document.getElementById('cashFlowDate').value=c.date; document.getElementById('cashFlowTitle').value=c.title; document.getElementById('cashFlowType').value=c.type; document.getElementById('cashFlowAmount').value=c.amount; document.getElementById('cashFlowTag').value=c.tag; navigate('cashflow'); };

function clearExpenseForm(){ document.getElementById('expenseForm').reset(); document.getElementById('editingExpenseId').value=''; document.getElementById('expenseDate').value=currentDate(); document.getElementById('saveExpenseBtn').textContent='保存する'; }
function clearCashFlowForm(){ document.getElementById('cashFlowForm').reset(); document.getElementById('editingCashFlowId').value=''; document.getElementById('cashFlowDate').value=currentDate(); }

document.getElementById('prevMonthBtn').addEventListener('click',()=>{ data.currentYm=addMonths(data.currentYm,-1); saveData(); });
document.getElementById('nextMonthBtn').addEventListener('click',()=>{ data.currentYm=addMonths(data.currentYm,1); saveData(); });
document.getElementById('clearExpenseFormBtn').addEventListener('click', clearExpenseForm);
document.getElementById('expenseForm').addEventListener('submit', e=>{
  e.preventDefault();
  const id = document.getElementById('editingExpenseId').value || safeUuid();
  const record = { id, amount:numberValue('expenseAmount'), date:document.getElementById('expenseDate').value, category:document.getElementById('expenseCategory').value, method:document.getElementById('expenseMethod').value, memo:textValue('expenseMemo') };
  if(!record.amount || !record.date || !record.category) return alert('金額・日付・カテゴリを入力してください。');
  const idx = data.expenses.findIndex(x=>x.id===id); if(idx>=0) data.expenses[idx]=record; else data.expenses.push(record);
  clearExpenseForm(); saveData(); navigate('home');
});
document.getElementById('saveMonthlyIncomeBtn').addEventListener('click',()=>{
  data.monthlyIncomes ||= {};
  data.monthlyIncomes[data.currentYm] = { salary:numberValue('incomeSalary'), allowance:numberValue('incomeAllowance'), other:numberValue('incomeOther'), memo:textValue('incomeMemo') };
  saveData(); alert('この月の収入を保存しました。');
});
document.getElementById('saveSettingsBtn').addEventListener('click',()=>{
  data.settings.year=numberValue('settingsYear'); data.settings.salaryMonthly=numberValue('salaryMonthly'); data.settings.allowanceMonthly=numberValue('allowanceMonthly'); data.settings.otherIncomeMonthly=numberValue('otherIncomeMonthly'); data.settings.targetSavings=numberValue('targetSavings'); saveData();
});
document.getElementById('saveInvestmentBtn').addEventListener('click',()=>{
  data.investment = { enabled:true, rentKawasaki:numberValue('invRentKawasaki'), rentYokohama:numberValue('invRentYokohama'), loanKawasaki:numberValue('invLoanKawasaki'), loanYokohama:numberValue('invLoanYokohama'), mgmtKawasakiBase:numberValue('invMgmtKawasakiBase'), mgmtKawasakiIncrease:numberValue('invMgmtKawasakiIncrease'), increaseStartYm:document.getElementById('invIncreaseStartYm').value || currentYm(), mgmtYokohama:numberValue('invMgmtYokohama'), propertyTaxAnnual:numberValue('invPropertyTaxAnnual') };
  saveData();
});
document.getElementById('addFixedCostBtn').addEventListener('click',()=>{ data.fixedCosts.push({id:safeUuid(), name:'新しい固定費', mode:'monthly', monthly:0, annual:0}); saveData(); });

const addCategoryButton = document.getElementById('addCategoryBtn');
if(addCategoryButton){ addCategoryButton.addEventListener('click',()=>{ const name = prompt('追加するカテゴリ名を入力してください'); if(!name) return; const trimmed=name.trim(); if(!trimmed) return; if(data.categories.includes(trimmed)) return alert('同じカテゴリ名があります。'); data.categories.push(trimmed); saveData(); }); }
const taxTypeEl = document.getElementById('taxType');
if(taxTypeEl) taxTypeEl.addEventListener('change', renderTaxAccountOptions);
const taxAccountEl = document.getElementById('taxAccount');
if(taxAccountEl) taxAccountEl.addEventListener('change', renderTaxAccountHint);
const deprPropertySelect = document.getElementById('deprPropertySelect');
if(deprPropertySelect) deprPropertySelect.addEventListener('change', e=>{ data.taxSettings ||= buildDefaultTaxSettings(); data.taxSettings.selectedProperty = e.target.value; saveData(); });
const saveDepBtn = document.getElementById('saveDepreciationAssetBtn');
if(saveDepBtn) saveDepBtn.addEventListener('click', ()=>{
  data.taxSettings ||= buildDefaultTaxSettings();
  data.taxSettings.propertyAssets ||= buildDefaultPropertyAssets();
  const key = selectedTaxAssetKey();
  const old = data.taxSettings.propertyAssets[key] || {};
  const structureRatio = numberValue('deprStructureRatio') || 70;
  data.taxSettings.propertyAssets[key] = {
    ...old,
    purchasePrice:numberValue('deprPurchasePrice'), landRatio:Number(document.getElementById('deprLandRatio').value || 0),
    structureRatio, equipmentRatio:numberValue('deprEquipmentRatio') || Math.max(0, 100 - structureRatio),
    newDate:document.getElementById('deprNewDate').value, acquisitionDate:document.getElementById('deprAcquisitionDate').value,
    useStartDate:document.getElementById('deprUseStartDate').value || document.getElementById('deprAcquisitionDate').value,
    structureLegalLife:numberValue('deprStructureLifeLegal') || 47, equipmentLegalLife:numberValue('deprEquipmentLifeLegal') || 15,
    structureUsefulLifeOverride:document.getElementById('deprStructureLifeOverride').value || '',
    equipmentUsefulLifeOverride:document.getElementById('deprEquipmentLifeOverride').value || ''
  };
  saveData(); alert('減価償却の物件設定を保存しました。');
});
const addDepBtn = document.getElementById('addDepreciationEntryBtn');
if(addDepBtn) addDepBtn.addEventListener('click', ()=>{
  data.taxEntries ||= [];
  const key = selectedTaxAssetKey();
  const asset = selectedTaxAsset();
  const year = Number(data.settings.year || yearFromYm(data.currentYm));
  const calc = calculateDepreciationForAsset(asset, year);
  if(!calc.totalYear) return alert('減価償却費が0円です。取得日・貸付開始日・対象年を確認してください。');
  const memo = `${asset.displayName || key} ${year}年分 減価償却（躯体${formatYen(calc.structureYear)}・設備${formatYen(calc.equipmentYear)}・${calc.months}か月）`;
  data.taxEntries.push({ id:safeUuid(), date:`${year}-12-31`, type:'propertyExpense', property:key, account:'減価償却費', amount:calc.totalYear, memo });
  saveData(); alert('申告用記録に減価償却費を追加しました。');
});
const clearTaxBtn = document.getElementById('clearTaxEntryBtn');
if(clearTaxBtn) clearTaxBtn.addEventListener('click', clearTaxEntryForm);
const taxForm = document.getElementById('taxEntryForm');
if(taxForm) taxForm.addEventListener('submit', e=>{
  e.preventDefault();
  data.taxEntries ||= [];
  const id = document.getElementById('editingTaxEntryId').value || safeUuid();
  const type = document.getElementById('taxType').value;
  const record = { id, date:document.getElementById('taxDate').value, type, property:type==='furusato'?'なし':document.getElementById('taxProperty').value, account:document.getElementById('taxAccount').value, amount:numberValue('taxAmount'), memo:textValue('taxMemo') };
  if(!record.date || !record.type || !record.amount) return alert('日付・種類・金額を入力してください。');
  const idx = data.taxEntries.findIndex(x=>x.id===id); if(idx>=0) data.taxEntries[idx]=record; else data.taxEntries.push(record);
  clearTaxEntryForm(); saveData(); navigate('tax');
});
const exportTaxBtn = document.getElementById('exportTaxCsvBtn');
if(exportTaxBtn) exportTaxBtn.addEventListener('click', exportTaxCsv);
const furusatoShortcutBtn = document.getElementById('addFurusatoShortcutBtn');
if(furusatoShortcutBtn) furusatoShortcutBtn.addEventListener('click',()=>{ navigate('tax'); document.getElementById('taxType').value='furusato'; renderTaxAccountOptions(); document.getElementById('taxProperty').value='なし'; document.getElementById('taxMemo').focus(); });

document.getElementById('copyYearBtn').addEventListener('click',()=>{ data.settings.year += 1; saveData(); alert('対象年を1年進めました。必要な項目だけ更新してください。'); });
document.getElementById('saveOpeningBalanceBtn').addEventListener('click',()=>{ data.openingBalances[data.currentYm] = numberValue('openingBalance'); saveData(); });
document.getElementById('clearCashFlowBtn').addEventListener('click', clearCashFlowForm);
document.getElementById('cashFlowForm').addEventListener('submit', e=>{
  e.preventDefault();
  const id = document.getElementById('editingCashFlowId').value || safeUuid();
  const record = { id, date:document.getElementById('cashFlowDate').value, title:textValue('cashFlowTitle'), type:document.getElementById('cashFlowType').value, amount:numberValue('cashFlowAmount'), tag:document.getElementById('cashFlowTag').value };
  if(!record.date || !record.title || !record.amount) return alert('日付・内容・金額を入力してください。');
  const idx=data.cashFlows.findIndex(x=>x.id===id); if(idx>=0) data.cashFlows[idx]=record; else data.cashFlows.push(record);
  clearCashFlowForm(); saveData();
});

// Backup / import
function exportBackup(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`kakei-backup-${data.currentYm}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}
function mergeSettingsOnly(current, imported){
  const keep = {
    expenses: current.expenses || [],
    cashFlows: current.cashFlows || [],
    taxEntries: current.taxEntries || [],
    monthlyIncomes: current.monthlyIncomes || {},
    openingBalances: current.openingBalances || {},
    currentYm: current.currentYm || imported.currentYm || currentYm()
  };
  const mergedCategories = Array.from(new Set([...(current.categories || []), ...(imported.categories || [])].filter(Boolean)));
  return {
    ...current,
    settings: imported.settings || current.settings,
    fixedCosts: imported.fixedCosts || current.fixedCosts,
    investment: imported.investment || current.investment,
    taxSettings: imported.taxSettings || current.taxSettings,
    categories: mergedCategories.length ? mergedCategories : defaultCategories,
    ...keep,
    appVersion: APP_VERSION
  };
}
document.getElementById('exportBtn').addEventListener('click', exportBackup);
document.getElementById('importBtn').addEventListener('click',()=>document.getElementById('importFileInput').click());
document.getElementById('importSettingsBtn')?.addEventListener('click',()=>document.getElementById('importSettingsFileInput').click());
document.getElementById('importFileInput').addEventListener('change', async e=>{
  const file=e.target.files?.[0]; if(!file) return;
  try{
    const text=await file.text(); const imported=migrateData(text);
    if(!confirm('現在のデータをJSONバックアップで丸ごと置き換えます。旧版のバックアップを復元する場合はこちらでOKです。実行前に現在のデータを書き出しておくことをおすすめします。よろしいですか？')) return;
    data=imported; saveData(); alert('復元しました。旧版JSONの場合も新形式へ変換済みです。');
  }catch(err){ alert('取り込みに失敗しました。JSONファイルを確認してください。'); }
  finally { e.target.value=''; }
});
document.getElementById('importSettingsFileInput')?.addEventListener('change', async e=>{
  const file=e.target.files?.[0]; if(!file) return;
  try{
    const text=await file.text(); const imported=migrateData(text);
    if(!confirm('支出・資金繰り・申告メモなどの実績データは残したまま、固定費・投資用不動産・減価償却などの設定だけ取り込みます。よろしいですか？')) return;
    data = mergeSettingsOnly(data, imported);
    data.fixedCosts.forEach(normalizeFixedCost);
    saveData(); alert('設定だけ取り込みました。実績データは保持されています。');
  }catch(err){ alert('設定取り込みに失敗しました。JSONファイルを確認してください。'); }
  finally { e.target.value=''; }
});

// Image/OCR
const cameraInput = document.getElementById('receiptCameraInput');
const imageInput = document.getElementById('receiptImageInput');
document.getElementById('openCameraBtn').addEventListener('click',()=>cameraInput.click());
document.getElementById('openImageBtn').addEventListener('click',()=>imageInput.click());
cameraInput.addEventListener('change', handleReceiptFile);
imageInput.addEventListener('change', handleReceiptFile);
async function handleReceiptFile(e){
  const file = e.target.files?.[0]; if(!file) return;
  const url = URL.createObjectURL(file);
  const preview = document.getElementById('receiptPreview'); preview.src=url; preview.classList.remove('hidden');
  document.getElementById('ocrDate').value = currentDate(); document.getElementById('ocrStatus').textContent='読み取り中です。少し時間がかかります。'; document.getElementById('ocrRawText').textContent='';
  try{
    if(!window.Tesseract) throw new Error('OCRライブラリを読み込めませんでした。');
    const result = await Tesseract.recognize(file, 'jpn+eng', { logger:m=>{ if(m.status){ const pct=m.progress?` ${Math.round(m.progress*100)}%`:''; document.getElementById('ocrStatus').textContent=`読み取り中: ${m.status}${pct}`; } } });
    const text = result?.data?.text || ''; document.getElementById('ocrRawText').textContent = text;
    const parsed = parseReceiptText(text, file.name);
    document.getElementById('ocrMerchant').value = parsed.merchant || '';
    document.getElementById('ocrDate').value = parsed.date || currentDate();
    document.getElementById('ocrAmount').value = parsed.amount || '';
    document.getElementById('ocrCategory').value = guessCategory(parsed.merchant || text);
    document.getElementById('ocrStatus').textContent = '読み取り候補を作成しました。金額・日付・カテゴリを確認してください。';
  }catch(err){
    const fallbackMerchant = file.name.replace(/\.[^.]+$/, '').slice(0,40);
    document.getElementById('ocrMerchant').value = fallbackMerchant;
    document.getElementById('ocrDate').value = currentDate();
    document.getElementById('ocrStatus').textContent = 'OCRに失敗しました。画像を見ながら金額を入力してください。';
  } finally { e.target.value=''; }
}
function parseReceiptText(text, filename){ const lines=String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean); return { merchant:guessMerchant(lines, filename), date:guessDate(text), amount:guessAmount(lines) }; }
function guessMerchant(lines, filename){ const ignore=/(領収|レシート|請求|納品|合計|小計|税込|消費税|電話|TEL|登録番号|No\.|\d{2,})/i; const found=lines.find(l=>l.length>=2 && l.length<=30 && !ignore.test(l)); return found || filename.replace(/\.[^.]+$/,'').slice(0,40); }
function guessDate(text){ const s=String(text||''); let m=s.match(/(20\d{2})[\/\-.年]\s*(\d{1,2})[\/\-.月]\s*(\d{1,2})/); if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`; m=s.match(/(\d{2})[\/\-.年]\s*(\d{1,2})[\/\-.月]\s*(\d{1,2})/); if(m) return `20${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`; return currentDate(); }
function guessAmount(lines){
  const preferred=lines.filter(l=>/(合計|総計|お支払|お買上|税込|計\s*¥?|TOTAL|Total|利用額|請求額|支払額)/i.test(l));
  const targetLines=preferred.length?preferred:lines;
  const numbers=[];
  targetLines.forEach(l=>{ const matches=l.match(/[¥￥]?\s*\d{1,3}(?:[,，]\d{3})+|[¥￥]?\s*\d{2,7}/g)||[]; matches.forEach(raw=>{ const n=Number(raw.replace(/[¥￥,，\s]/g,'')); if(n>=1 && n<=9999999) numbers.push(n); }); });
  if(!numbers.length) return ''; return Math.max(...numbers);
}
function guessCategory(text){ const t=String(text||''); if(/薬|ドラッグ|病院|クリニック|歯科|医療|処方/.test(t)) return '医療費'; if(/ガソリン|ENEOS|出光|コスモ|シェル|タイヤ|車/.test(t)) return '車関連'; if(/学校|高校|給食|教材|塾|習い/.test(t)) return '教育費'; if(/電気|ガス|水道/.test(t)) return '光熱費'; if(/保険|共済/.test(t)) return '保険'; if(/携帯|スマホ|通信|ネット/.test(t)) return '通信費'; if(/スーパー|食品|青果|精肉|鮮魚|パン|牛乳|食料|惣菜|野菜/.test(t)) return '食費'; if(/ホームセンター|日用品|洗剤|紙|ドラッグ/.test(t)) return '日用品'; if(/外食|レストラン|マクド|すき家|丸亀|スタバ/.test(t)) return '外食・レジャー'; return 'その他'; }
document.getElementById('ocrToEntryBtn').addEventListener('click',()=>{ renderExpenseFormOptions(); document.getElementById('expenseAmount').value=document.getElementById('ocrAmount').value; document.getElementById('expenseDate').value=document.getElementById('ocrDate').value||currentDate(); document.getElementById('expenseCategory').value=document.getElementById('ocrCategory').value; document.getElementById('expenseMethod').value=document.getElementById('ocrMethod').value; document.getElementById('expenseMemo').value=document.getElementById('ocrMerchant').value; navigate('entry'); });
document.getElementById('saveOcrExpenseBtn').addEventListener('click',()=>{ const amount=Number(document.getElementById('ocrAmount').value); const date=document.getElementById('ocrDate').value; const category=document.getElementById('ocrCategory').value; const method=document.getElementById('ocrMethod').value; const memo=document.getElementById('ocrMerchant').value; if(!amount || !date) return alert('金額と日付を確認してください。'); data.expenses.push({id:safeUuid(), amount, date, category, method, memo}); saveData(); navigate('home'); });

clearExpenseForm(); clearCashFlowForm(); clearTaxEntryForm(); renderAll();
