/* Token Radar dashboard: renders window.RADAR (written by main.ts) with no network. */
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) { document.body.innerHTML = '<p style="padding:30px">No radar data (data.js missing).</p>'; return; }
  var $ = function (id) { return document.getElementById(id); };
  var rows = D.rows.slice();
  var live = D.live || [];
  var comps = D.comps || [];
  var model = D.model || {};
  var sandbox = { scale: 1, gw: 0.5, mf: 0.6, on: false };
  var watch = {};
  D.rows.forEach(function (r) { watch[r.slug] = true; });

  function money(n) {
    if (n == null || !isFinite(n)) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) { return n == null ? '—' : (n > 0 ? '+' : '') + n.toFixed(2) + '%'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ageText(days) { if (days == null) return 'unknown'; if (days < 30) return days + 'd'; if (days < 365) return Math.round(days / 30) + 'mo'; return (days / 365).toFixed(1) + 'y'; }

  /* ---- header ---- */
  $('meta').innerHTML = [
    '<span class="chip">Watchlist <b>' + D.watchlist_size + '</b></span>',
    '<span class="chip">Board <b>' + D.board_size + '</b> rows</span>',
    '<span class="chip">Early finds <b>' + D.early_size + '</b></span>',
    '<span class="chip">Live tokens <b>' + D.live_size + '</b></span>',
    '<span class="chip">Snapshot <b>' + esc(D.as_of) + '</b></span>',
    '<span class="chip">Model <b>' + esc(D.model_version) + '</b></span>'
  ].join('');
  $('src').textContent = 'Source: ' + D.source + '. Floor: ' + money(D.floor_usd) + '.';

  /* ---- filters ---- */
  var cats = {}, chains = {};
  rows.forEach(function (r) { if (r.category) cats[r.category] = 1; r.chains.forEach(function (c) { chains[c] = 1; }); });
  Object.keys(cats).sort().forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; $('cat').appendChild(o); });
  Object.keys(chains).sort().forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; $('chain').appendChild(o); });

  function impliedOf(r) {
    if (!sandbox.on) return r.implied_value_usd;
    var base = r.tvl_usd * r.category_multiple * sandbox.scale;
    var g = r.change_7d == null ? 0 : Math.min(120, Math.max(-60, r.change_7d));
    var gm = 1 + (g / 100) * sandbox.gw;
    var age = r.age_days == null ? 365 : r.age_days;
    var mm = sandbox.mf + (Math.min(age, 1095) / 1095) * (1 - sandbox.mf);
    return Math.max(1, Math.round(base * gm * mm * r.breadth_multiplier));
  }
  function bandOf(r, imp) {
    var spread = 0.15 + 0.5 * (1 - r.confidence / 100);
    return [Math.max(1, Math.round(imp * (1 - spread))), Math.round(imp * (1 + spread))];
  }
  function filtered() {
    var q = $('q').value.trim().toLowerCase();
    var cat = $('cat').value, ch = $('chain').value, mom = $('mom').value, sort = $('sort').value;
    var out = rows.filter(function (r) {
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.indexOf(q) < 0)) return false;
      if (cat && r.category !== cat) return false;
      if (ch && r.chains.indexOf(ch) < 0) return false;
      if ($('watchonly').checked && !watch[r.slug]) return false;
      if (mom === 'up' && !(r.change_7d != null && r.change_7d > 0)) return false;
      if (mom === 'down' && !(r.change_7d != null && r.change_7d < 0)) return false;
      if (mom === 'hot' && !(r.change_7d != null && r.change_7d > 10)) return false;
      return true;
    });
    var key = sort === 'tvl' ? function (r) { return r.tvl_usd; }
      : sort === 'change' ? function (r) { return r.change_7d == null ? -1e9 : r.change_7d; }
      : sort === 'confidence' ? function (r) { return r.confidence; }
      : function (r) { return impliedOf(r); };
    out.sort(function (a, b) { return key(b) - key(a) || (a.slug < b.slug ? -1 : 1); });
    return out;
  }
  function renderBoard() {
    var list = filtered();
    $('count').textContent = list.length + ' of ' + rows.length + ' protocols' + (sandbox.on ? ' — sandbox model active' : '');
    var tb = document.querySelector('#board tbody');
    tb.innerHTML = list.map(function (r) {
      var imp = impliedOf(r), band = sandbox.on ? bandOf(r, imp) : [r.band_low_usd, r.band_high_usd];
      var ch = r.change_7d == null ? '<span class="sub">—</span>' : '<span class="' + (r.change_7d >= 0 ? 'up' : 'down') + '">' + pct(r.change_7d) + '</span>';
      return '<tr data-slug="' + esc(r.slug) + '"><td class="num">' + r.rank + '</td>' +
        '<td><b>' + esc(r.name) + '</b> <span class="sub">' + esc(r.slug) + '</span><br><span class="pill">' + esc(r.category || 'no category') + '</span>' +
        r.chains.slice(0, 3).map(function (c) { return '<span class="pill">' + esc(c) + '</span>'; }).join('') +
        (r.chains.length > 3 ? '<span class="sub">+' + (r.chains.length - 3) + '</span>' : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td><td class="num">' + ch + '</td>' +
        '<td class="num"><b>' + money(imp) + '</b></td><td class="num sub">' + money(band[0]) + ' – ' + money(band[1]) + '</td>' +
        '<td><span class="conf"><i style="width:' + r.confidence + '%"></i></span> <span class="sub">' + r.confidence + '</span></td>' +
        '<td class="num">' + r.category_multiple.toFixed(3) + '×</td></tr>';
    }).join('');
  }

  /* ---- farm plan (generated in the page from the row's own record) ---- */
  function capitalFor(r) { return r.tvl_usd >= 5e9 ? 250 : r.tvl_usd >= 1e9 ? 150 : r.tvl_usd >= 1e8 ? 100 : 50; }
  function holdFor(r) { var a = r.age_days; if (a == null) return 30; if (a < 180) return 60; if (a < 365) return 45; return 30; }
  function actionFor(r, cap, chain) {
    var c = (r.category || '').toLowerCase(), n = r.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + cap + ' of USDC to ' + n + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0) return 'Provide $' + cap + ' of liquidity to ' + n + '\u2019s main pool on ' + chain + ' and keep the position open.';
    if (c.indexOf('yield') >= 0 || c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0 || c.indexOf('risk') >= 0) return 'Deposit $' + cap + ' into a ' + n + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + cap + ' of USDC to ' + chain + ' through ' + n + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Stake $' + cap + ' of the chain\u2019s staking asset through ' + n + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('basis') >= 0) return 'Deposit $' + cap + ' of USDC as margin on ' + n + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + cap + ' and place one market position on ' + n + '.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + cap + ' of the stable asset through ' + n + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + cap + ' of the protocol\u2019s yield asset on ' + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + cap + ' of cover from ' + n + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('payment') >= 0) return 'Move $' + cap + ' through ' + n + ' on ' + chain + ' for a real payment and keep the receipt.';
    if (c.indexOf('governance') >= 0) return 'Lock $' + cap + ' of the governance asset through ' + n + ' on ' + chain + ' and vote once.';
    if (c.indexOf('chain') >= 0) return 'Bridge $' + cap + ' of USDC to ' + n + '\u2019s chain and use one of its apps.';
    return 'Deposit $' + cap + ' of USDC into ' + n + ' on ' + chain + ' and keep the position open.';
  }
  function farmSteps(r) {
    var chain = r.chains[0] || 'its main chain', cap = capitalFor(r), hold = holdFor(r);
    var steps = [
      'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline. Cost: under $3 of gas for the first transaction. Time: 5 minutes.',
      actionFor(r, cap, chain) + ' Cost: $' + cap + ' of capital and about $' + (cap >= 150 ? 8 : 4) + ' of gas. Time: 15 minutes to set up.',
      'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.' + (r.chains.length > 1 ? ' Repeat the deposit on ' + r.chains[1] + ' too, so the activity spans chains.' : '') + ' Cost: about $2 of gas a week. Time: 10 minutes a week.',
      'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot. Cost: the $' + cap + ' stays in the position. Time: ' + hold + ' days.',
      'Open the protocol\u2019s own points or rewards page from its official site and check what it counts. Cost: no fee to check, and never pay to claim. Time: 10 minutes.',
      'Before you withdraw, claim only from the link the protocol itself publishes, and never from a link in a message. Cost: no fee to check. Time: 10 minutes.',
      'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it. Cost: nothing but the log. Time: 5 minutes.'
    ];
    return steps;
  }

  /* ---- detail view ---- */
  function showDetail(slug) {
    var r = null; rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    var imp = impliedOf(r), band = sandbox.on ? bandOf(r, imp) : [r.band_low_usd, r.band_high_usd];
    var base = r.tvl_usd * r.category_multiple;
    var comp = null; comps.forEach(function (c) { if (c.category === (r.category || '(no category)')) comp = c; });
    $('detail').innerHTML =
      '<button class="close" id="detail-close">Close ✕</button>' +
      '<h2>' + esc(r.name) + '</h2><p class="sub">Rank #' + r.rank + ' · ' + esc(r.slug) + ' · ' + esc(r.category || 'no category') + ' · ' + r.chains.map(esc).join(', ') + '</p>' +
      '<div class="kv">' +
      '<div><b>' + money(imp) + '</b><span>implied value</span></div>' +
      '<div><b>' + money(band[0]) + ' – ' + money(band[1]) + '</b><span>value band (±' + Math.round((1 - band[0] / imp) * 100) + '%)</span></div>' +
      '<div><b>' + money(r.tvl_usd) + '</b><span>TVL · 7d ' + pct(r.change_7d) + '</span></div>' +
      '<div><b>' + r.confidence + ' / 100</b><span>confidence</span></div>' +
      '<div><b>' + r.category_multiple.toFixed(3) + '×</b><span>category multiple' + (comp ? ' · ' + comp.comps + ' peers' : ' · global fallback') + '</span></div>' +
      '<div><b>' + ageText(r.age_days) + '</b><span>tracked since ' + esc(r.listed_at || 'unknown') + '</span></div></div>' +
      '<h3>How the number is built</h3><div class="math">' +
      'base       = TVL × multiple = ' + money(r.tvl_usd) + ' × ' + r.category_multiple.toFixed(3) + ' = ' + money(base) + '\n' +
      'growth     = 1 + clamp(7d, −60, +120) × 0.5 = ' + r.growth_multiplier.toFixed(4) + '\n' +
      'maturity   = 0.6 + min(age, 1095) / 1095 × 0.4 = ' + r.maturity_multiplier.toFixed(4) + '\n' +
      'breadth    = 1 + 0.02 × min(chains − 1, 5) = ' + r.breadth_multiplier.toFixed(4) + '\n' +
      'implied    = base × growth × maturity × breadth = ' + money(imp) + '</div>' +
      '<p class="risk">This protocol records no token in its DefiLlama record — that is not proof it has none, and this board does not predict whether or when a token is issued. Market cap is circulating value, not fully-diluted value, so the multiple — and the implied value — reads as a conservative estimate.</p>' +
      '<h3>Farm plan</h3><ol class="steps">' + farmSteps(r).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    $('detail').hidden = false;
    $('detail-close').onclick = function () { $('detail').hidden = true; };
  }
  document.querySelector('#board tbody').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]'); if (tr) showDetail(tr.getAttribute('data-slug'));
  });

  /* ---- live tab ---- */
  document.querySelector('#livetab tbody').innerHTML = live.map(function (p) {
    return '<tr><td><b>' + esc(p.name) + '</b> <span class="sub">' + esc(p.slug) + '</span><br><span class="pill">' + esc(p.category || 'no category') + '</span></td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td><td class="num">' + money(p.mcap_usd) + '</td>' +
      '<td class="num">' + (p.mcap_usd != null && p.tvl_usd > 0 ? (p.mcap_usd / p.tvl_usd).toFixed(3) + '×' : '—') + '</td>' +
      '<td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  /* ---- model tab ---- */
  $('model-explain').innerHTML = '<h2>Model ' + esc(D.model_version) + ' — how the radar scores</h2>' +
    '<p><code>implied = TVL × category multiple × growth × maturity × breadth</code></p>' +
    '<p>The <b>category multiple</b> is the median market-cap / TVL of the tokenized protocols in the same category (' + (model.min_comps || 3) + '+ peers required, winsorized to [' + model.multiple_floor + ', ' + model.multiple_cap + ']); a thin category falls back to the global median <b>' + D.global_multiple.toFixed(3) + '×</b>.</p>' +
    '<p><b>Growth</b> = 1 + clamp(7d change, −60%, +120%) × ' + model.growth_weight + '. <b>Maturity</b> = ' + model.maturity_floor + ' + min(age, ' + model.maturity_days + 'd) / ' + model.maturity_days + ' × ' + model.maturity_range + ' (unknown age: ' + model.unknown_age_days + 'd). <b>Breadth</b> = 1 + ' + model.breadth_step + ' × min(chains − 1, ' + model.breadth_max_chains + ').</p>' +
    '<p><b>Confidence</b> (0–100) scores what the row\u2019s own record supports: age known, 7d change reported, enough category comps, several chains, TVL at or above the floor. The <b>band</b> is ±' + Math.round(model.band_floor * 100) + '% plus ' + Math.round(model.band_slope * 100) + '% × (1 − confidence/100).</p>' +
    '<p>No protocol name is ever special-cased: the same function scores every row, and the board is sorted by implied value.</p>';
  document.querySelector('#compstab tbody').innerHTML = comps.map(function (c) {
    return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.multiple.toFixed(3) + '×</td><td class="num">' + c.comps + '</td><td>category multiple</td></tr>';
  }).join('') + '<tr><td><i>All other categories</i></td><td class="num">' + D.global_multiple.toFixed(3) + '×</td><td class="num">—</td><td>global fallback</td></tr>';

  /* ---- tabs ---- */
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
      ['board', 'live', 'model'].forEach(function (t) { $('tab-' + t).hidden = t !== b.getAttribute('data-tab'); });
    });
  });
  function showTab(t) {
    document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-tab') === t); });
    ['board', 'live', 'model'].forEach(function (x) { $('tab-' + x).hidden = x !== t; });
  }

  /* ---- sandbox ---- */
  function sandboxChanged() {
    sandbox.scale = parseFloat($('ms').value); sandbox.gw = parseFloat($('gw').value); sandbox.mf = parseFloat($('mf').value);
    sandbox.on = !(sandbox.scale === 1 && sandbox.gw === 0.5 && sandbox.mf === 0.6);
    $('ms-val').textContent = sandbox.scale.toFixed(2) + '×';
    $('gw-val').textContent = sandbox.gw.toFixed(2);
    $('mf-val').textContent = sandbox.mf.toFixed(2);
    $('sandbox-note').textContent = sandbox.on ? 'Sandbox active — the board below is re-ranked with your sliders, not the submitted board.' : 'Sandbox off — showing the published radar-2 board.';
    renderBoard();
  }
  ['ms', 'gw', 'mf'].forEach(function (id) { $(id).addEventListener('input', sandboxChanged); });
  $('sandbox-reset').addEventListener('click', function () { $('ms').value = 1; $('gw').value = 0.5; $('mf').value = 0.6; sandboxChanged(); });

  /* ---- wire filters ---- */
  ['q', 'cat', 'chain', 'mom', 'sort', 'watchonly'].forEach(function (id) {
    $(id).addEventListener('input', renderBoard);
    $(id).addEventListener('change', renderBoard);
  });

  /* ---- URL params (deep links + screenshots) ---- */
  var params = new URLSearchParams(location.search);
  if (params.get('cat')) { $('cat').value = params.get('cat'); }
  if (params.get('tab')) showTab(params.get('tab'));
  renderBoard();
  if (params.get('view')) showDetail(params.get('view'));
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('detail').hidden = true; });
})();
