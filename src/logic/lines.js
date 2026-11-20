export const LINES = {
  yier: {
    water: ['该喝水啦，记得照顾好自己~', '停一下，喝口水吧', '水杯空啦？去接一杯吧'],
    rest: ['坐久咯，起来动动吧~', '眼睛累不累？歇会儿', '伸个懒腰，放松一下~'],
    chime: ['{hour} 点啦，时间过得真快~', '现在是 {hour} 点咯', '叮~ {hour} 点整'],
    poke: ['呀！', '嘿嘿~', '在的在的', '怎么啦？', '戳我做什么呀~'],
    feed: ['谢谢！好好吃~', '啊呜一口，幸福！', '还有吗还有吗？'],
    sleep: ['困了，眯一会儿…', '晚安，别熬太晚哦', '呼…呼…'],
    wake: ['我回来啦！', '睡醒啦，继续陪你~', '唔…伸个懒腰'],
    idle: ['今天也要加油呀', '偶尔看看远处吧', '我就在这儿陪着你', '要不要摸摸我？', '记得保存文件哦'],
    focusStart: ['开始专注吧，我陪着你！', '这 {minutes} 分钟交给正事~', '冲鸭，我盯着你呢'],
    focusWorkEnd: ['完成一轮啦，快起来休息！', '辛苦啦！休息 {minutes} 分钟吧', '叮！该放松一下了'],
    breakEnd: ['休息结束，继续加油~', '满血复活，再来一轮？', '回来啦？我准备好啦'],
    love: ['越来越喜欢你了~', '和你在一起真开心', '我们是最好的朋友！'],
    morning: ['早上好呀，今天也一起努力~', '早！先喝一杯水吧'],
    noon: ['中午啦，记得吃饭哦', '午休一下，下午才有精神'],
    afternoon: ['下午好，来点水吧', '再坚持一下，快下班啦'],
    evening: ['晚上好，今天辛苦啦', '傍晚了，起来走两步吧'],
    night: ['这么晚还没睡呀？', '夜深了，早点休息哦', '我陪你到你想睡为止'],
  },
  bubu: {
    water: ['布布提醒你：喝水水！', '咕咚咕咚，喝水啦！', '渴不渴呀，喝点水嘛'],
    rest: ['歇会儿嘛，别累着！', '动一动，布布陪你！', '起来走两步呀~'],
    chime: ['{hour} 点喽！', '布布报时：{hour} 点！', '当当~ {hour} 点啦'],
    poke: ['唔？', '哈哈痒~', '布布在！', '做什么嘛~', '嘿！'],
    feed: ['哇！是给我的吗！', '吧唧吧唧，好次！', '布布最喜欢你了！'],
    sleep: ['布布困啦…', '先睡一小会儿…', '呼噜…呼噜…'],
    wake: ['布布醒啦！', '嗯？你回来啦！', '睡饱啦，抱抱！'],
    idle: ['布布在陪你哦', '摸摸头会更开心', '要一起玩吗？', '别太累啦', '喝口水嘛'],
    focusStart: ['专注时间到！布布不吵你', '加油加油，{minutes} 分钟而已', '布布在旁边守着你'],
    focusWorkEnd: ['结束啦！快休息一下！', '布布给你鼓掌！休息 {minutes} 分钟', '起来伸个懒腰嘛'],
    breakEnd: ['休息好啦？再来一轮！', '布布充满电啦！', '继续继续，你可以的'],
    love: ['布布最喜欢你啦！', '嘿嘿，贴贴~', '我们永远是好伙伴！'],
    morning: ['早安！布布等你很久啦', '早上好，先吃点东西嘛'],
    noon: ['吃饭时间到！', '午休午休，布布也要睡'],
    afternoon: ['下午也要加油哦', '来杯水，继续冲'],
    evening: ['晚上好！今天辛苦啦', '下班啦？陪布布玩会儿'],
    night: ['还不睡吗？布布困了…', '熬夜会变丑的哦', '早点睡，明天见'],
  },
};

export function pickLine(pet, kind, rng = Math.random, vars = {}) {
  const bank = LINES[pet]?.[kind];
  if (!bank || bank.length === 0) return '';
  const idx = Math.min(bank.length - 1, Math.floor(rng() * bank.length));
  let line = bank[idx];
  for (const [key, value] of Object.entries(vars)) {
    line = line.replaceAll(`{${key}}`, String(value));
  }
  return line;
}

export function greetingKind(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

export function greetingLine(pet, date, rng = Math.random) {
  return pickLine(pet, greetingKind(date), rng);
}
