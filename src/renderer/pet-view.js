// 一二：白身、黑耳、黑脚、黑领结、黑豆眼
function yierSVG() {
  return `
  <svg viewBox="0 0 120 120" width="120" height="120">
    <ellipse cx="28" cy="34" rx="13" ry="13" fill="#1c1c1c"/>
    <ellipse cx="92" cy="34" rx="13" ry="13" fill="#1c1c1c"/>
    <ellipse cx="60" cy="62" rx="40" ry="38" fill="#fdfdfd" stroke="#e6e6e6" stroke-width="2"/>
    <ellipse cx="46" cy="58" rx="6" ry="7" fill="#1c1c1c"/>
    <ellipse cx="74" cy="58" rx="6" ry="7" fill="#1c1c1c"/>
    <circle cx="48" cy="56" r="1.8" fill="#fff"/>
    <circle cx="76" cy="56" r="1.8" fill="#fff"/>
    <ellipse cx="60" cy="70" rx="5" ry="3.4" fill="#1c1c1c"/>
    <path d="M52 78 Q60 84 68 78" stroke="#1c1c1c" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="40" cy="66" rx="6" ry="4" fill="#ffc2cf" opacity="0.7"/>
    <ellipse cx="80" cy="66" rx="6" ry="4" fill="#ffc2cf" opacity="0.7"/>
    <path d="M50 96 L46 104 L54 104 Z" fill="#1c1c1c"/>
    <path d="M70 96 L66 104 L74 104 Z" fill="#1c1c1c"/>
    <path d="M54 90 L60 86 L66 90 L62 94 L58 94 Z" fill="#1c1c1c"/>
    <circle cx="60" cy="90" r="2.6" fill="#1c1c1c"/>
  </svg>`;
}

// 布布：棕身、圆耳、憨脸
function bubuSVG() {
  return `
  <svg viewBox="0 0 120 120" width="120" height="120">
    <ellipse cx="30" cy="36" rx="13" ry="13" fill="#a9744f"/>
    <ellipse cx="90" cy="36" rx="13" ry="13" fill="#a9744f"/>
    <ellipse cx="30" cy="36" rx="6" ry="6" fill="#caa078"/>
    <ellipse cx="90" cy="36" rx="6" ry="6" fill="#caa078"/>
    <ellipse cx="60" cy="64" rx="42" ry="40" fill="#bd855e" stroke="#a9744f" stroke-width="2"/>
    <ellipse cx="60" cy="74" rx="22" ry="18" fill="#e7c7a8"/>
    <ellipse cx="47" cy="60" rx="5.5" ry="6.5" fill="#3a2415"/>
    <ellipse cx="73" cy="60" rx="5.5" ry="6.5" fill="#3a2415"/>
    <circle cx="49" cy="58" r="1.6" fill="#fff"/>
    <circle cx="75" cy="58" r="1.6" fill="#fff"/>
    <ellipse cx="60" cy="70" rx="5.5" ry="3.8" fill="#3a2415"/>
    <path d="M52 80 Q60 86 68 80" stroke="#3a2415" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="42" cy="70" rx="6" ry="4" fill="#e89a8a" opacity="0.6"/>
    <ellipse cx="78" cy="70" rx="6" ry="4" fill="#e89a8a" opacity="0.6"/>
    <ellipse cx="50" cy="100" rx="7" ry="5" fill="#a9744f"/>
    <ellipse cx="70" cy="100" rx="7" ry="5" fill="#a9744f"/>
  </svg>`;
}

const SVG_MAP = { yier: yierSVG, bubu: bubuSVG };

// asset 由主进程清单解析：type='image' 时 path 已确认存在；否则用矢量兜底。
export function renderPetInner(asset) {
  if (asset && asset.type === 'image') {
    return `<div class="body-wrap"><img src="${asset.path}" alt="pet" draggable="false"/></div>`;
  }
  const pet = asset ? asset.pet : 'yier';
  const svgFn = SVG_MAP[pet] || yierSVG;
  return `<div class="body-wrap">${svgFn()}</div>`;
}

export function buildPetElement(pet) {
  const el = document.createElement('div');
  el.className = 'pet';
  el.dataset.pet = pet;
  el.dataset.state = 'idle';
  el.innerHTML = `
    <div class="badge hidden"><span class="phase"></span><span class="time"></span><i class="bar"><b></b></i></div>
    <div class="clock"></div>
    <div class="bubble"></div>
    <span class="z">z</span>
    <div class="fx"></div>
    <div class="inner"></div>
  `;
  return el;
}
