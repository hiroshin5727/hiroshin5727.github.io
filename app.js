const STORAGE_KEY = 'kakeiAppDataV2';
const LEGACY_STORAGE_KEY = 'kakeiAppDataV1';
const APP_VERSION = '2.0.0';
const defaultCategories = ['食費','日用品','教育費','医療費','車関連','光熱費','通信費','保険','特別費','その他'];

function safeUuid(){
  return (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function ym(dateStr){ return String(dateStr || '').slice(0,7); }
function formatYen(n){
  const num = Number(n || 0);
  const sign = num < 0 ? '-' : '';
  return `${sign}¥${Math.abs(Math.round(num)).toLocaleString('ja-JP')}`;
}
function currentDate(){ return new Date().toISOString().slice(0,10); }
function currentYm(){ return currentDate().slice(0,7); }
function addMonths(ymStr, delta){
  const [y,m] = ymStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function yearFromYm(ymStr){ return Number(String(ymStr).slice(0,4)); }
function numberValue(id){ return Number(document.getElementById(id).value || 0); }
function textValue(id){ return document.getElementById(id).value.trim(); }

function buildPublicDefaultData(){
  const nowYm = currentYm();
  const year = yearFromYm(nowYm);
  return {
    appVersion: APP_VERSION,
    settings: { year, salaryMonthly: 0, allowanceMonthly: 0, otherIncomeMonthly: 0, targetSavings: 50000 },
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

function buildDefaultInvestment(){
  return {
    enabled: true,
    rentKawasaki: 0,
    rentYokohama: 0,
    loanKawasaki: 0,
    loanYokohama: 0,
    mgmtKawasakiBase: 0,
    mgmtKawasakiIncrease: 0,
    increaseStartYm: currentYm(),
    mgmtYokohama: 0,
    propertyTaxAnnual: 0,
  };
}

function migrateData(raw){
  const parsed = JSON.parse(raw);
  if(!parsed.categories) parsed.categories = defaultCategories;
  if(!parsed.settings) parsed.settings = buildPublicDefaultData().settings;
  if(parsed.settings.otherIncomeMonthly === undefined) parsed.settings.otherIncomeMonthly = 0;
  if(!parsed.currentYm) parsed.currentYm = currentYm();
  if(!parsed.expenses) parsed.expenses = [];
  if(!parsed.cashFlows) parsed.cashFlows = [];
  if(!parsed.openingBalances) parsed.openingBalances = {};
  if(!parsed.fixedCosts) parsed.fixedCosts = [];
  if(!parsed.investment) parsed.investment = buildDefaultInvestment();
  // V1に「投資用不動産差額」が固定費として入っていた場合は二重計上防止で削除
  parsed.fixedCosts = parsed.fixedCosts.filter(f => !String(f.name || '').includes('投資用不動産差額'));
  parsed.fixedCosts.forEach(f => normalizeFixedCost(f));
  parsed.appVersion = APP_VERSION;
  return parsed;
}

function normalizeFixedCost(f){
  f.id ||= safeUuid();
  f.name ||= '固定費';
  f.mode ||= 'monthly';
  f.monthly = Number(f.monthly || 0);
  f.annual = Number(f.annual || 0);
  if(f.mode === 'monthly') f.annual = f.monthly * 12;
  if(f.mode === 'annual') f.monthly = Math.round(f.annual / 12);
}

function loadData(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if(!raw) return buildPublicDefaultData();
    return migrateData(raw);
  } catch {
    return buildPublicDefaultData();
  }
}
let data = loadData();
function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}

const screens = [...document.querySelectorAll('.screen')];
const navButtons = [...document.querySelectorAll('[data-nav]')];
navButtons.forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.nav)));
function navigate(name){
  screens.forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getMonthlyIncome(){
  return Number(data.settings.salaryMonthly||0) + Number(data.settings.allowanceMonthly||0) + Number(data.settings.otherIncomeMonthly||0);
}
function baseFixedMonthlyTotal(){ return data.fixedCosts.reduce((sum, f) => sum + Number(f.monthly||0), 0); }
function baseFixedAnnualTotal(){ return data.fixedCosts.reduce((sum, f) => sum + Number(f.annual||0), 0); }
function expensesForYm(targetYm){ return data.expenses.filter(e => ym(e.date) === targetYm); }
function cashFlowsForYm(targetYm){ return data.cashFlows.filter(c => ym(c.date) === targetYm); }

function investmentMonthlyExpense(targetYm){
  const inv = data.investment || buildDefaultInvestment();
  if(inv.enabled === false) return 0;
  const rent = Number(inv.rentKawasaki||0) + Number(inv.rentYokohama||0);
  const loans = Number(inv.loanKawasaki||0) + Number(inv.loanYokohama||0);
  const kawasakiMgmt = Number(inv.mgmtKawasakiBase||0) + (targetYm >= String(inv.increaseStartYm || '9999-12') ? Number(inv.mgmtKawasakiIncrease||0) : 0);
  const management = kawasakiMgmt + Number(inv.mgmtYokohama||0);
  const taxMonthly = Math.round(Number(inv.propertyTaxAnnual||0) / 12);
  const expense = loans + management + taxMonthly - rent;
  return Math.round(expense);
}
function fixedMonthlyTotal(targetYm){ return baseFixedMonthlyTotal() + investmentMonthlyExpense(targetYm); }
function fixedAnnualEstimate(){
  let total = baseFixedAnnualTotal();
  for(let m=1; m<=12; m++) total += investmentMonthlyExpense(`${data.settings.year}-${String(m).padStart(2,'0')}`);
  return total;
}
function investmentParts(targetYm){
  const inv = data.investment || buildDefaultInvestment();
  const rent = Number(inv.rentKawasaki||0) + Number(inv.rentYokohama||0);
  const loans = Number(inv.loanKawasaki||0) + Number(inv.loanYokohama||0);
  const kawasakiMgmt = Number(inv.mgmtKawasakiBase||0) + (targetYm >= String(inv.increaseStartYm || '9999-12') ? Number(inv.mgmtKawasakiIncrease||0) : 0);
  const management = kawasakiMgmt + Number(inv.mgmtYokohama||0);
  const taxMonthly = Math.round(Number(inv.propertyTaxAnnual||0) / 12);
  const diff = loans + management + taxMonthly - rent;
  return { rent, loans, management, taxMonthly, diff };
}

function getMonthlySummary(targetYm){
  const expenses = expensesForYm(targetYm);
  const variableExpense = expenses.reduce((sum, e) => sum + Number(e.amount||0), 0);
  const fixed = fixedMonthlyTotal(targetYm);
  const income = getMonthlyIncome();
  const totalExpense = fixed + variableExpense;
  const remainingAfterTarget = income - totalExpense - Number(data.settings.targetSavings||0);
  const monthEnd = income - totalExpense;
  return { income, fixed, variableExpense, totalExpense, remainingAfterTarget, monthEnd, expenses };
}

function renderAll(){
  renderHeaderMonth();
  renderHome();
  renderExpenseFormOptions();
  renderRecentExpenses();
  renderMonthly();
  renderFixedCosts();
  renderInvestment();
  renderCashflow();
  renderReceiptOptions();
}

function renderHeaderMonth(){
  const label = `${data.currentYm.replace('-', '年')}月`;
  document.getElementById('currentMonthLabel').textContent = label;
  document.getElementById('monthlyHeaderLabel').textContent = `${data.currentYm} の集計`;
  document.getElementById('cashflowHeaderLabel').textContent = `${data.currentYm} の予定入出金`;
}

function renderHome(){
  const s = getMonthlySummary(data.currentYm);
  const cf = cashFlowsForYm(data.currentYm);
  const cardOut = cf.filter(x => x.type==='expense' && x.tag==='カード引落').reduce((a,b)=>a+Number(b.amount),0);
  const postpayOut = cf.filter(x => x.type==='expense' && x.tag==='ファミペイ後払い').reduce((a,b)=>a+Number(b.amount),0);
  document.getElementById('remainingBudget').textContent = formatYen(s.remainingAfterTarget);
  document.getElementById('remainingBudget').className = `hero-value ${s.remainingAfterTarget < 0 ? 'negative' : ''}`;
  document.getElementById('monthEndForecast').textContent = formatYen(s.monthEnd);
  document.getElementById('monthEndForecast').className = `value ${s.monthEnd < 0 ? 'negative' : 'positive'}`;
  document.getElementById('savingsProgress').textContent = `${formatYen(Math.max(0, s.monthEnd))} / ${formatYen(data.settings.targetSavings)}`;
  document.getElementById('incomeSummary').textContent = formatYen(s.income);
  document.getElementById('expenseSummary').textContent = formatYen(s.totalExpense);
  document.getElementById('cardOutflowSummary').textContent = formatYen(cardOut);
  document.getElementById('postpayOutflowSummary').textContent = formatYen(postpayOut);
  const alerts = [];
  if(s.income === 0) alerts.push('まず「固定費」画面で給与手取り・児童手当を設定してください。');
  if(s.remainingAfterTarget < 0) alerts.push('残し目標に届かない見込みです。変動費を確認してください。');
  if(cardOut + postpayOut > 100000) alerts.push('引落予定が大きめです。資金繰り画面を確認してください。');
  if(data.openingBalances[data.currentYm] === undefined) alerts.push('月初残高が未設定です。');
  if(alerts.length===0) alerts.push('大きな注意なし。今月もこの調子です。');
  document.getElementById('alertsList').innerHTML = alerts.map(a => `<li>${escapeHtml(a)}</li>`).join('');
}

function renderExpenseFormOptions(){
  const select = document.getElementById('expenseCategory');
  const current = select.value;
  select.innerHTML = '<option value="">選択してください</option>' + data.categories.map(c => `<option>${escapeHtml(c)}</option>`).join('');
  if(data.categories.includes(current)) select.value = current;
  if(!document.getElementById('expenseDate').value) document.getElementById('expenseDate').value = currentDate();
}

function renderRecentExpenses(){
  const el = document.getElementById('recentExpenses');
  const items = expensesForYm(data.currentYm).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12);
  el.innerHTML = items.length ? items.map(e => `
    <div class="expense-row">
      <div>
        <strong>${escapeHtml(e.category)}</strong><br><small>${escapeHtml(e.date)}・${escapeHtml(e.memo || 'メモなし')}・${escapeHtml(e.method)}</small>
      </div>
      <div>
        <strong>${formatYen(e.amount)}</strong>
        <div class="row-actions">
          <button class="ghost-btn small" onclick="editExpense('${e.id}')">編集</button>
          <button class="ghost-btn small" onclick="deleteExpense('${e.id}')">削除</button>
        </div>
      </div>
    </div>`).join('') : '<div class="muted">まだ支出がありません。</div>';
}
window.deleteExpense = function(id){
  if(!confirm('この支出を削除しますか？')) return;
  data.expenses = data.expenses.filter(e => e.id !== id);
  saveData();
};
window.editExpense = function(id){
  const e = data.expenses.find(x => x.id === id);
  if(!e) return;
  document.getElementById('editingExpenseId').value = e.id;
  document.getElementById('expenseAmount').value = e.amount;
  document.getElementById('expenseDate').value = e.date;
  document.getElementById('expenseCategory').value = e.category;
  document.getElementById('expenseMethod').value = e.method;
  document.getElementById('expenseMemo').value = e.memo || '';
  document.getElementById('saveExpenseBtn').textContent = '更新する';
  navigate('entry');
};

