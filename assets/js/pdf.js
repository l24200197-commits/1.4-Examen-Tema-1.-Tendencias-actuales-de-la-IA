(() => {
  const MARGIN = 15;
  const LANGUAGE_NAMES = { es: "Español", en: "Inglés" };

  class PdfBuilder {
    constructor(title, subtitle) {
      const { jsPDF } = window.jspdf;
      this.doc = new jsPDF({ unit: "mm", format: "a4" });
      this.pageWidth = this.doc.internal.pageSize.getWidth();
      this.pageHeight = this.doc.internal.pageSize.getHeight();
      this.contentWidth = this.pageWidth - MARGIN * 2;
      this.y = MARGIN + 4;
      this.#header(title, subtitle);
    }

    #header(title, subtitle) {
      this.doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(30);
      this.doc.text(title, MARGIN, this.y);
      this.y += 7;
      this.doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(115);
      this.doc.text(subtitle, MARGIN, this.y);
      this.y += 4;
      this.doc.setDrawColor(205);
      this.doc.line(MARGIN, this.y, this.pageWidth - MARGIN, this.y);
      this.y += 9;
    }

    #reserve(needed) {
      if (this.y + needed > this.pageHeight - MARGIN) this.page();
    }

    page() {
      this.doc.addPage();
      this.y = MARGIN + 4;
      return this;
    }

    section(heading, body) {
      this.#reserve(18);
      this.doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(30);
      this.doc.text(heading, MARGIN, this.y);
      this.y += 6;
      this.doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(55);
      for (const line of this.doc.splitTextToSize(body || "", this.contentWidth)) {
        this.#reserve(5);
        this.doc.text(line, MARGIN, this.y);
        this.y += 5;
      }
      this.y += 5;
      return this;
    }

    image(picture) {
      let width = this.contentWidth;
      let height = width * (picture.height / picture.width);
      const maxHeight = 110;
      if (height > maxHeight) {
        height = maxHeight;
        width = height * (picture.width / picture.height);
      }
      this.#reserve(height + 6);
      const x = MARGIN + (this.contentWidth - width) / 2;
      this.doc.addImage(picture.dataUrl, "JPEG", x, this.y, width, height);
      this.y += height + 9;
      return this;
    }

    save(filename) {
      this.doc.save(filename);
    }
  }

  // The vision model only returns text, so the PDF embeds a re-encoded copy of
  // the uploaded file. Going through a canvas also normalises WEBP, which jsPDF
  // cannot place directly.
  async function toPicture(file, maxSide = 1600) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.85),
      width: canvas.width,
      height: canvas.height,
    };
  }

  const languagePair = (source, target) =>
    `${LANGUAGE_NAMES[source] ?? source} a ${LANGUAGE_NAMES[target] ?? target}`;

  const downloadName = filename =>
    `${String(filename).replace(/\.[^.]+$/, "") || "traduccion"}-traduccion.pdf`;

  Object.assign(App, { PdfBuilder, toPicture, languagePair, downloadName });
})();
