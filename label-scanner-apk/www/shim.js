// Replaces Electron preload bridge (window.api) with in-browser OCR + native-HTTP lookups.
(function () {
  const base = location.origin + '/vendor/tess';
  let worker = null, chain = Promise.resolve();
  async function getWorker() {
    if (worker) return worker;
    worker = await Tesseract.createWorker('eng', 1, {
      workerPath: base + '/worker.min.js', corePath: base + '/core', langPath: base + '/lang',
      workerBlobURL: false, cacheMethod: 'none', errorHandler: e => console.error('[ocr]', e)
    });
    return worker;
  }
  async function reset() { const w = worker; worker = null; if (w) { try { await w.terminate(); } catch (e) {} } }
  function scanImage(dataUrl) {
    const run = async () => {
      let t;
      try {
        const w = await getWorker();
        const limit = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('OCR timed out')), 90000); });
        const { data } = await Promise.race([w.recognize(dataUrl), limit]);
        return data.text;
      } catch (e) { await reset(); throw e; } finally { clearTimeout(t); }
    };
    const p = chain.then(run, run); chain = p.catch(() => {}); return p;
  }
  window.api = {
    scanImage,
    lookupBarcode: c => window.__lookup.fetchProduct(c),
    findSimilar: t => window.__lookup.findSimilar(t)
  };
})();