function renderMonthly(){
  const s = getMonthlySummary(data.currentYm);
  const table = document.getElementById('monthlySummaryTable');
  table.innerHTML = `
    <div class="row"><span>収入合計</span><strong>${formatYen(s.income)}</strong></div>
    <div class="row"><span>固定費合計</span><strong>${formatYen(s.fixed)}</strong></div>
    <div class="row"><span>変動費合計</span><strong>${formatYen(s.variableExpense)}</strong></div>
    <div class="row"><span>支出合計</span><strong>${formatYen(s.totalExpense)}</strong></div>
    <div class="row"><span>月末残額</span><strong class="${s.monthEnd<0?'negative':'positive'}">${formatYen(s.monthEnd)}</strong></div>
    <div class="row"><span>先取り後残額</span><strong class="${s.remainingAfterTarget<0?'negative':'positive'}">${formatYen(s.remainingAfterTarget)}</strong></div>`;

  const inv = investmentMonthlyExpense(data.currentYm);
  const fixedBreakdown = [
    ...data.fixedCosts.map(f => [f.name, Number(f.monthly || 0)]),
    ['投資用不動産差額', inv]
  ].filter(([,v]) => v !== 0).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  document.getElementById('fixedBreakdown').innerHTML = fixedBreakdown.length ? fixedBreakdown.map(([k,v]) => `
    <div class="breakdown-row"><span>${escapeHtml(k)}</span><strong class="${v<0?'positive':''}">${formatYen(v)}</strong></div>`).join('') : '<div class="muted">固定費が未設定です。</div>';

  const byCat = {};
  s.expenses.forEach(e => byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount));
  document.getElementById('categoryBreakdown').innerHTML = Object.keys(byCat).length ? Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `
    <div class="breakdown-row"><span>${escapeHtml(k)}</span><strong>${formatYen(v)}</strong></div>`).join('') : '<div class="muted">まだカテゴリ別支出がありません。</div>';
}

