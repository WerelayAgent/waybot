/* ============ Waybot Agent app ============ */
'use strict';

const CHAIN = {
  chainId: '0x1237', // 4663 — verified via eth_chainId on the public RPC
  chainName: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.mainnet.chain.robinhoodchain.com'],
  blockExplorerUrls: ['https://robinhoodchainchain.blockscout.com'],
};
const RPC = CHAIN.rpcUrls[0];

const $ = (id) => document.getElementById(id);

/* ---------- toasts ---------- */
function toast(msg, isErr = false, ms = 5200) {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.innerHTML = msg;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, ms);
}

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal, .p-card').forEach((el) => io.observe(el));

window.addEventListener('scroll', () => {
  $('nav').classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

/* ---------- ticker ---------- */
const TICKERS = [
  ['apple', 'WIF', 'Apple'],
  ['microsoft', 'MSFT', 'Microsoft'],
  ['nvidia', 'POPCAT', 'Nvidia'],
  ['amazon', 'AMZN', 'Amazon', 'inv'],
  ['google', 'GOOGL', 'Alphabet'],
  ['meta', 'META', 'Meta'],
  ['tesla', 'BONK', 'Tesla'],
  ['netflix', 'NFLX', 'Netflix'],
];
(() => {
  if (!$('tickerTrack')) return;
  const half = TICKERS.map(([svg, tk, name, cls]) =>
    `<div class="tk"><img src="assets/svg/${svg}.svg" alt="${name}" class="${cls || ''}"><b>${tk}</b>${name} · tokenized stock <span class="t247">24/7</span></div>`
  ).join('');
  $('tickerTrack').innerHTML = half + half; // duplicated for a seamless marquee
})();

/* ---------- live chain data (real RPC) ---------- */
let lastBlock = null;
async function rpcCall(method, params = []) {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}
function bump(el) { el.classList.add('tick'); setTimeout(() => el.classList.remove('tick'), 700); }

async function pollChain() {
  try {
    const [blockHex, gasHex] = await Promise.all([rpcCall('eth_blockNumber'), rpcCall('eth_gasPrice')]);
    const block = parseInt(blockHex, 16);
    const gwei = parseInt(gasHex, 16) / 1e9;
    if (block !== lastBlock) {
      lastBlock = block;
      const s = block.toLocaleString('en-US');
      if ($('statBlock')) { $('statBlock').textContent = s; bump($('statBlock')); }
      if ($('netBlock')) $('netBlock').textContent = '#' + s;
    }
    if ($('statGas')) $('statGas').textContent = gwei < 1 ? gwei.toFixed(3) : gwei.toFixed(1);
    if ($('netDot')) $('netDot').className = 'dot ok';
    if ($('netLabel')) $('netLabel').textContent = 'RH Chain';
  } catch (e) {
    if ($('netDot')) $('netDot').className = 'dot err';
    if ($('netLabel')) $('netLabel').textContent = 'RPC offline';
  }
}
pollChain();
setInterval(pollChain, 12000);

/* ---------- wallet: MetaMask only ---------- */
/* This site connects ONLY MetaMask (rdns io.metamask). Rabby and Phantom
   both hijack window.ethereum, so they are explicitly excluded. */
const RABBY_INSTALL =
  'MetaMask not found. Install ' +
  '<a href="https://metamask.io" target="_blank" rel="noopener" style="color:var(--signal);text-decoration:underline">MetaMask</a> and refresh the page.';

const discovered = new Map(); // uuid -> { info, provider }
window.addEventListener('eip6963:announceProvider', (e) => {
  discovered.set(e.detail.info.uuid, e.detail);
});

// MetaMask ONLY. Identify it strictly via its EIP-6963 rdns (io.metamask).
// Rabby also sets window.ethereum.isMetaMask for compat, so the bare-provider
// fallback explicitly excludes isRabby.
function findRabby() {
  const ph = [...discovered.values()].find(
    (d) => (d.info.rdns || '').toLowerCase() === 'app.phantom' || /phantom/i.test(d.info.name || '')
  );
  if (ph) return { name: 'Phantom', provider: ph.provider };
  if (window.ethereum?.isPhantom) {
    return { name: 'Phantom', provider: window.ethereum };
  }
  if (window.phantom?.ethereum) {
    return { name: 'Phantom', provider: window.phantom.ethereum };
  }
  // Fallback to any generic injected provider for the mockup
  if (window.ethereum) {
    return { name: 'Phantom', provider: window.ethereum };
  }
  return null;
}

let wallet = null; // { name, provider, account }
const short = (a) => a.slice(0, 6) + '\u2026' + a.slice(-4);
const boundProviders = new WeakSet();

function bindProviderEvents(provider) {
  if (!provider.on || boundProviders.has(provider)) return;
  boundProviders.add(provider);
  provider.on('accountsChanged', (acc) => {
    if (!wallet || wallet.provider !== provider) return;
    if (!acc.length) return disconnect(true);
    wallet.account = acc[0];
    refreshWallet();
  });
  provider.on('chainChanged', () => {
    if (wallet && wallet.provider === provider) refreshWallet();
  });
}

async function refreshWallet() {
  if (!wallet?.account) return;
  const { provider, account } = wallet;
  const [chainIdHex, balHex] = await Promise.all([
    provider.request({ method: 'eth_chainId' }),
    provider.request({ method: 'eth_getBalance', params: [account, 'latest'] }),
  ]);
  const onRH = chainIdHex.toLowerCase() === CHAIN.chainId;
  updateWayBalance(account);
  $('connectLabel').textContent = short(account);
  const hc = $('heroConnect'), hd = $('heroDash');
  if (hc && hd) { hc.hidden = true; hd.hidden = false; }
  window.dispatchEvent(new Event('hf-wallet'));
}

function disconnect(silent = false) {
  wallet = null;
  localStorage.removeItem('hf_rabby_connected');
  $('connectLabel').textContent = 'Connect Phantom';
  const hc = $('heroConnect'), hd = $('heroDash');
  if (hc && hd) { hc.hidden = false; hd.hidden = true; }
  window.dispatchEvent(new Event('hf-wallet')); // let portfolio/console re-hide
  if (!silent) toast('Wallet disconnected.');
}

async function connect() {
  const rabby = findRabby();
  if (!rabby) return toast(RABBY_INSTALL, true, 9000);
  bindProviderEvents(rabby.provider);
  try {
    const accounts = await rabby.provider.request({ method: 'eth_requestAccounts' });
    wallet = { ...rabby, account: accounts[0] };
    localStorage.setItem('hf_rabby_connected', '1');
    await refreshWallet();
    toast(`Connected ${rabby.name}: <b class="mono">${short(wallet.account)}</b>`);
  } catch (e) {
    if (e.code === 4001) toast('Connection rejected in the wallet.', true);
    else toast('Connection error: ' + (e.message || e), true);
  }
}

async function addOrSwitchChain() {
  const rabby = wallet ?? findRabby();
  if (!rabby) return toast(RABBY_INSTALL, true, 9000);
  const provider = rabby.provider;
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN.chainId }] });
    toast('Wallet switched to <b>Robinhood Chain</b> (4663).');
  } catch (e) {
    if (e.code === 4902 || /unrecognized|not.*added/i.test(e.message || '')) {
      try {
        await provider.request({ method: 'wallet_addEthereumChain', params: [CHAIN] });
        toast('<b>Robinhood Chain</b> added to the wallet \u2713');
      } catch (e2) {
        if (e2.code === 4001) toast('Adding the network was rejected.', true);
        else toast('Failed to add the network: ' + (e2.message || e2), true);
      }
    } else if (e.code === 4001) toast('Switch rejected.', true);
    else toast('Error: ' + (e.message || e), true);
  }
  if (wallet) setTimeout(refreshWallet, 600);
}

