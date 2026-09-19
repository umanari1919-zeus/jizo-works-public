window.JIZOMoney = (() => {
  async function config(){
    return fetch("../data/monetization.json",{cache:"no-store"}).then(r=>r.json());
  }

  function score(x,w){
    return (x.intent||0)*w.intent +
           (x.trust||0)*w.trust +
           (x.margin||0)*w.revenue +
           (x.freshness||0)*w.freshness +
           (x.fit||70)*w.fit;
  }

  async function offers({topic=null,base="../"}={}){
    const [rows,cfg]=await Promise.all([
      fetch(`${base}data/offers.json`,{cache:"no-store"}).then(r=>r.json()),
      fetch(`${base}data/monetization.json`,{cache:"no-store"}).then(r=>r.json())
    ]);

    return rows
      .filter(x=>!cfg.policy.approved_only || x.status==="approved")
      .filter(x=>!topic || x.topic===topic)
      .filter(x=>!cfg.policy.require_disclosure || !!x.disclosure)
      .map(x=>({...x,score:score(x,cfg.weights)}))
      .sort((a,b)=>b.score-a.score)
      .slice(0,cfg.policy.max_offers_per_surface);
  }

  function render(container,rows){
    container.innerHTML="";
    rows.forEach(x=>{
      const a=document.createElement("a");
      a.className="ad";
      a.href=x.url;
      a.target="_blank";
      a.rel="sponsored nofollow noopener";
      a.dataset.track=`money:${x.id}`;
      a.innerHTML=`<small>${x.disclosure} / ${x.topic}</small><h3>${x.name}</h3><p>${x.description||x.kind}</p>`;
      container.appendChild(a);
    });
  }

  return {offers,render};
})();