function renderFixedCosts(){
  document.getElementById('settingsYear').value = data.settings.year;
  document.getElementById('salaryMonthly').value = data.settings.salaryMonthly;
  document.getElementById('allowanceMonthly').value = data.settings.allowanceMonthly;
  document.getElementById('otherIncomeMonthly').value = data.settings.otherIncomeMonthly || 0;
  document.getElementById('targetSavings').value = data.settings.targetSavings;
  const wrap = document.getElementById('fixedCostsList');
  wrap.innerHTML = '';
  const tpl = document.getElementById('fixedCostRowTemplate');
  data.fixedCosts.forEach(item => {
    normalizeFixedCost(item);
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.fixed-name').value = item.name;
    node.querySelector('.fixed-type').textContent = item.mode === 'monthly' ? '毎月' : '年払い';
    node.querySelector('.fixed-monthly').value = item.monthly;
    node.querySelector('.fixed-annual').value = item.annual;
    node.querySelector('.fixed-mode').value = item.mode;
    node.querySelector('.fixed-name').addEventListener('change', e => { item.name = e.target.value; saveData(); });
    node.querySelector('.fixed-monthly').addEventListener('change', e => { item.monthly = Number(e.target.value||0); if(item.mode==='monthly') item.annual = item.monthly*12; saveData(); });
    node.querySelector('.fixed-annual').addEventListener('change', e => { item.annual = Number(e.target.value||0); if(item.mode==='annual') item.monthly = Math.round(item.annual/12); saveData(); });
    node.querySelector('.fixed-mode').addEventListener('change', e => {
      item.mode = e.target.value;
      if(item.mode==='monthly') item.annual = Number(item.monthly||0)*12;
      else item.monthly = Math.round(Number(item.annual||0)/12);
      saveData();
    });
    node.querySelector('.delete-fixed').addEventListener('click', () => {
      if(!confirm('この固定費を削除しますか？')) return;
      data.fixedCosts = data.fixedCosts.filter(x => x.id !== item.id);
      saveData();
    });
    wrap.appendChild(node);
  });
  const total = document.createElement('div');
  total.className = 'expense-row';
  total.innerHTML = `<strong>固定費合計</strong><strong>${formatYen(fixedMonthlyTotal(data.currentYm))} / 月　${formatYen(fixedAnnualEstimate())} / 年</strong>`;
  wrap.appendChild(total);
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
  const parts = investmentParts(data.currentYm);
  const cls = parts.diff > 0 ? 'negative' : 'positive';
  document.getElementById('investmentSummary').innerHTML = `
    <div class="investment-row"><span>家賃合計</span><strong>${formatYen(parts.rent)}</strong></div>
    <div class="investment-row"><span>ローン返済</span><strong>${formatYen(parts.loans)}</strong></div>
    <div class="investment-row"><span>管理費・修繕積立</span><strong>${formatYen(parts.management)}</strong></div>
    <div class="investment-row"><span>固定資産税 月割</span><strong>${formatYen(parts.taxMonthly)}</strong></div>
    <div class="investment-row"><span>家計反映差額</span><strong class="${cls}">${formatYen(parts.diff)}</strong></div>`;
}

