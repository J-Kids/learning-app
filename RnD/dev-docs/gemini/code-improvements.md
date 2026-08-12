# Code Improvement Suggestions

> Improvements to existing code quality, reliability, and correctness.
> No new features — current code fixes only.

---

## Summary

| # | File | Issue | Impact |
|---|------|-------|--------|
| 1 | `image-utils.js` | Blob URL never revoked | 🔴 Memory leak |
| 2 | `scan-view.js` | Preview Blob URLs never revoked | 🔴 Memory leak |
| 3 | `app.js` + `scan-view.js` | Duplicate camera event listeners | 🟡 Double-fire bugs |
| 4 | `gemini-engine.js` | Magic number `10` in `isConfigured()` | 🟢 Readability |
| 5 | `model-discovery.js` | No caching for model discovery | 🟡 Unnecessary network calls |
| 6 | `scan-view.js` | Manual base64 decode (fragile) | 🟡 Reliability |
| 7 | `translator.js` | Unbounded translation cache | 🟡 Memory growth |
| 8 | `scan-view.js` | Progress bar not reset on retry | 🟢 UX polish |

---

## 1. 🔴 `image-utils.js` — Blob URL never revoked (Memory Leak)

**File**: `src/services/gemini/image-utils.js` (line 67)  
**Also affects**: `src/services/ocr/ocr-engine.js` (line 93)

When a `File` or `Blob` is passed, `URL.createObjectURL()` is called but `URL.revokeObjectURL()` is **never called**. This leaks memory on every scan.

```diff
- img.src = URL.createObjectURL(imgSource);
+ const objectUrl = URL.createObjectURL(imgSource);
+ img.src = objectUrl;
+ img.onload = () => { URL.revokeObjectURL(objectUrl); processImg(); };
```

Same fix needed in `ocr-engine.js` line 93:
```diff
- img.src = typeof imageSrc === 'string' ? imageSrc : URL.createObjectURL(imageSrc);
+ const objUrl = typeof imageSrc === 'string' ? imageSrc : URL.createObjectURL(imageSrc);
+ img.src = objUrl;
+ img.onload = () => { if (objUrl.startsWith('blob:')) URL.revokeObjectURL(objUrl); res(); };
```

---

## 2. 🔴 `scan-view.js` — Preview Blob URLs never revoked (Memory Leak)

**File**: `src/views/scan-view.js` (line 102)

`URL.createObjectURL(file)` is called for every preview thumbnail in `renderImagePreviews()` but the old URLs are **never revoked** before `innerHTML` is cleared, leaking memory on each re-render.

```diff
  renderImagePreviews() {
+   // Revoke old blob URLs before clearing to prevent memory leaks
+   this.dom.imagePreviewsGrid.querySelectorAll('img').forEach(img => URL.revokeObjectURL(img.src));
    this.dom.imagePreviewsGrid.innerHTML = '';
```

---

## 3. 🟡 `app.js` + `scan-view.js` — Duplicate Camera Event Listeners

**Files**:  
- `src/app.js` (lines 82–83)  
- `src/views/scan-view.js` (lines 139–149, `openCameraView()`)

`btnCloseCameraModal` and `btnSnapCameraStream` have click listeners attached in **two places**:
- `openCameraView()` via `.onclick` assignment
- `app.js` `bindEvents()` via `addEventListener`

This causes both handlers to fire on every click. Since `openCameraView()` already safely uses `.onclick`, remove the duplicate `addEventListener` calls from `app.js`:

```diff
- (this.dom.btnCloseCameraModal || document.getElementById('btnCloseCameraModal'))?.addEventListener('click', () => this.scanView.stopCameraStream());
- (this.dom.btnSnapCameraStream || document.getElementById('btnSnapCameraStream'))?.addEventListener('click', () => this.scanView.snapFrameFromCamera());
```

---

## 4. 🟢 `gemini-engine.js` — Magic Number in `isConfigured()`

**File**: `src/services/gemini/gemini-engine.js` (line 31)

The `> 10` length check is unexplained and makes the intent unclear. Extract it as a named constant:

```diff
+ const MIN_API_KEY_LENGTH = 10;

  isConfigured() {
-   return Boolean(this.apiKey && this.apiKey.length > 10);
+   return Boolean(this.apiKey && this.apiKey.length > MIN_API_KEY_LENGTH);
  }
```

---

## 5. 🟡 `model-discovery.js` — No Caching; Re-fetches Models on Every Scan

**File**: `src/services/gemini/model-discovery.js`

`discoverVisionModels()` makes a fresh network call to Google AI Studio every time a scan is triggered. The model list changes very rarely. Add a simple in-memory cache with a 10-minute TTL:

```js
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function discoverVisionModels(apiKey) {
  if (_cache && (Date.now() - _cacheTime < CACHE_TTL_MS)) {
    console.log('[Gemini] Using cached model list.');
    return _cache;
  }

  // ... existing fetch + filter logic ...

  _cache = result;
  _cacheTime = Date.now();
  return _cache;
}
```

---

## 6. 🟡 `scan-view.js` — Fragile Manual Base64 Decode in `fallbackSnapDataUrl()`

**File**: `src/views/scan-view.js` (lines 232–244)

The `while(n--)` manual base64 → Uint8Array decode pattern is verbose and error-prone. Replace with a cleaner `fetch()` approach which handles this natively:

```diff
- fallbackSnapDataUrl(canvas) {
-   const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
-   const arr = dataUrl.split(',');
-   const mime = arr[0].match(/:(.*?);/)[1];
-   const bstr = atob(arr[1]);
-   let n = bstr.length;
-   const u8arr = new Uint8Array(n);
-   while (n--) {
-     u8arr[n] = bstr.charCodeAt(n);
-   }
-   const capturedFile = new File([u8arr], `snap_${Date.now()}.jpg`, { type: mime });
-   this.handleFileSelection([capturedFile]);
- }
+ async fallbackSnapDataUrl(canvas) {
+   const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
+   const res = await fetch(dataUrl);
+   const blob = await res.blob();
+   const capturedFile = new File([blob], `snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
+   this.handleFileSelection([capturedFile]);
+ }
```

> **Note**: The caller `snapFrameFromCamera()` must `await` this method since it becomes `async`.

---

## 7. 🟡 `translator.js` — Unbounded Translation Cache

**File**: `src/services/translator.js` (line 8)

The `Map()` cache has no eviction policy. In a long session with many unique texts scanned, it grows forever. Add a max size with LRU-style eviction (remove oldest entry):

```diff
+ const MAX_CACHE_SIZE = 100;

  async translateToHindi(englishText) {
    // ... existing cache check ...

    this.cache.set(cleanText, hindiResult);
+   if (this.cache.size > MAX_CACHE_SIZE) {
+     // Evict the oldest (first inserted) entry
+     this.cache.delete(this.cache.keys().next().value);
+   }
    return hindiResult;
  }
```

---

## 8. 🟢 `scan-view.js` — Progress Bar Not Reset on Retry

**File**: `src/views/scan-view.js` (lines 246–249)

When a scan fails and the user retries, the progress bar and status text retain the previous failed state. Reset them at the start of `handleStartBatchOcr()`:

```diff
  async handleStartBatchOcr() {
    if (this.state.uploadedImages.length === 0) return;
    this.dom.ocrProgressBox.style.display = 'block';
    this.dom.btnStartOcr.disabled = true;
+   this.dom.ocrProgressBarFill.style.width = '0%';
+   this.dom.ocrProgressPercent.textContent = '0%';
+   this.dom.ocrProgressStatus.textContent = 'Starting...';
```
