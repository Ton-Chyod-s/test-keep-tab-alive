// Injeta o chat flutuante
(function() {
  if (document.getElementById('__kta_chat')) return;

  const style = document.createElement('style');
  style.textContent = `
    #__kta_btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      background: #00cc44;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      z-index: 999999;
      font-size: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    #__kta_panel {
      display: none;
      position: fixed;
      bottom: 75px;
      right: 20px;
      width: 320px;
      max-height: 480px;
      background: #1a1a1a;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      z-index: 999999;
      font-family: sans-serif;
      overflow: hidden;
      flex-direction: column;
    }
    #__kta_panel.open { display: flex; }
    #__kta_header {
      padding: 10px 14px;
      background: #222;
      font-size: 12px;
      color: #aaa;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #__kta_header span { color: #00cc44; font-weight: bold; }
    #__kta_close { background: none; border: none; color: #aaa; cursor: pointer; font-size: 16px; }
    #__kta_messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 320px;
    }
    .kta_msg {
      font-size: 12px;
      line-height: 1.5;
      padding: 8px 10px;
      border-radius: 8px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .kta_msg.user { background: #2a3a2a; color: #00cc44; align-self: flex-end; max-width: 85%; }
    .kta_msg.ai { background: #252525; color: #eee; align-self: flex-start; max-width: 95%; }
    .kta_msg.loading { color: #888; font-style: italic; }
    #__kta_footer { padding: 10px; background: #222; display: flex; gap: 6px; align-items: center; }
    #__kta_input {
      flex: 1;
      background: #333;
      border: none;
      border-radius: 6px;
      padding: 7px 10px;
      color: #eee;
      font-size: 12px;
      font-family: sans-serif;
      resize: none;
      outline: none;
    }
    #__kta_send {
      background: #00cc44;
      border: none;
      border-radius: 6px;
      padding: 7px 10px;
      color: #000;
      font-weight: bold;
      cursor: pointer;
      font-size: 12px;
    }
    #__kta_screenshot {
      background: #333;
      border: none;
      border-radius: 6px;
      padding: 7px 10px;
      color: #eee;
      cursor: pointer;
      font-size: 14px;
    }
    #__kta_overlay {
      display: none;
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0,200,68,0.08);
      border: 2px dashed #00cc44;
      z-index: 9999998;
      cursor: crosshair;
    }
    #__kta_selection {
      position: fixed;
      border: 2px solid #00cc44;
      background: rgba(0,200,68,0.1);
      z-index: 9999999;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  // Botão flutuante
  const btn = document.createElement('button');
  btn.id = '__kta_btn';
  btn.textContent = '🛡️';
  document.body.appendChild(btn);

  // Painel
  const panel = document.createElement('div');
  panel.id = '__kta_panel';
  panel.innerHTML = `
    <div id="__kta_header">
      <span>🛡️ Keep Tab Alive — IA</span>
      <button id="__kta_close">✕</button>
    </div>
    <div id="__kta_messages"></div>
    <div id="__kta_footer">
      <button id="__kta_screenshot" title="Capturar tela">📷</button>
      <textarea id="__kta_input" rows="1" placeholder="Digite sua pergunta..."></textarea>
      <button id="__kta_send">➤</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Overlay de seleção
  const overlay = document.createElement('div');
  overlay.id = '__kta_overlay';
  document.body.appendChild(overlay);
  const selection = document.createElement('div');
  selection.id = '__kta_selection';
  document.body.appendChild(selection);

  // Toggle painel
  btn.addEventListener('click', () => panel.classList.toggle('open'));
  document.getElementById('__kta_close').addEventListener('click', () => panel.classList.remove('open'));

  function addMessage(text, type) {
    const msg = document.createElement('div');
    msg.className = 'kta_msg ' + type;
    msg.textContent = text;
    const messages = document.getElementById('__kta_messages');
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  async function askAI(text, imageBase64 = null) {
    const loading = addMessage('Pensando...', 'loading');

    const content = [];
    if (imageBase64) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } });
    }
    content.push({ type: 'text', text });

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content }]
        })
      });
      const data = await res.json();
      loading.remove();
      const reply = data.content?.[0]?.text || 'Sem resposta.';
      addMessage(reply, 'ai');
    } catch (e) {
      loading.remove();
      addMessage('Erro ao conectar com a IA.', 'ai');
    }
  }

  // Enviar mensagem
  document.getElementById('__kta_send').addEventListener('click', () => {
    const input = document.getElementById('__kta_input');
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    askAI(text);
  });

  document.getElementById('__kta_input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('__kta_send').click();
    }
  });

  // Screenshot via seleção
  let isSelecting = false;
  let startX, startY;

  document.getElementById('__kta_screenshot').addEventListener('click', () => {
    panel.classList.remove('open');
    overlay.style.display = 'block';
    isSelecting = false;
  });

  overlay.addEventListener('mousedown', (e) => {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    selection.style.left = startX + 'px';
    selection.style.top = startY + 'px';
    selection.style.width = '0';
    selection.style.height = '0';
    selection.style.display = 'block';
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    const w = e.clientX - startX;
    const h = e.clientY - startY;
    selection.style.left = (w < 0 ? e.clientX : startX) + 'px';
    selection.style.top = (h < 0 ? e.clientY : startY) + 'px';
    selection.style.width = Math.abs(w) + 'px';
    selection.style.height = Math.abs(h) + 'px';
  });

  overlay.addEventListener('mouseup', async (e) => {
    isSelecting = false;
    overlay.style.display = 'none';
    selection.style.display = 'none';

    const x = parseInt(selection.style.left);
    const y = parseInt(selection.style.top);
    const w = parseInt(selection.style.width);
    const h = parseInt(selection.style.height);

    if (w < 10 || h < 10) return;

    // Captura via canvas
    try {
      const video = document.createElement('video');
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      const scaleX = video.videoWidth / window.innerWidth;
      const scaleY = video.videoHeight / window.innerHeight;
      ctx.drawImage(video, x * scaleX, y * scaleY, w * scaleX, h * scaleY, 0, 0, w, h);
      stream.getTracks().forEach(t => t.stop());

      const base64 = canvas.toDataURL('image/png').split(',')[1];
      panel.classList.add('open');
      addMessage('📷 Imagem capturada', 'user');
      askAI('O que está escrito nessa imagem? Responda a pergunta se houver uma.', base64);
    } catch (err) {
      panel.classList.add('open');
      addMessage('Erro ao capturar tela. Permita o acesso à tela.', 'ai');
    }
  });

    // Alt+1 → abre/fecha chat
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      panel.classList.toggle('open');
    }
  });

  // Alt+2 → captura de tela
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === '2') {
      e.preventDefault();
      document.getElementById('__kta_screenshot').click();
    }
  });
})();