// Lora (SIL Open Font License): see Lora-OFL-1.1.txt. Embedded for offline file:// use.
(() => {
  "use strict";
  let fontReady;
  const marked = new WeakSet();
  window.VehicleWatermark = async (file) => {
    if (marked.has(file)) return file;
    fontReady ||= (async () => {
      const font = window.VehiclePresentation?.fontDataUrl;
      if (!font) throw new Error("vehicle-presentation.js fehlt. Bitte alle Editor-Dateien zusammenlassen und die Seite neu laden.");
      const bytes = Uint8Array.from(atob(font.split(",")[1]), c => c.charCodeAt(0));
      const face = new FontFace("VehicleWatermarkLora", bytes, { weight: "400" });
      document.fonts.add(await face.load());
    })();
    await fontReady;
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Wasserzeichen konnte nicht erstellt werden.");
      // Flatten transparent backgrounds consistently before choosing text contrast.
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0);
      const text = "oldtimermanufaktur.de";
      let size = canvas.width / 10;
      context.font = `${size}px VehicleWatermarkLora`;
      size *= canvas.width * 0.9 / context.measureText(text).width;
      size = Math.min(size, canvas.height * 0.18);
      context.font = `${size}px VehicleWatermarkLora`;
      const baseline = canvas.height * 0.92;
      const sample = context.getImageData(0, Math.max(0, Math.floor(baseline - size)), canvas.width, Math.max(1, Math.ceil(size))).data;
      let luminance = 0;
      for (let i = 0; i < sample.length; i += 4) luminance += .2126 * sample[i] + .7152 * sample[i + 1] + .0722 * sample[i + 2];
      const light = luminance / (sample.length / 4) > 140;
      context.fillStyle = light ? "#000" : "#fff";
      context.strokeStyle = light ? "#fff" : "#000";
      context.lineWidth = Math.max(1, size / 35);
      context.textAlign = "center";
      context.strokeText(text, canvas.width / 2, baseline);
      context.fillText(text, canvas.width / 2, baseline);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .95));
      if (!blob || blob.type !== "image/webp") throw new Error("Wasserzeichen konnte nicht als WebP erstellt werden. Bitte aktuelles Chrome oder Edge verwenden.");
      const result = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
      marked.add(result);
      return result;
    } finally { bitmap.close(); }
  };
})();