function renderCashflow(){
  document.getElementById('openingBalance').value = data.openingBalances[data.currentYm] ?? '';
  const items = cashFlowsForYm(data.currentYm).sort((a,b)=>a.date.localeCompare(b.date));
  const opening = Number(data.openingBalances[data.currentYm] || 0);
  const totalIn = items.filter(i=>i.type==='income').reduce((s,i)=>s+Number(i.amount),0);
  const totalOut = items.filter(i=>i.type==='expense').reduce((s,i)=>s+Number(i.amount),0);
  const forecast = opening + totalIn - totalOut;
  document.getElementById('cashflowForecast').textContent = formatYen(forecast);
  document.getElementById('cashflowForecast').className = `value ${forecast < 0 ? 'negative':'positive'}`;
  document.getElementById('cashflowOutflow').textContent = formatYen(totalOut);
  const list = document.getElementById('cashFlowList');
  list.innerHTML = items.length ? items.map(i => `
    <div class="cash-row">
      <div>
        <strong>${escapeHtml(i.title)}</strong><br><small>${escapeHtml(i.date)}・${escapeHtml(i.tag)}</small>
      </div>
      <div>
        <strong class="${i.type==='expense'?'negative':'positive'}">${i.type==='expense' ? '-' : '+'}${formatYen(i.amount).replace(/^[-+]?/, '')}</strong>
        <div class="row-actions">
          <button class="ghost-btn small" onclick="editCashFlow('${i.id}')">編集</button>
          <button class="ghost-btn small" onclick="deleteCashFlow('${i.id}')">削除</button>
        </div>
      </div>
    </div>`).join('') : '<div class="muted">まだ予定入出金がありません。</div>';
}
window.deleteCashFlow = function(id){
  if(!confirm('この予定入出金を削除しますか？')) return;
  data.cashFlows = data.cashFlows.filter(c => c.id !== id);
  saveData();
};
window.editCashFlow = function(id){
  const c = data.cashFlows.find(x => x.id === id);
  if(!c) return;
  document.getElementById('editingCashFlowId').value = c.id;
  document.getElementById('cashFlowDate').value = c.date;
  document.getElementById('cashFlowTitle').value = c.title;
  document.getElementById('cashFlowType').value = c.type;
  document.getElementById('cashFlowAmount').value = c.amount;
  document.getElementById('cashFlowTag').value = c.tag;
  navigate('cashflow');
};

