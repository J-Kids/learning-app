/**
 * Canvas -> File Conversion Helper
 */

export function canvasToFile(canvas, filename = `snap_${Date.now()}.jpg`, quality = 0.92) {
  return new Promise((resolve) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], filename, { type: 'image/jpeg' }));
        } else {
          resolve(dataUrlToFile(canvas.toDataURL('image/jpeg', quality), filename));
        }
      }, 'image/jpeg', quality);
    } else {
      resolve(dataUrlToFile(canvas.toDataURL('image/jpeg', quality), filename));
    }
  });
}

function dataUrlToFile(dataUrl, filename) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}
