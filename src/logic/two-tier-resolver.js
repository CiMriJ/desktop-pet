// userHas(ext)=>bool, builtinHas(ext)=>bool；ext 取 'png' | 'gif'
// 返回 {type:'image',source:'user'|'builtin',ext} 或 {type:'svg',pet,state}
export function resolveTwoTier(pet, state, userHas, builtinHas) {
  if (userHas('png')) return { type: 'image', source: 'user', ext: 'png' };
  if (userHas('gif')) return { type: 'image', source: 'user', ext: 'gif' };
  if (builtinHas('png')) return { type: 'image', source: 'builtin', ext: 'png' };
  if (builtinHas('gif')) return { type: 'image', source: 'builtin', ext: 'gif' };
  return { type: 'svg', pet, state };
}