function renderReceiptOptions(){
  const cat = document.getElementById('ocrCategory');
  const current = cat.value;
  cat.innerHTML = data.categories.map(c => `<option>${escapeHtml(c)}</option>`).join('');
  if(data.categories.includes(current)) cat.value = current;
}

function clearExpenseForm(){
  document.getElementById('expenseForm').reset();
  document.getElementById('editingExpenseId').value = '';
  document.getElementById('expenseDate').value = currentDate();
  document.getElementById('saveExpenseBtn').textContent = '保存する';
}
function clearCashFlowForm(){
  document.getElementById('cashFlowForm').reset();
  document.getElementById('editingCashFlowId').value = '';
  document.getElementById('cashFlowDate').value = currentDate();
}

function escapeHtml(str){
  return String(str ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

// Navigation and controls
document.getElementById('prevMonthBtn').addEventListener('click', ()=>{ data.currentYm = addMonths(data.currentYm, -1); saveData(); });
document.getElementById('nextMonthBtn').addEventListener('click', ()=>{ data.currentYm = addMonths(data.currentYm, +1); saveData(); });
document.getElementById('clearExpenseFormBtn').addEventListener('click', clearExpenseForm);

document.getElementById('expenseForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('editingExpenseId').value || safeUuid();
  const record = {
    id,
    amount: Number(document.getElementById('expenseAmount').value),
    date: document.getElementById('expenseDate').value,
    category: document.getElementById('expenseCategory').value,
    method: document.getElementById('expenseMethod').value,
    memo: document.getElementById('expenseMemo').value.trim(),
  };
  if(!record.amount || !record.date || !record.category) return alert('金額・日付・カテゴリを入力してください。');
  const idx = data.expenses.findIndex(x => x.id === id);
  if(idx >= 0) data.expenses[idx] = record; else data.expenses.push(record);
  clearExpenseForm();
  saveData();
  navigate('home');
});

document.getElementById('saveSettingsBtn').addEventListener('click', ()=>{
  data.settings.year = numberValue('settingsYear');
  data.settings.salaryMonthly = numberValue('salaryMonthly');
  data.settings.allowanceMonthly = numberValue('allowanceMonthly');
  data.settings.otherIncomeMonthly = numberValue('otherIncomeMonthly');
  data.settings.targetSavings = numberValue('targetSavings');
  saveData();
});
document.getElementById('saveInvestmentBtn').addEventListener('click', ()=>{
  data.investment = {
    enabled: true,
    rentKawasaki: numberValue('invRentKawasaki'),
    rentYokohama: numberValue('invRentYokohama'),
    loanKawasaki: numberValue('invLoanKawasaki'),
    loanYokohama: numberValue('invLoanYokohama'),
    mgmtKawasakiBase: numberValue('invMgmtKawasakiBase'),
    mgmtKawasakiIncrease: numberValue('invMgmtKawasakiIncrease'),
    increaseStartYm: document.getElementById('invIncreaseStartYm').value || currentYm(),
    mgmtYokohama: numberValue('invMgmtYokohama'),
    propertyTaxAnnual: numberValue('invPropertyTaxAnnual'),
  };
  saveData();
});
document.getElementById('addFixedCostBtn').addEventListener('click', ()=>{
  data.fixedCosts.push({id:safeUuid(), name:'新しい固定費', mode:'monthly', monthly:0, annual:0});
  saveData();
});
document.getElementById('copyYearBtn').addEventListener('click', ()=>{
  data.settings.year += 1;
  saveData();
  alert('対象年を1年進めました。必要な項目だけ更新してください。');
});

document.getElementById('saveOpeningBalanceBtn').addEventListener('click', ()=>{
  data.openingBalances[data.currentYm] = numberValue('openingBalance');
  saveData();
});
document.getElementById('clearCashFlowBtn').addEventListener('click', clearCashFlowForm);

document.getElementById('cashFlowForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('editingCashFlowId').value || safeUuid();
  const record = {
    id,
    date: document.getElementById('cashFlowDate').value,
    title: textValue('cashFlowTitle'),
    type: document.getElementById('cashFlowType').value,
    amount: numberValue('cashFlowAmount'),
    tag: document.getElementById('cashFlowTag').value,
  };
  if(!record.date || !record.title || !record.amount) return alert('日付・内容・金額を入力してください。');
  const idx = data.cashFlows.findIndex(x => x.id === id);
  if(idx >= 0) data.cashFlows[idx] = record; else data.cashFlows.push(record);
  clearCashFlowForm();
  saveData();
});