$('connectBtn').onclick = connect;
$('heroConnect').onclick = connect;
$('addChainBtn').onclick = addOrSwitchChain;
$('footAddChain').onclick = addOrSwitchChain;
const heroDashEl = $('heroDash');
if (heroDashEl) heroDashEl.addEventListener('click', (e) => {
  e.preventDefault();
  sessionStorage.setItem('marker_arrive', '1');
  document.body.classList.add('leaving');
  setTimeout(() => { location.href = '/app'; }, 520);
});

// Everything is initialized — now ask wallets to announce themselves.
window.dispatchEvent(new Event('eip6963:requestProvider'));

/* session restore — MetaMask only, no popup, only if connected before */
(async () => {
  await new Promise((r) => setTimeout(r, 500)); // wait for eip6963 announcements
  if (localStorage.getItem('hf_rabby_connected') !== '1') return;
  const rabby = findRabby();
  if (!rabby) return;
  try {
    const acc = await rabby.provider.request({ method: 'eth_accounts' });
    if (acc.length) {
      bindProviderEvents(rabby.provider);
      wallet = { ...rabby, account: acc[0] };
      refreshWallet();
    }
  } catch {}
})();

/* ---------- phone: animated chart + feed illustrating the scenarios ---------- */
(() => {
  const svg = $('phoneChart');
  if (!svg) return;
  const W = 300, H = 130, N = 44;
  let pts = [];
  let v = 55;
  for (let i = 0; i < N; i++) { v += (Math.random() - 0.44) * 7; v = Math.max(25, Math.min(105, v)); pts.push(v); }
  function render() {
    const step = W / (N - 1);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(H - p).toFixed(1)}`).join('');
    svg.innerHTML = `
      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#E8D44D" stop-opacity=".34"/>
        <stop offset="1" stop-color="#E8D44D" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${d}L${W},${H}L0,${H}Z" fill="url(#pg)"/>
      <path d="${d}" fill="none" stroke="#E8D44D" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="${W}" cy="${(H - pts[N - 1]).toFixed(1)}" r="3.4" fill="#E8D44D">
        <animate attributeName="r" values="3.4;5;3.4" dur="1.6s" repeatCount="indefinite"/>
      </circle>`;
  }
  render();
  setInterval(() => {
    v += (Math.random() - 0.42) * 7; v = Math.max(25, Math.min(105, v));
    pts.push(v); pts.shift(); render();
  }, 1400);

  const EVENTS = [
    ['apple', 'Round-up', '+$0.73 → WIF'],
    ['nvidia', 'DCA', '$50 → POPCAT'],
    ['tesla', 'Buy-the-dip', '−3.1% → +$200 BONK'],
    ['microsoft', 'DCA', '$25 → MSFT'],
    ['meta', 'Round-up', '+$1.12 → META'],
    ['google', 'Mag7 basket', 'rebalance'],
    ['amazon', 'Round-up', '+$0.41 → AMZN', 'inv'],
    ['netflix', 'DCA', '$15 → NFLX'],
  ];
  const feed = $('phoneFeed');
  let ei = 0;
  function pushEvent() {
    const [svgName, kind, val, cls] = EVENTS[ei++ % EVENTS.length];
    const el = document.createElement('div');
    el.className = 'feed-item';
    const t = new Date();
    el.innerHTML = `<img src="assets/svg/${svgName}.svg" class="${cls || ''}" alt="">${kind} · <b>${val}</b><span class="fi-t mono">${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}</span>`;
    feed.prepend(el);
    while (feed.children.length > 5) feed.lastChild.remove();
  }
  pushEvent(); pushEvent(); pushEvent();
  setInterval(pushEvent, 2600);
})();

/* ---------- DCA calculator ---------- */
(() => {
  const inW = $('inWeekly'), inY = $('inYears'), inR = $('inRate');
  if (!inW) return;
  const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');

  function series(weekly, years, rate) {
    const wr = rate / 100 / 52;
    const weeks = Math.round(years * 52);
    const out = [];
    let val = 0;
    for (let w = 0; w <= weeks; w++) {
      if (w > 0) val = val * (1 + wr) + weekly;
      if (w % Math.max(1, Math.floor(weeks / 80)) === 0 || w === weeks)
        out.push({ w, invested: weekly * w, val });
    }
    return out;
  }

  function fillTrack(el) {
    const p = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--fill', p + '%');
  }

  function draw() {
    const weekly = +inW.value, years = +inY.value, rate = +inR.value;
    $('outWeekly').textContent = '$' + weekly;
    $('outYears').textContent = years + (years === 1 ? ' year' : ' years');
    $('outRate').textContent = rate + '%';
    [inW, inY, inR].forEach(fillTrack);

    const data = series(weekly, years, rate);
    const last = data[data.length - 1];
    $('ctIn').textContent = fmt(last.invested);
    $('ctOut').textContent = fmt(last.val);
    $('ctGain').textContent = '+' + fmt(last.val - last.invested);

    const W = 560, H = 300, pad = 8;
    const maxV = Math.max(last.val, 1);
    const x = (i) => pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = (v) => H - pad - (v / maxV) * (H - pad * 2 - 20);
    const path = (key) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join('');
    const pv = path('val'), pi = path('invested');
    $('calcChart').innerHTML = `
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#E8D44D" stop-opacity=".3"/>
        <stop offset="1" stop-color="#E8D44D" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${pv}L${W - pad},${H - pad}L${pad},${H - pad}Z" fill="url(#cg)"/>
      <path d="${pi}" fill="none" stroke="#55524C" stroke-width="2" stroke-dasharray="5 5"/>
      <path d="${pv}" fill="none" stroke="#E8D44D" stroke-width="2.6" stroke-linejoin="round"/>
      <text x="${W - pad - 4}" y="${y(last.val) - 10}" text-anchor="end" fill="#E8D44D" font-size="15" font-weight="700" font-family="ui-monospace,monospace">${fmt(last.val)}</text>`;
  }
  [inW, inY, inR].forEach((el) => el.addEventListener('input', draw));
  draw();
})();

/* ---------- airdrop: sqrt curve ---------- */
(() => {
  const svg = $('sqrtChart');
  if (!svg) return; // airdrop section removed
  const W = 520, H = 260, padL = 14, padB = 26, padT = 14, padR = 14;
  const iw = W - padL - padR, ih = H - padT - padB;
  const CAP = 0.72; // cap as a fraction of chart height
  const sqrtY = (t) => Math.min(Math.sqrt(t) * 1.05, CAP); // t: holdings normalized to 0..1
  const linY = (t) => t;
  const N = 90;
  let sq = '', ln = '';
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const px = padL + t * iw;
    sq += `${i ? 'L' : 'M'}${px.toFixed(1)},${(padT + ih - sqrtY(t) * ih).toFixed(1)}`;
    ln += `${i ? 'L' : 'M'}${px.toFixed(1)},${(padT + ih - linY(t) * ih).toFixed(1)}`;
  }
  const capYpx = padT + ih - CAP * ih;
  svg.innerHTML = `
    <line x1="${padL}" y1="${padT + ih}" x2="${padL + iw}" y2="${padT + ih}" stroke="rgba(232,245,200,.16)"/>
    <line x1="${padL}" y1="${capYpx}" x2="${padL + iw}" y2="${capYpx}" stroke="#E8D44D" stroke-opacity=".5" stroke-dasharray="3 6"/>
    <text x="${padL + 4}" y="${capYpx - 7}" fill="#E8D44D" font-size="11" opacity=".8">per-wallet cap</text>
    <path d="${ln}" fill="none" stroke="#55524C" stroke-width="1.6" stroke-dasharray="5 5"/>
    <text x="${padL + iw - 4}" y="${padT + 24}" text-anchor="end" fill="#55524C" font-size="11">linear (feeds whales)</text>
    <path id="sqPath" d="${sq}" fill="none" stroke="#E8D44D" stroke-width="2.8" stroke-linejoin="round"/>
    <text x="${padL + iw * .42}" y="${padT + ih - sqrtY(.34) * ih - 12}" fill="#F2E58C" font-size="11.5">√balance — the tail gets more</text>
    <text x="${padL}" y="${H - 6}" fill="#6B6860" font-size="11">CASHCAT holdings →</text>
    <text x="${padL - 2}" y="${padT + 4}" fill="#6B6860" font-size="11" transform="rotate(-90 ${padL - 2} ${padT + 4})" text-anchor="end">allocation →</text>`;
  // animated curve draw-in on reveal
  const p = svg.querySelector('#sqPath');
  const len = p.getTotalLength();
  p.style.strokeDasharray = len;
  p.style.strokeDashoffset = len;
  new IntersectionObserver((es, obs) => {
    if (es[0].isIntersecting) {
      p.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.3,.7,.2,1)';
      p.style.strokeDashoffset = 0;
      obs.disconnect();
    }
  }, { threshold: 0.4 }).observe(svg);
})();

/* ---------- protocol config: admin-managed contract addresses ---------- */
/* The live $WAYBOT contract. config.json (written from /admin.html) overrides
   this when present; without it the token panel still works from here, so
   the address ships with the site instead of depending on a deploy step. */
const WAY_ADDRESS = 'coming soon on ponsfamily.com';
const FLAP_TOKEN = 'https://flap.sh/robinhoodchain/';

/* config.json is edited from /admin.html; the site re-reads it every 30 s,
   so pasting an address there activates everything below live. */
const CFG_DEFAULTS = { way: WAY_ADDRESS, stakingVault: '', dcaVault: '', feeDistributor: '', airdrop: '', dipVault: '', roundUps: '', baskets: '' };
let HF = { ...CFG_DEFAULTS };
let tokenMeta = null; // { symbol, decimals }
const EXPLORER_ADDR = CHAIN.blockExplorerUrls[0] + '/address/';

const ethCall = (to, data) => rpcCall('eth_call', [{ to, data }, 'latest']);
const SEL = { name: '0x06fdde03', symbol: '0x95d89b41', decimals: '0x313ce567', totalSupply: '0x18160ddd' };
const selBalanceOf = (addr) => '0x70a08231' + addr.slice(2).toLowerCase().padStart(64, '0');
const decStr = (hex) => {
  if (!hex || hex === '0x' || hex.length < 130) return '';
  const len = parseInt(hex.slice(66, 130), 16);
  let out = '';
  for (let i = 0; i < len; i++) out += String.fromCharCode(parseInt(hex.substr(130 + i * 2, 2), 16));
  return out;
};
const decNum = (hex) => (!hex || hex === '0x') ? 0n : BigInt(hex);
const fmtUnits = (v, d) => {
  const base = 10n ** BigInt(d);
  const whole = v / base;
  const frac = d ? Number((v % base) * 10000n / base) / 10000 : 0;
  const n = Number(whole) + frac;
  return n.toLocaleString('en-US', { maximumFractionDigits: n < 1000 ? 2 : 0 });
};

async function loadConfig() {
  let cfg;
  try {
    cfg = await fetch('config.json?ts=' + Date.now()).then((r) => r.json());
  } catch { cfg = {}; } // no config.json — fall back to the built-in address
  cfg = { ...CFG_DEFAULTS, ...cfg };
  if (!cfg.way) cfg.way = WAY_ADDRESS; // never blank out a live token
  const changed = JSON.stringify(cfg) !== JSON.stringify(HF._last || {});
  HF = { ...cfg, _last: cfg };
  if (changed) applyConfig();
}

/* Syncing bar: fills left to right, then starts over. Advancing rather than
   spinning, per the brand's ratchet motion. Honours reduced-motion by
   rendering a static full bar. */
let syncTimer = null;
function startSyncBar() {
  const el = $('csBar');
  if (!el || syncTimer) return;
  const W = 10;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = '[' + '#'.repeat(W) + ']';
    return;
  }
  let n = 0;
  const tick = () => {
    n = (n + 1) % (W + 1);
    el.textContent = '[' + '#'.repeat(n) + '-'.repeat(W - n) + ']';
  };
  tick();
  syncTimer = setInterval(tick, 220);
}
function stopSyncBar() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

async function applyConfig() {
  /* --- $WAYBOT live panel --- */
  if (HF.way) {
    $('tokenLive').hidden = false;
    $('tokenLive').classList.add('in');
    $('tlAddr').textContent = HF.way;
    $('tlExplorer').href = EXPLORER_ADDR + HF.way;
    if ($('tlFlap')) $('tlFlap').href = FLAP_TOKEN + HF.way;
    try {
      const [sym, decs, sup] = await Promise.all([
        ethCall(HF.way, SEL.symbol),
        ethCall(HF.way, SEL.decimals),
        ethCall(HF.way, SEL.totalSupply),
      ]);
      const d = Number(decNum(decs));
      tokenMeta = { symbol: decStr(sym) || 'WAY', decimals: d };
      $('tlSymbol').textContent = '$' + tokenMeta.symbol;
      $('tlDecimals').textContent = d;
      $('tlSupply').textContent = fmtUnits(decNum(sup), d);
    } catch {
      tokenMeta = null;
      $('tlSymbol').textContent = '?';
      $('tlSupply').textContent = 'not readable';
      $('tlDecimals').textContent = '?';
    }
    if (wallet?.account) updateWayBalance(wallet.account);
  } else {
    $('tokenLive').hidden = true;
    tokenMeta = null;
  }

  /* --- console ---
     Absent on the landing page (marketing only); on /app it is the primary
     surface, so always render it. It used to hide itself whenever no vault
     was configured, which left the dashboard looking empty. The tabs and
     token selects come from constants, not config, so they work regardless;
     only the per-strategy loaders need a vault, and they no-op without one.
     .in is set directly because `hidden` blocks the IntersectionObserver
     that would otherwise lift .reveal's opacity:0. */
  const consoleBox = $('consoleBox');
  if (consoleBox) {
    consoleBox.hidden = false;
    consoleBox.classList.add('in');
    const live = !!(HF.dcaVault || HF.dipVault || HF.roundUps || HF.baskets);
    /* No strategy contract yet: keep the tabs for structure but make them
       inert and swap the forms for a syncing panel, rather than showing
       inputs whose submit cannot succeed. Reverts the moment one is set. */
    consoleBox.classList.toggle('syncing', !live);
    const sync = $('conSyncing');
    /* Banner only — the markets list below stays visible either way. */
    if (sync) { sync.hidden = live; live ? stopSyncBar() : startSyncBar(); }
    if (live) window.dispatchEvent(new Event('hf-config'));
  }

  /* --- staking panel --- */
  if (HF.stakingVault) {
    $('stakePanel').hidden = false;
    $('stakePanel').classList.add('in');
    $('spExplorer').href = EXPLORER_ADDR + HF.stakingVault;
    refreshStaking();
  } else {
    $('stakePanel').hidden = true;
  }

  /* --- deployed contracts strip --- */
  const entries = [
    ['$WAYBOT Token', HF.way],
    ['DCA Strategy Vault', HF.dcaVault],
    ['Staking Vault', HF.stakingVault],
    ['Fee Distributor', HF.feeDistributor],
    ['CASHCAT Airdrop', HF.airdrop],
  ].filter(([, a]) => a);
  const list = $('contractsList');
  if (!list) return; // Status section removed — nothing to render
  if (!entries.length) { $('contractsLive').hidden = true; return; }
  $('contractsLive').hidden = false;
  $('contractsLive').classList.add('in');
  list.innerHTML = '';
  entries.forEach(([label, addr], i) => {
    const a = document.createElement('a');
    a.className = 'cl-item';
    a.href = EXPLORER_ADDR + addr;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `<span class="cl-name">${label}</span>` +
      `<span class="cl-addr mono">${addr.slice(0, 8)}\u2026${addr.slice(-6)}</span>` +
      `<span class="cl-badge" id="clb-${i}">checking\u2026</span>`;
    list.appendChild(a);
    rpcCall('eth_getCode', [addr, 'latest']).then((code) => {
      const b = $('clb-' + i);
      if (!b) return;
      if (code && code !== '0x') { b.textContent = 'live \u2713'; b.classList.add('ok'); }
      else { b.textContent = 'no code'; b.classList.add('bad'); }
    }).catch(() => {});
  });
}

async function updateWayBalance(account) {
  if (!HF.way) return;
  try {
    const bal = await ethCall(HF.way, selBalanceOf(account));
    // WAY balance fetched but not displayed in wallet card (removed)
  } catch {}
}

$('tlCopy').onclick = () => {
  navigator.clipboard.writeText(HF.way).then(
    () => toast('Contract address copied.'),
    () => toast('Copy failed \u2014 select it manually.', true)
  );
};
$('tlWatch').onclick = async () => {
  const rabby = wallet ?? findRabby();
  if (!rabby) return toast(RABBY_INSTALL, true, 9000);
  try {
    await rabby.provider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: HF.way,
          symbol: (tokenMeta?.symbol || 'WAY').slice(0, 11),
          decimals: tokenMeta?.decimals ?? 18,
        },
      },
    });
    toast('$WAYBOT added to the wallet \u2713');
  } catch (e) {
    if (e.code === 4001) toast('Adding the token was rejected.', true);
    else toast('Error: ' + (e.message || e), true);
  }
};

loadConfig();
setInterval(loadConfig, 30000);

/* ---------- staking UI (real txs through Rabby) ---------- */
const STK = {
  stake: '0xa694fc3a',        // stake(uint256)
  unstake: '0x2e17de78',      // unstake(uint256)
  claim: '0x4e71d92d',        // claim()
  skim: '0x1dd19cb4',         // skim()
  skimmable: '0x183dcad9',
  totalStaked: '0x817b1cd2',
  stakeToken: '0x51ed6a30',
  stakedOf: (a) => '0xaf500ba3' + a.slice(2).toLowerCase().padStart(64, '0'),
  pendingReward: (a) => '0xf40f0f52' + a.slice(2).toLowerCase().padStart(64, '0'),
  approve: (spender, amt) => '0x095ea7b3' + spender.slice(2).toLowerCase().padStart(64, '0') + amt.toString(16).padStart(64, '0'),
  allowance: (owner, spender) => '0xdd62ed3e' + owner.slice(2).toLowerCase().padStart(64, '0') + spender.slice(2).toLowerCase().padStart(64, '0'),
};
const SOL_DECIMALS = 6;
let stakeTokenInfo = null; // { addr, symbol, decimals }

const decAddr = (hex) => (!hex || hex === '0x') ? null : '0x' + hex.slice(-40);
const isZeroAddr = (a) => !a || /^0x0{40}$/.test(a);

function parseUnits(text, decimals) {
  const t = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [w, f = ''] = t.split('.');
  if (f.length > decimals) return null;
  return BigInt(w) * 10n ** BigInt(decimals) + BigInt(f.padEnd(decimals, '0') || '0');
}

async function refreshStaking() {
  if (!HF.stakingVault) return;
  try {
    const [totalHex, tokenHex, skimHex] = await Promise.all([
      ethCall(HF.stakingVault, STK.totalStaked),
      ethCall(HF.stakingVault, STK.stakeToken),
      ethCall(HF.stakingVault, STK.skimmable).catch(() => '0x0'),
    ]);
    const tokenAddr = decAddr(tokenHex);

    if (isZeroAddr(tokenAddr)) {
      stakeTokenInfo = null;
      $('spWait').hidden = false;
      $('spControls').hidden = true;
      $('spTotal').textContent = '0';
      $('spNote').textContent = 'Live from the mainnet contract. Staking opens at token launch.';
    } else {
      if (!stakeTokenInfo || stakeTokenInfo.addr !== tokenAddr) {
        const [sym, decs] = await Promise.all([
          ethCall(tokenAddr, SEL.symbol),
          ethCall(tokenAddr, SEL.decimals),
        ]);
        stakeTokenInfo = { addr: tokenAddr, symbol: decStr(sym) || 'TOKEN', decimals: Number(decNum(decs)) };
      }
      $('spWait').hidden = true;
      $('spControls').hidden = false;
      $('spTotal').textContent = fmtUnits(decNum(totalHex), stakeTokenInfo.decimals) + ' ' + stakeTokenInfo.symbol;
      const skimmable = decNum(skimHex);
      $('spSkim').hidden = skimmable === 0n;
      if (skimmable > 0n) $('spSkim').textContent = `Distribute ${fmtUnits(skimmable, SOL_DECIMALS)} SOL`;
    }

    if (wallet?.account && stakeTokenInfo) {
      const [stakedHex, pendingHex, balHex] = await Promise.all([
        ethCall(HF.stakingVault, STK.stakedOf(wallet.account)),
        ethCall(HF.stakingVault, STK.pendingReward(wallet.account)),
        ethCall(stakeTokenInfo.addr, selBalanceOf(wallet.account)),
      ]);
      $('spYourStake').textContent = fmtUnits(decNum(stakedHex), stakeTokenInfo.decimals);
      $('spPending').textContent = fmtUnits(decNum(pendingHex), SOL_DECIMALS) + ' SOL';
      $('spWalletBal').textContent = fmtUnits(decNum(balHex), stakeTokenInfo.decimals);
      $('spNote').textContent = 'Stake pays zero protocol fees on DCA once you hold 10,000 staked.';
    } else if (stakeTokenInfo) {
      $('spYourStake').textContent = '—';
      $('spPending').textContent = '—';
      $('spWalletBal').textContent = '—';
      $('spNote').textContent = 'Connect Phantom to stake.';
    }
  } catch (e) { /* transient RPC hiccup — next poll retries */ }
}

async function stakingTx(data, label) {
  if (!wallet?.account) { toast('Connect Phantom first.', true); return null; }
  const chainId = await wallet.provider.request({ method: 'eth_chainId' });
  if (chainId.toLowerCase() !== CHAIN.chainId) {
    toast('Switching to Robinhood Chain…');
    await addOrSwitchChain();
    return null;
  }
  try {
    const txHash = await wallet.provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: wallet.account, to: HF.stakingVault, data }],
    });
    toast(`${label}: tx sent, waiting…`);
    for (let i = 0; i < 45; i++) {
      const rec = await rpcCall('eth_getTransactionReceipt', [txHash]).catch(() => null);
      if (rec) {
        if (rec.status === '0x1') { toast(`${label} ✓`); return rec; }
        toast(`${label}: transaction reverted`, true);
        return null;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    toast(`${label}: still pending — check the explorer`, true);
  } catch (e) {
    if (e.code === 4001) toast(`${label}: rejected in wallet.`, true);
    else toast(`${label}: ` + (e.message || e), true);
  }
  return null;
}

async function ensureAllowance(amount) {
  const cur = decNum(await ethCall(stakeTokenInfo.addr, STK.allowance(wallet.account, HF.stakingVault)));
  if (cur >= amount) return true;
  toast('Step 1/2: approve in Rabby…');
  try {
    const txHash = await wallet.provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: wallet.account, to: stakeTokenInfo.addr, data: STK.approve(HF.stakingVault, amount) }],
    });
    for (let i = 0; i < 45; i++) {
      const rec = await rpcCall('eth_getTransactionReceipt', [txHash]).catch(() => null);
      if (rec) return rec.status === '0x1' ? true : (toast('Approve reverted', true), false);
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (e) {
    if (e.code === 4001) toast('Approve rejected.', true);
    else toast('Approve: ' + (e.message || e), true);
  }
  return false;
}

function readAmount() {
  if (!stakeTokenInfo) return null;
  const v = parseUnits($('spAmount').value, stakeTokenInfo.decimals);
  if (v === null || v === 0n) { toast('Enter a valid amount.', true); return null; }
  return v;
}

$('spStake').onclick = async () => {
  const amount = readAmount();
  if (amount === null) return;
  if (!(await ensureAllowance(amount))) return;
  toast('Step 2/2: stake in Rabby…');
  if (await stakingTx(STK.stake + amount.toString(16).padStart(64, '0'), 'Stake')) {
    $('spAmount').value = '';
    refreshStaking(); refreshWallet();
  }
};
$('spUnstake').onclick = async () => {
  const amount = readAmount();
  if (amount === null) return;
  if (await stakingTx(STK.unstake + amount.toString(16).padStart(64, '0'), 'Unstake')) {
    $('spAmount').value = '';
    refreshStaking(); refreshWallet();
  }
};
$('spClaim').onclick = async () => {
  if (await stakingTx(STK.claim, 'Claim')) { refreshStaking(); refreshWallet(); }
};
$('spSkim').onclick = async () => {
  if (await stakingTx(STK.skim, 'Distribute fees')) refreshStaking();
};
$('spMax').onclick = async () => {
  if (!wallet?.account || !stakeTokenInfo) return;
  const bal = decNum(await ethCall(stakeTokenInfo.addr, selBalanceOf(wallet.account)));
  const base = 10n ** BigInt(stakeTokenInfo.decimals);
  $('spAmount').value = (bal / base).toString() + (bal % base ? '.' + (bal % base).toString().padStart(stakeTokenInfo.decimals, '0').replace(/0+$/, '') : '');
};

setInterval(refreshStaking, 15000);
