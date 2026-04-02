const activeTabs = new Set();

const BLOCKS = {
  visibilityState: { label: "visibilityState / hidden", default: true },
  visibilityChange: { label: "visibilitychange event", default: true },
  hasFocus: { label: "hasFocus()", default: true },
  blur: { label: "blur / focusout", default: true },
  setTimeout: { label: "setTimeout throttling", default: true },
  setInterval: { label: "setInterval throttling", default: true },
  requestAnimationFrame: { label: "requestAnimationFrame", default: true },
  activitySimulation: { label: "mousemove / keydown simulado", default: true },
};

function initBlocks() {
  chrome.storage.local.get("blocks", ({ blocks }) => {
    if (!blocks || Object.keys(blocks).length !== Object.keys(BLOCKS).length) {
      const defaults = {};
      Object.keys(BLOCKS).forEach(key => { defaults[key] = BLOCKS[key].default; });
      chrome.storage.local.set({ blocks: defaults });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  initBlocks();
  chrome.storage.local.set({ activeTabs: [] });
});

chrome.storage.local.set({ activeTabs: [] });
initBlocks();

function isRestrictedUrl(url) {
  if (!url) return true;
  return url.startsWith('chrome://') || url.startsWith('brave://') ||
         url.startsWith('chrome-extension://') || url.startsWith('about:');
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "TOGGLE_TAB") return;
  const tabId = msg.tabId;
  if (isRestrictedUrl(msg.url)) return;

  if (activeTabs.has(tabId)) {
    activeTabs.delete(tabId);
    chrome.action.setBadgeText({ text: "", tabId });

    chrome.storage.local.get("activeTabs", ({ activeTabs: ids }) => {
      chrome.storage.local.set({ activeTabs: (ids || []).filter(id => id !== tabId) });
    });

    chrome.scripting.executeScript({
      target: { tabId }, world: "MAIN",
      func: () => {
        window.__keepTabAlive = false;
        if (window.__activityInterval != null) {
          if (window.__nativeClearInterval) {
            window.__nativeClearInterval(window.__activityInterval);
          } else {
            clearInterval(window.__activityInterval);
          }
          window.__activityInterval = null;
        }
        console.log('%c[Keep Tab Alive] DESATIVADO ❌', 'color: red; font-weight: bold;');
      }
    });

  } else {
    activeTabs.add(tabId);
    chrome.action.setBadgeText({ text: "ON", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#00AA00", tabId });

    chrome.storage.local.get("activeTabs", ({ activeTabs: ids }) => {
      const updated = ids || [];
      if (!updated.includes(tabId)) updated.push(tabId);
      chrome.storage.local.set({ activeTabs: updated });
    });

    chrome.storage.local.get("blocks", ({ blocks }) => {
      chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: (blocks) => {
          window.__keepTabAlive = true;

          // Salva nativos apenas uma vez para não sobrescrever nas reativações
          if (!window.__nativeSetInterval) window.__nativeSetInterval = window.setInterval.bind(window);
          if (!window.__nativeSetTimeout) window.__nativeSetTimeout = window.setTimeout.bind(window);
          if (!window.__nativeClearInterval) window.__nativeClearInterval = window.clearInterval.bind(window);

          const _nativeSetInterval = window.__nativeSetInterval;
          const _nativeSetTimeout = window.__nativeSetTimeout;
          const _nativeClearInterval = window.__nativeClearInterval;

          if (blocks.blur) {
            if (!window.__blurPatched) {
              window.__blurPatched = true;

              const _addEventListener = window.addEventListener.bind(window);
              window.addEventListener = function(type, fn, opts) {
                if (!window.__keepTabAlive) return _addEventListener(type, fn, opts);
                if (type === 'blur' || type === 'focusout') {
                  console.log(`%c[Keep Tab Alive] 🛡️ Listener de "${type}" bloqueado`, 'color: orange; font-weight: bold;');
                  return;
                }
                return _addEventListener(type, fn, opts);
              };

              const _origAdd = EventTarget.prototype.addEventListener;
              EventTarget.prototype.addEventListener = function(type, fn, opts) {
                if (window.__keepTabAlive && (type === 'blur' || type === 'focusout')) {
                  console.log(`%c[Keep Tab Alive] 🛡️ EventTarget listener de "${type}" bloqueado`, 'color: orange; font-weight: bold;');
                  return;
                }
                return _origAdd.call(this, type, fn, opts);
              };

              window.addEventListener('blur', (e) => {
                if (!window.__keepTabAlive) return;
                e.stopImmediatePropagation();
                console.log('%c[Keep Tab Alive] 🛡️ blur interceptado', 'color: orange; font-weight: bold;');
              }, true);
              window.addEventListener('focusout', (e) => {
                if (!window.__keepTabAlive) return;
                e.stopImmediatePropagation();
                console.log('%c[Keep Tab Alive] 🛡️ focusout interceptado', 'color: orange; font-weight: bold;');
              }, true);
            }
          }

          if (blocks.visibilityState && !window.__visibilityPatched) {
            window.__visibilityPatched = true;
            try {
              Object.defineProperty(Document.prototype, 'visibilityState', {
                get: () => {
                  if (!window.__keepTabAlive) return 'hidden';
                  return 'visible';
                }, configurable: true
              });
              Object.defineProperty(Document.prototype, 'hidden', {
                get: () => {
                  if (!window.__keepTabAlive) return true;
                  return false;
                }, configurable: true
              });
            } catch (e) {}
          }

          if (blocks.visibilityChange && !window.__visibilityChangePatched) {
            window.__visibilityChangePatched = true;
            document.addEventListener('visibilitychange', (e) => {
              if (!window.__keepTabAlive) return;
              e.stopImmediatePropagation();
              console.log('%c[Keep Tab Alive] 🛡️ visibilitychange interceptado', 'color: orange');
            }, true);
          }

          if (blocks.hasFocus && !window.__hasFocusPatched) {
            window.__hasFocusPatched = true;
            try {
              Object.defineProperty(Document.prototype, 'hasFocus', {
                value: () => {
                  if (!window.__keepTabAlive) return false;
                  return true;
                }, configurable: true
              });
            } catch (e) {}
          }

          if (blocks.setTimeout && !window.__setTimeoutPatched) {
            window.__setTimeoutPatched = true;
            window.setTimeout = function(fn, delay, ...args) {
              if (!window.__keepTabAlive) return _nativeSetTimeout(fn, delay, ...args);
              if (delay > 1000) console.log(`%c[Keep Tab Alive] 🛡️ setTimeout bloqueado (${delay}ms → 1000ms)`, 'color: orange');
              return _nativeSetTimeout(fn, Math.min(delay, 1000), ...args);
            };
          }

          if (blocks.setInterval && !window.__setIntervalPatched) {
            window.__setIntervalPatched = true;
            window.setInterval = function(fn, delay, ...args) {
              if (!window.__keepTabAlive) return _nativeSetInterval(fn, delay, ...args);
              if (delay > 1000) console.log(`%c[Keep Tab Alive] 🛡️ setInterval bloqueado (${delay}ms → 1000ms)`, 'color: orange');
              return _nativeSetInterval(fn, Math.min(delay, 1000), ...args);
            };
          }

          if (blocks.requestAnimationFrame && !window.__rafPatched) {
            window.__rafPatched = true;
            window.requestAnimationFrame = function(cb) {
              return _nativeSetTimeout(cb, 16);
            };
          }

          if (blocks.activitySimulation) {
            if (window.__activityInterval != null) {
              _nativeClearInterval(window.__activityInterval);
              window.__activityInterval = null;
            }
            window.__activityInterval = _nativeSetInterval(() => {
              if (!window.__keepTabAlive) {
                _nativeClearInterval(window.__activityInterval);
                window.__activityInterval = null;
                return;
              }
              document.dispatchEvent(new MouseEvent('mousemove', {
                bubbles: true, cancelable: true,
                clientX: Math.random() * window.innerWidth,
                clientY: Math.random() * window.innerHeight
              }));
              document.dispatchEvent(new KeyboardEvent('keydown', {
                bubbles: true, cancelable: true,
                key: 'Shift', keyCode: 16
              }));
              console.log('%c[Keep Tab Alive] 🛡️ Atividade simulada (mousemove + keydown)', 'color: orange');
            }, 30000);
          }

          console.log('%c[Keep Tab Alive] ATIVADO ✅', 'color: green; font-weight: bold;');
        },
        args: [blocks]
      });
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
  chrome.storage.local.get("activeTabs", ({ activeTabs: ids }) => {
    chrome.storage.local.set({ activeTabs: (ids || []).filter(id => id !== tabId) });
  });
});