// Backup / import
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kakei-backup-${data.currentYm}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
});
document.getElementById('importBtn').addEventListener('click', ()=> document.getElementById('importFileInput').click());
document.getElementById('importFileInput').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if(!file) return;
  try {
    const text = await file.text();
    const imported = migrateData(text);
    if(!confirm('現在のデータを取り込みデータで置き換えます。よろしいですか？')) return;
    data = imported;
    saveData();
    alert('取り込みました。');
  } catch(err) {
    alert('取り込みに失敗しました。JSONファイルを確認してください。');
  } finally {
    e.target.value = '';
  }
});

// Receipt OCR
const receiptInput = document.getElementById('receiptImageInput');
receiptInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if(!file) return;
  const url = URL.createObjectURL(file);
  const preview = document.getElementById('receiptPreview');
  preview.src = url;
  preview.classList.remove('hidden');
  document.getElementById('ocrDate').value = currentDate();
  document.getElementById('ocrStatus').textContent = '読み取り中です。少し時間がかかります。';
  document.getElementById('ocrRawText').textContent = '';
  try {
    if(!window.Tesseract) throw new Error('OCRライブラリを読み込めませんでした。');
    const result = await Tesseract.recognize(file, 'jpn+eng', {
      logger: m => {
        if(m.status) {
          const pct = m.progress ? ` ${Math.round(m.progress * 100)}%` : '';
          document.getElementById('ocrStatus').textContent = `読み取り中: ${m.status}${pct}`;
        }
      }
    });
    const text = result?.data?.text || '';
    document.getElementById('ocrRawText').textContent = text;
    const parsed = parseReceiptText(text, file.name);
    document.getElementById('ocrMerchant').value = parsed.merchant || '';
    document.getElementById('ocrDate').value = parsed.date || currentDate();
    document.getElementById('ocrAmount').value = parsed.amount || '';
    document.getElementById('ocrCategory').value = guessCategory(parsed.merchant || text);
    document.getElementById('ocrStatus').textContent = '読み取り候補を作成しました。金額と日付を確認してください。';
  } catch(err) {
    const fallbackMerchant = file.name.replace(/\.[^.]+$/, '').slice(0,40);
    document.getElementById('ocrMerchant').value = fallbackMerchant;
    document.getElementById('ocrDate').value = currentDate();
    document.getElementById('ocrStatus').textContent = 'OCRに失敗しました。画像を見ながら金額を入力してください。';
  }
});

