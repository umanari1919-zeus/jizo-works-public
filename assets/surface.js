const JIZO = (() => {
  const STORE="jizo_public_events_v1";

  function capture(type,payload={}) {
    const now=new Date().toISOString();
    const url=new URL(location.href);
    const event={
      type,
      at:now,
      path:location.pathname,
      ref:document.referrer||"",
      utm_source:url.searchParams.get("utm_source")||"",
      utm_medium:url.searchParams.get("utm_medium")||"",
      utm_campaign:url.searchParams.get("utm_campaign")||"",
      ...payload
    };
    const rows=JSON.parse(localStorage.getItem(STORE)||"[]");
    rows.push(event);
    localStorage.setItem(STORE,JSON.stringify(rows.slice(-500)));
  }

  function scoreOffer(x) {
    return (x.intent||0)*0.45+(x.trust||0)*0.30+(x.margin||0)*0.15+(x.freshness||0)*0.10;
  }

  async function loadOffers(topic) {
    const rows=await fetch("../../data/offers.json",{cache:"no-store"}).then(r=>r.json());
    return rows
      .filter(x=>x.status==="approved")
      .filter(x=>!topic||x.topic===topic)
      .map(x=>({...x,score:scoreOffer(x)}))
      .sort((a,b)=>b.score-a.score);
  }

  document.addEventListener("click", event => {
    const target=event.target.closest?.("[data-track]");
    if(target) capture("click",{target:target.dataset.track});
  });

  function exportEvents() {
    const blob=new Blob([localStorage.getItem(STORE)||"[]"],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="jizo-public-events.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  capture("page_view");
  return {capture,loadOffers,exportEvents};
})();
window.JIZO=JIZO;
