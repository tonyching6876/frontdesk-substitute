function loadPublicRoster(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(endpoint);
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) throw new Error();
    } catch (_) { reject(new Error('班表同步服務尚未設定')); return; }
    const callback = 'roster_' + crypto.randomUUID().replaceAll('-', '');
    const script = document.createElement('script');
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      script.remove();
      // A slow response can arrive after timeout; ignore it without restoring stale data.
      window[callback] = () => {};
      setTimeout(() => { delete window[callback]; }, 60000);
    };
    const finish = (error, data) => {
      if (settled) return;
      settled = true; cleanup();
      if (error) reject(error); else resolve(data);
    };
    window[callback] = data => {
      if (!data || data.ok !== true || !data.roster) { finish(new Error('雲端班表讀取失敗')); return; }
      const r = data.roster;
      if (!Number.isInteger(r.year) || !Number.isInteger(r.month) || r.month < 1 || r.month > 12 || r.maxDays !== 5 || !Array.isArray(r.people) || !r.people.length || !Array.isArray(r.warnings) || !Number.isFinite(Date.parse(r.fetchedAt)) || typeof r.sourceSheet !== 'string' || !r.people.every(p => typeof p.name === 'string' && typeof p.role === 'string' && p.days && typeof p.days === 'object')) {
        finish(new Error('班表資料格式不正確')); return;
      }
      finish(null, r);
    };
    const timer = setTimeout(() => finish(new Error('讀取逾時，請稍後重新更新')), options.timeoutMs || 30000);
    script.onerror = () => finish(new Error('無法連線至班表服務'));
    url.searchParams.set('callback', callback);
    url.searchParams.set('_', Date.now().toString());
    script.src = url.href;
    document.head.append(script);
  });
}
