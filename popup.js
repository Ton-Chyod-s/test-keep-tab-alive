const LABELS = {
  visibilityState: "visibilityState / hidden",
  visibilityChange: "visibilitychange event",
  hasFocus: "hasFocus()",
  blur: "blur / focusout",
  setTimeout: "setTimeout throttling",
  setInterval: "setInterval throttling",
  requestAnimationFrame: "requestAnimationFrame",
  activitySimulation: "mousemove / keydown simulado",
};

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  chrome.storage.local.get(["blocks", "activeTabs"], ({ blocks, activeTabs }) => {
    const ids = activeTabs || [];
    const isActive = ids.includes(tab.id);
    const container = document.getElementById("blocks");
    const btn = document.getElementById("toggleBtn");
    const status = document.getElementById("status");

    Object.keys(LABELS).forEach(key => {
      const val = blocks[key] !== false && blocks[key] !== undefined;
      const item = document.createElement("div");
      item.className = `item ${val ? "active" : "inactive"}`;
      item.innerHTML = `
        <span>${LABELS[key]}</span>
        <span class="badge ${val ? "on" : "off"}">${val ? "ON" : "OFF"}</span>
      `;
      item.addEventListener("click", () => {
        blocks[key] = !blocks[key];
        chrome.storage.local.set({ blocks });
        item.className = `item ${blocks[key] ? "active" : "inactive"}`;
        item.querySelector(".badge").className = `badge ${blocks[key] ? "on" : "off"}`;
        item.querySelector(".badge").textContent = blocks[key] ? "ON" : "OFF";
      });
      container.appendChild(item);
    });

    // Atualiza botão com estado real
    const updateBtn = (active) => {
      btn.textContent = active ? "🛑 Desativar nesta aba" : "⚡ Ativar nesta aba";
      btn.className = `toggle-btn ${active ? "on" : "off"}`;
      status.textContent = active ? "✅ Ativo nesta aba" : "Inativo";
    };

    updateBtn(isActive);

    btn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "TOGGLE_TAB", tabId: tab.id, url: tab.url }, () => {
        updateBtn(!isActive);
      });
      window.close();
    });
  });
});

