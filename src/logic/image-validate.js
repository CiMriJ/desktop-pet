const ALLOWED = new Set(['png', 'gif']);
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function extOf(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

export function isAllowedImage(filename) {
  return ALLOWED.has(extOf(filename));
}

// 仅凭扩展名会把改名的坏文件放进来，渲染出来就是一片空白。
// 这里校验文件头：PNG 签名 / GIF87a / GIF89a。
export function sniffImage(buffer) {
  if (!buffer || buffer.length < 8) return null;
  let png = true;
  for (let i = 0; i < PNG_SIG.length; i += 1) {
    if (buffer[i] !== PNG_SIG[i]) { png = false; break; }
  }
  if (png) return 'png';
  const head = String.fromCharCode(...buffer.subarray(0, 6));
  if (head === 'GIF87a' || head === 'GIF89a') return 'gif';
  return null;
}
