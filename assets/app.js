const yen = new Intl.NumberFormat("ja-JP");

function showPanel(name) {
  const map = {
    roi: document.querySelector("#roiPanel"),
    automation: document.querySelector("#automationPanel"),
    csv: document.querySelector("#csvPanel")
  };

  Object.entries(map).forEach(([key, el]) => {
    if (!el) return;
    if (key === name) {
      el.classList.toggle("hidden");
      if (!el.classList.contains("hidden")) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      el.classList.add("hidden");
    }
  });
}

document.querySelectorAll("[data-open]").forEach(btn => {
  btn.addEventListener("click", () => showPanel(btn.dataset.open));
});

document.querySelector("#runCalc")?.addEventListener("click", () => {
  const hourly = Number(document.querySelector("#hourly").value || 0);
  const minutes = Number(document.querySelector("#minutes").value || 0);
  const monthly = Number(document.querySelector("#monthly").value || 0);
  const people = Number(document.querySelector("#people").value || 0);

  const monthlyCost = hourly * (minutes / 60) * monthly * people;
  const annual = monthlyCost * 12;

  const out = document.querySelector("#result");
  out.classList.remove("hidden");
  out.innerHTML = `
    <strong>月 ${yen.format(Math.round(monthlyCost))}円</strong>
    <span>年間 約 ${yen.format(Math.round(annual))}円</span>
    <small>入力条件からの単純試算です。実際の削減額や導入効果を保証するものではありません。</small>
  `;
});

document.querySelector("#runAutomation")?.addEventListener("click", () => {
  const score = [...document.querySelectorAll("[data-auto-q]")]
    .reduce((sum, el) => sum + Number(el.value || 0), 0);

  let label = "手作業維持も選択肢";
  let detail = "定型化できる工程を先に探すと、自動化しやすくなります。";

  if (score >= 8) {
    label = "自動化適性：高い";
    detail = "定型処理・転記・反復が多く、自動化候補として優先的に棚卸しする価値があります。";
  } else if (score >= 5) {
    label = "自動化適性：中程度";
    detail = "一部工程の自動化から始めると効果を確認しやすいタイプです。";
  }

  const out = document.querySelector("#automationResult");
  out.classList.remove("hidden");
  out.innerHTML = `
    <strong>${label}</strong>
    <span>診断スコア ${score} / 10</span>
    <small>${detail} この診断は簡易評価で、導入効果を保証するものではありません。</small>
  `;
});

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some(v => v.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some(v => v.length > 0)) rows.push(row);
  return rows;
}

document.querySelector("#csvFile")?.addEventListener("change", async e => {
  const file = e.target.files?.[0];
  const out = document.querySelector("#csvResult");
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    out.classList.remove("hidden");
    out.innerHTML = "<strong>10MB以下のCSVで試してください。</strong>";
    return;
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (!rows.length) {
    out.classList.remove("hidden");
    out.innerHTML = "<strong>CSVの行を検出できませんでした。</strong>";
    return;
  }

  const header = rows[0];
  const data = rows.slice(1);
  const width = Math.max(...rows.map(r => r.length));
  const totalCells = Math.max(1, data.length * width);

  let emptyCells = 0;
  data.forEach(r => {
    for (let i = 0; i < width; i++) {
      if ((r[i] ?? "").trim() === "") emptyCells++;
    }
  });

  const normalizedRows = data.map(r => JSON.stringify(r.map(v => (v ?? "").trim())));
  const duplicates = normalizedRows.length - new Set(normalizedRows).size;
  const inconsistent = data.filter(r => r.length !== header.length).length;
  const emptyRate = (emptyCells / totalCells) * 100;

  out.classList.remove("hidden");
  out.innerHTML = `
    <strong>${yen.format(data.length)} 行 × ${yen.format(header.length)} 列</strong>
    <span>空欄セル ${yen.format(emptyCells)}（${emptyRate.toFixed(1)}%）</span>
    <span>完全重複行 ${yen.format(duplicates)} 件</span>
    <span>列数不一致 ${yen.format(inconsistent)} 行</span>
    <small>解析はこのブラウザ内だけで実行しました。ファイルはサーバーへ送信していません。</small>
  `;
});

let topic = "all";

document.querySelectorAll("[data-topic]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-topic]").forEach(x => x.classList.remove("active"));
    button.classList.add("active");
    topic = button.dataset.topic;
    renderAds();
    document.querySelector("#deals")?.scrollIntoView({ behavior: "smooth" });
  });
});

async function renderAds() {
  const grid = document.querySelector("#ads");
  const empty = document.querySelector("#empty");
  if (!grid || !empty) return;

  try {
    const response = await fetch("data/ad_inventory.json", { cache: "no-store" });
    const data = await response.json();

    const approved = data
      .filter(x => x.status === "approved")
      .filter(x => topic === "all" || x.topics?.includes(topic))
      .map(x => ({
        ...x,
        score:
          (x.relevance ?? x.score ?? 0) * 0.45 +
          (x.trust ?? 70) * 0.30 +
          (x.revenuePotential ?? 60) * 0.15 +
          (x.freshness ?? 70) * 0.10
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    grid.innerHTML = "";
    empty.style.display = approved.length ? "none" : "block";

    approved.forEach(ad => {
      const link = document.createElement("a");
      link.className = "ad";
      link.href = ad.url;
      link.target = "_blank";
      link.rel = "sponsored nofollow noopener";
      link.innerHTML = `
        <small>PR / ${ad.category}</small>
        <h3>${ad.name}</h3>
        <p>${ad.description ?? ""}</p>
      `;
      grid.appendChild(link);
    });
  } catch {
    empty.textContent = "広告在庫を読み込めませんでした。";
  }
}

renderAds();

document.querySelector("#contactForm")?.addEventListener("submit", event => {
  event.preventDefault();

  const problem = document.querySelector("#problem").value.trim();
  const budget = document.querySelector("#budget").value;

  const text =
`JIZO WORKS 相談

困っていること：
${problem}

予算の目安：
${budget}`;

  const out = document.querySelector("#contactResult");
  out.classList.remove("hidden");
  out.innerHTML = `
    <strong>相談文を作成しました</strong>
    <textarea id="generatedContact" readonly>${text}</textarea>
    <button id="copyContact" class="ghost">コピーする</button>
    <small>現時点では相談文生成のみです。正式な公開連絡先は別途設定します。</small>
  `;

  document.querySelector("#copyContact")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(text);
    document.querySelector("#copyContact").textContent = "コピーしました";
  });
});
