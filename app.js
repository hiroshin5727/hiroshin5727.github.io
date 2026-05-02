const STORAGE_KEY = 'kakei-app-data-v5';
const LEGACY_KEYS = ['kakei-app-data-v3-safe','kakei-app-data-v2','kakei-app-data'];
const APP_VERSION = '5.0.0';
const defaultCategories = ['食費','日用品','教育費','医療費','車関連','光熱費','通信費','保険','特別費','外食・レジャー','その他'];

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
    for(const key of LEGACY_KEYS){ const raw = localStorage.getItem(key); if(raw) return migrateData(raw); }
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
  renderHeaderMonth(); renderHome(); renderExpenseFormOptions(); renderRecentExpenses(); renderIncomeEditor(); renderMonthly(); renderGraphs(); renderFixedCosts(); renderInvestment(); renderCashflow(); renderReceiptOptions();
}
function renderHeaderMonth(){
  const label = `${data.currentYm.replace('-', '年')}月`;
  document.getElementById('currentMonthLabel').textContent = label;
  document.getElementById('monthlyHeaderLabel').textContent = `${data.currentYm} の集計`;
  document.getElementById('graphsHeaderLabel').textContent = `${data.settings.year}年 / ${data.currentYm}`;
  document.getElementById('cashflowHeaderLabel').textContent = `${data.currentYm} の予定入出金`;
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
document.getElementById('exportBtn').addEventListener('click',()=>{ const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`kakei-backup-${data.currentYm}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),3000); });
document.getElementById('importBtn').addEventListener('click',()=>document.getElementById('importFileInput').click());
document.getElementById('importFileInput').addEventListener('change', async e=>{ const file=e.target.files?.[0]; if(!file) return; try{ const text=await file.text(); const imported=migrateData(text); if(!confirm('現在のデータを取り込みデータで置き換えます。よろしいですか？')) return; data=imported; saveData(); alert('取り込みました。'); }catch(err){ alert('取り込みに失敗しました。JSONファイルを確認してください。'); } finally { e.target.value=''; } });

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

clearExpenseForm(); clearCashFlowForm(); renderAll();
