window.__keepTabAlive = false;

const _origAdd = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function(type, fn, opts) {
  if (window.__keepTabAlive && (type === 'blur' || type === 'focusout')) {
    console.log(`%c[Keep Tab Alive] 🛡️ Listener de "${type}" bloqueado`, 'color: orange; font-weight: bold;');
    return;
  }
  return _origAdd.call(this, type, fn, opts);
};