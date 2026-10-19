/* Fictional, bilingual examples. Images are drawn locally; no remote assets. */
window.VehicleDemoData = async function () {
  'use strict';
  async function picture(color, label, detail) {
    const canvas = document.createElement('canvas');
    canvas.width = 960; canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Beispielbilder konnten nicht erstellt werden. Bitte einen aktuellen Browser verwenden.');
    ctx.fillStyle = '#e9e4d8'; ctx.fillRect(0, 0, 960, 600);
    ctx.fillStyle = '#d3cbbb'; ctx.fillRect(0, 410, 960, 190);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(150, 385); ctx.lineTo(185, 315); ctx.lineTo(345, 300);
    ctx.lineTo(400, 235); ctx.lineTo(570, 235); ctx.lineTo(650, 300); ctx.lineTo(775, 325);
    ctx.lineTo(805, 385); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9e8e8'; ctx.fillRect(410, 250, 145, 48);
    ctx.fillStyle = '#333';
    for (const x of [285, 690]) { ctx.beginPath(); ctx.arc(x, 390, 51, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#aaa';
    for (const x of [285, 690]) { ctx.beginPath(); ctx.arc(x, 390, 27, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#37332a'; ctx.font = '26px Georgia'; ctx.fillText(label, 50, 70);
    ctx.font = '20px sans-serif'; ctx.fillText('' + detail, 50, 535);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Beispielbild konnte nicht erstellt werden. Bitte Demo erneut starten.');
    return blob;
  }
  const specs = [
    ['aktuelle-projekte', 'demo-roadster-1962', 'Roadster, Baujahr 1962', 'Roadster, year 1962', '1962', '#7e2930', '2026-10-03'],
    ['vergangene-projekte', 'demo-coupe-1967', 'Coupé, Baujahr 1967', 'Coupe, year 1967', '1967', '#365e60', '2026-10-02'],
    ['fahrzeugangebote', 'demo-tourenwagen-1955', 'Tourenwagen, Baujahr 1955', 'Touring car, year 1955', '1955', '#9b7840', '2026-10-01'],
  ];
  const vehicles = [];
  for (const [category, slug, title, titleEn, year, color, dateModified] of specs) {
    const images = [];
    for (const [name, detail] of [['card.jpg', 'Übersicht'], ['image-001.jpg', 'Karosserie'], ['image-002.jpg', 'Detail']]) {
      images.push({ name, file: new File([await picture(color, title, detail)], name, { type: 'image/jpeg' }) });
    }
    const record = {
      slug, category, title, titleEn, year, dateModified, order: (vehicles.length + 1) * 100,
      description: 'Klassische Linien, zeitlose Details. Ein Blick auf Karosserie, Technik und Innenraum.',
      descriptionEn: 'Classic lines and timeless details. A look at the bodywork, engineering and interior.',
      sourceUrl: `https://www.oldtimermanufaktur.de/projekte/${category}/${slug}/`,
      cardImage: './card.jpg', cardImageAlt: 'Illustration eines Oldtimers', cardImageAltEn: 'Illustration of a classic car',
      leadImage: './image-001.jpg', leadImageAlt: 'Seitenansicht des Fahrzeugs', leadImageAltEn: 'Side view of the vehicle',
      blocks: [
        { type: 'copy', html: '<h2>Ein Fahrzeug vorstellen</h2><p>Hier finden Sie Informationen zu Karosserie, Technik und Innenraum.</p>', htmlEn: '<h2>Introducing a vehicle</h2><p>Here you will find information about the bodywork, engineering and interior.</p>' },
        { type: 'gallery', images: [
          { src: './image-001.jpg', alt: 'Ansicht der Karosserie', altEn: 'Bodywork view', caption: 'Die Karosserie in der Seitenansicht.', captionEn: 'A side view of the bodywork.' },
          { src: './image-002.jpg', alt: 'Fahrzeugdetail', altEn: 'Vehicle detail' },
        ] },
        { type: 'contact', html: '<p>Sie möchten mehr über dieses Fahrzeug erfahren? Sprechen Sie uns an.</p>', htmlEn: '<p>Would you like to know more about this vehicle? Get in touch with us.</p>' },
      ],
    };
    vehicles.push({ key: `${category}/${slug}`, record, images });
  }
  return vehicles;
};
