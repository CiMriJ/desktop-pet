const DRAG_THRESHOLD = 3;

// 拖拽只负责「按下 / 真的移动了 / 松手」三个阶段：
// 窗口位置由主进程按系统光标位置跟随，渲染层不再上报坐标。
// 按下就开始跟随（而不是等移动超过阈值），避免「按下去没反应」。
// 单击也在这里判定：pointerdown 的 preventDefault 会让浏览器不再派发 click，
// 所以按「松手时有没有移动过」来区分点击和拖拽。
export function attachDrag(el, { onBegin, onMoveStart, onTap, onEnd, isLocked, onLocked }) {
  let pressed = false;
  let moved = false;
  let startX = 0;
  let startY = 0;

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (isLocked && isLocked()) {
      if (onLocked) onLocked();
      return;
    }
    pressed = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // 捕获失败也不影响：窗口会跟着光标走，指针始终留在宠物上
    }
    e.preventDefault();
    if (onBegin) onBegin();
  });

  el.addEventListener('pointermove', (e) => {
    if (!pressed) return;
    // 松手事件丢了（切窗口/系统拦截）时兜底收尾
    if (e.buttons === 0) {
      finish();
      return;
    }
    if (moved) return;
    if (Math.abs(e.clientX - startX) < DRAG_THRESHOLD
        && Math.abs(e.clientY - startY) < DRAG_THRESHOLD) return;
    moved = true;
    el.classList.add('dragging');
    if (onMoveStart) onMoveStart();
  });

  function finish() {
    if (!pressed) return;
    pressed = false;
    el.classList.remove('dragging');
    if (!moved && onTap) onTap();
    if (onEnd) onEnd(moved);
  }

  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', finish);
  el.addEventListener('lostpointercapture', finish);
  window.addEventListener('mouseup', finish);
  window.addEventListener('blur', finish);

  return {
    isDragging: () => moved,
  };
}