function parseReceiptText(text, filename){
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const merchant = guessMerchant(lines, filename);
  const date = guessDate(text);
  const amount = guessAmount(lines);
  return { merchant, date, amount };
}
function guessMerchant(lines, filename){
  const ignore = /(領収|レシート|請求|納品|合計|小計|税込|消費税|電話|TEL|登録番号|No\.|\d{2,})/i;
  const found = lines.find(l => l.length >= 2 && l.length <= 28 && !ignore.test(l));
  return found || filename.replace(/\.[^.]+$/, '').slice(0,40);
}
function guessDate(text){
  const s = String(text || '');
  let m = s.match(/(20\d{2})[\/\-.年]\s*(\d{1,2})[\/\-.月]\s*(\d{1,2})/);
  if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m = s.match(/(\d{2})[\/\-.年]\s*(\d{1,2})[\/\-.月]\s*(\d{1,2})/);
  if(m) return `20${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  return currentDate();
}
function guessAmount(lines){
  const preferred = lines.filter(l => /(合計|総計|お支払|お買上|税込|計\s*¥?|TOTAL|Total)/i.test(l));
  const targetLines = preferred.length ? preferred : lines;
  const numbers = [];
  targetLines.forEach(l => {
    const matches = l.match(/[¥￥]?\s*\d{1,3}(?:[,，]\d{3})+|[¥￥]?\s*\d{3,6}/g) || [];
    matches.forEach(raw => {
      const n = Number(raw.replace(/[¥￥,，\s]/g,''));
      if(n >= 1 && n <= 999999) numbers.push(n);
    });
  });
  if(!numbers.length) return '';
  return Math.max(...numbers);
}
function guessCategory(text){
  const t = String(text || '');
  if(/薬|ドラッグ|病院|クリニック|歯科|医療|処方/.test(t)) return '医療費';
  if(/ガソリン|ENEOS|出光|コスモ|シェル|タイヤ|車/.test(t)) return '車関連';
  if(/学校|高校|給食|教材|塾|習い/.test(t)) return '教育費';
  if(/電気|ガス|水道/.test(t)) return '光熱費';
  if(/スーパー|食品|青果|精肉|鮮魚|パン|牛乳|食料/.test(t)) return '食費';
  if(/ホームセンター|日用品|洗剤|紙|ドラッグ/.test(t)) return '日用品';
  return 'その他';
}

document.getElementById('ocrToEntryBtn').addEventListener('click', ()=>{
  renderExpenseFormOptions();
  document.getElementById('expenseAmount').value = document.getElementById('ocrAmount').value;
  document.getElementById('expenseDate').value = document.getElementById('ocrDate').value || currentDate();
  document.getElementById('expenseCategory').value = document.getElementById('ocrCategory').value;
  document.getElementById('expenseMethod').value = document.getElementById('ocrMethod').value;
  document.getElementById('expenseMemo').value = document.getElementById('ocrMerchant').value;
  navigate('entry');
});
document.getElementById('saveOcrExpenseBtn').addEventListener('click', ()=>{
  const amount = Number(document.getElementById('ocrAmount').value);
  const date = document.getElementById('ocrDate').value;
  const category = document.getElementById('ocrCategory').value;
  const method = document.getElementById('ocrMethod').value;
  const memo = document.getElementById('ocrMerchant').value;
  if(!amount || !date) return alert('金額と日付を確認してください。');
  data.expenses.push({ id: safeUuid(), amount, date, category, method, memo });
  saveData();
  navigate('home');
});

// Defaults
clearExpenseForm();
clearCashFlowForm();
renderAll();
