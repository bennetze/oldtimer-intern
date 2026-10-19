(() => {
        "use strict";

        const $ = (selector, root = document) => root.querySelector(selector);
        const $$ = (selector, root = document) => [
          ...root.querySelectorAll(selector),
        ];
        const state = {
          mode: "",
          currentStep: "vehicle",
          cardFile: null,
          cardName: "",
          watermarkEnabled: false,
          original: null,
          busy: false,
          cardUrl: "",
          images: [],
          blocks: [],
          leadImageId: "",
          autoOrderValue: null,
          slugWasEdited: false,
          draggedImageId: "",
          draggedBlockId: "",
        };

        const fields = {
          category: $("#category"),
          autoOrder: $("#auto-order"),
          prependOrder: $("#prepend-order"),
          order: $("#order"),
          title: $("#title"),
          slug: $("#slug"),
          year: $("#year"),
          dateModified: $("#date-modified"),
          sourceUrl: $("#source-url"),
          description: $("#description"),
          cardAlt: $("#card-alt"),
          leadImage: $("#lead-image"),
          leadAlt: $("#lead-alt"),
        };

        const presentation = window.VehiclePresentation;
        if (!presentation) {
          $("#project-feedback").textContent = "vehicle-presentation.js fehlt. Bitte alle Editor-Dateien zusammenlassen und die Seite neu laden.";
          $("#choose-project").disabled = true;
          return;
        }
        const textColors = presentation.colors;
        const colorLabels = presentation.labels;
        const imageDimensions = new WeakMap();
        const checkedImages = new WeakMap();
        const removedBlocks = [];
        let lastEditorBlockId = "";
        const colorCss = Object.entries(textColors).map(([name, color]) => `.om-color-${name}{color:${color}}`).join("");
        const colorStyle = document.createElement("style"); colorStyle.textContent = `@font-face{font-family:Lora;src:url('${presentation.fontDataUrl}') format('truetype');font-weight:400 700;font-style:normal;font-display:swap}${colorCss}`; document.head.append(colorStyle);
        const acceptedTypes = new Set([
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
        ]);
        // Native file-button captions follow the browser language, not the page language.
        for (const input of $$('input[type="file"]')) {
          if (input.closest("#website-tools")) continue;
          const wrapper = document.createElement("div"); wrapper.className = "file-control";
          const label = document.createElement("label"); label.className = "btn btn--small"; label.htmlFor = input.id;
          label.textContent = input.hasAttribute("webkitdirectory") ? "Ordner auswählen" : input.multiple ? "Dateien auswählen" : "Datei auswählen";
          const summary = document.createElement("span"); summary.className = "hint";
          summary.textContent = "Noch keine Datei ausgewählt.";
          summary.setAttribute("role", "status"); summary.dataset.fileSummary = input.id;
          input.before(wrapper); wrapper.append(input, label, summary);
          input.addEventListener("change", () => {
            const files = [...input.files];
            summary.textContent = files.length === 1 ? files[0].name : files.length ? `${files.length} Dateien ausgewählt.` : "Noch keine Datei ausgewählt.";
          });
        }
        function validVehicleDate(value) {
          if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          const date = new Date(`${value}T12:00:00Z`);
          return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
        }

        function validVehicleFilename(value) {
          return typeof value === 'string' && value.length <= 255 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && !value.includes('..') && !value.endsWith('.') && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value);
        }

        function genericVehicleAlternative(value) {
          return /Aufnahme \d+ der Fahrzeugdokumentation|photograph \d+ in the vehicle record/i.test(value || '');
        }

        function validateVehicleRecord(record, checkHtml = () => {}) {
          const fail = (message) => { throw new Error(`vehicle.json: ${message}`); };
          const object = (value, allowed, context) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${context}: Ein Objekt wird erwartet.`);
            for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${context}: unbekanntes Feld ${key}.`);
          };
          const text = (value, context) => { if (typeof value !== 'string' || !value.trim()) fail(`${context}: Text ist erforderlich.`); };
          const alternative = (value, context) => {
            text(value, context);
            if (genericVehicleAlternative(value)) fail(`${context}: Bitte die sichtbare Aufnahme beschreiben statt einen nummerierten Platzhalter zu verwenden.`);
          };
          const image = (value) => {
            if (typeof value !== 'string' || !/^\.\/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp|avif)$/i.test(value) || !validVehicleFilename(value.slice(2)) || !validVehicleFilename(value.slice(2).replace(/\.[^.]+$/, '.webp'))) fail(`Ungültiger Bildpfad: ${value}`);
          };
          object(record, ['slug', 'category', 'title', 'description', 'sourceUrl', 'order', 'dateModified', 'year', 'cardImage', 'cardImageAlt', 'leadImage', 'leadImageAlt', 'blocks', 'titleEn', 'descriptionEn', 'cardImageAltEn', 'leadImageAltEn'], 'Fahrzeug');
          if (typeof record.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug) || !validVehicleFilename(record.slug + '.astro') || ['index', 'seite'].includes(record.slug)) fail('Ungültiger oder reservierter Slug.');
          if (!['aktuelle-projekte', 'vergangene-projekte', 'fahrzeugangebote'].includes(record.category)) fail('Ungültige Kategorie.');
          for (const key of ['title', 'description', 'cardImageAlt', 'leadImageAlt']) text(record[key], key);
          for (const key of ['titleEn', 'descriptionEn', 'cardImageAltEn', 'leadImageAltEn']) {
            text(record[key], key);
          }
          for (const key of ['cardImageAlt', 'leadImageAlt', 'cardImageAltEn', 'leadImageAltEn']) alternative(record[key], key);
          if (!Number.isSafeInteger(record.order)) fail('Der Sortierwert muss eine sicher darstellbare ganze Zahl sein.');
          if (!validVehicleDate(record.dateModified)) fail('Ungültiges Kalenderdatum.');
          if (record.year !== undefined && (typeof record.year !== 'string' || !/^\d{4}$/.test(record.year))) fail('Das Baujahr muss aus vier Ziffern bestehen.');
          try {
            const url = new URL(record.sourceUrl);
            if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) fail('Ungültige Quell-URL.');
          } catch { fail('Ungültige Quell-URL.'); }
          image(record.cardImage); image(record.leadImage);
          if (!Array.isArray(record.blocks)) fail('Inhaltsblöcke müssen als Array vorliegen.');
          for (const [index, block] of record.blocks.entries()) {
            if (block?.type === 'copy' || block?.type === 'contact') {
              object(block, ['type', 'html', 'htmlEn'], `Block ${index + 1}`);
              text(block.html, `Block ${index + 1}`);
              checkHtml(block.html, `Block ${index + 1} Deutsch`);
              text(block.htmlEn, `Block ${index + 1} Englisch`);
              checkHtml(block.htmlEn, `Block ${index + 1} Englisch`);
            } else if (block?.type === 'gallery') {
              object(block, ['type', 'images', 'textSide', 'html', 'htmlEn'], `Block ${index + 1}`);
              if (block.textSide !== undefined) {
                if (!['left', 'right'].includes(block.textSide) || block.images?.length !== 1) fail('Text neben Bild benötigt genau ein Bild und eine gültige Textseite.');
                text(block.html, 'Deutsch'); text(block.htmlEn, 'Englisch');
                checkHtml(block.html, 'Deutsch'); checkHtml(block.htmlEn, 'Englisch');
              } else if (block.html !== undefined || block.htmlEn !== undefined) fail('Textseite fehlt.');
              if (!Array.isArray(block.images) || !block.images.length) fail(`Galerie ${index + 1} ist leer.`);
              for (const item of block.images) {
                object(item, ['src', 'alt', 'caption', 'altEn', 'captionEn', 'size'], `Galerie ${index + 1}`);
                if (item.size !== undefined && !['small', 'medium', 'large'].includes(item.size)) fail('Ungültige Bildgröße.');
                image(item.src); alternative(item.alt, `Gallery ${index + 1}: ${item.src}: German alternative text`);
                alternative(item.altEn, `Gallery ${index + 1}: ${item.src}: English alternative text`);
                if (item.caption !== undefined && typeof item.caption !== 'string') fail('Die Bildunterschrift muss Text sein.');
                if (item.captionEn !== undefined && typeof item.captionEn !== 'string') fail('Die englische Bildunterschrift muss Text sein.');
                if (Boolean(item.caption?.trim()) !== Boolean(item.captionEn?.trim())) fail('Bildunterschriften müssen in beiden Sprachen vorhanden sein oder in beiden fehlen.');
              }
            } else fail(`Unbekannter Blocktyp in Block ${index + 1}.`);
          }
          const refs = [record.cardImage, record.leadImage, ...record.blocks.flatMap((block) => block.type === 'gallery' ? block.images.map((item) => item.src) : [])];
          const stems = new Map();
          for (const ref of new Set(refs)) {
            const stem = ref.replace(/\.[^.]+$/, '').toLowerCase();
            if (stems.has(stem) && stems.get(stem) !== ref) fail(`Bildnamen kollidieren nach der WebP-Konvertierung: ${ref}`);
            stems.set(stem, ref);
          }
          return record;
        }

        const categories = ["aktuelle-projekte", "vergangene-projekte", "fahrzeugangebote"];
        const maxImageBytes = 50 * 1024 ** 2;
        const maxExportBytes = 512 * 1024 ** 2;
        // Each language owns its text; file identity and content order remain shared.
        function pairControl(control, value = "", title = "", required = true) {
          const parent = control.closest(".field") || control.closest("label");
          const pair = document.createElement("div"); pair.className = "language-pair";
          parent.before(pair); pair.append(parent);
          const copy = parent.cloneNode(true);
          parent.classList.remove("field--wide"); copy.classList.remove("field--wide");
          const english = copy.querySelector("input, textarea");
          const germanLabel = parent.matches("label") ? parent : parent.querySelector("label");
          const englishLabel = copy.matches("label") ? copy : copy.querySelector("label");
          const label = title || germanLabel.textContent.trim();
          if (!control.id) control.id = `field-${id()}`;
          english.id = `${control.id}-en`;
          english.value = value;
          if (control.id === "title") english.placeholder = "BMW 507 Roadster, year 1957";
          english.dataset.language = "en"; control.dataset.language = "de";
          english.lang = "en"; control.lang = "de";
          english.removeAttribute("data-touched");
          for (const [element, text] of [[germanLabel, `${label} · Deutsch`], [englishLabel, `${label} · Englisch`]]) {
            // Wrapping labels own their input; preserve it when changing label text.
            if (element.matches("label") && element.contains(element.querySelector("input"))) {
              for (const node of [...element.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.remove();
              element.prepend(document.createTextNode(text));
            } else element.textContent = text;
          }
          germanLabel.htmlFor = control.id; englishLabel.htmlFor = english.id;
          copy.querySelectorAll(".hint, .help, small, [id]:not(input):not(textarea)").forEach((node) => { if (!node.matches("label")) node.remove(); });
          control.dataset.bilingualRequired = english.dataset.bilingualRequired = String(required);
          control.dataset.fieldLabel = `${label} · Deutsch`; english.dataset.fieldLabel = `${label} · Englisch`;
          pair.append(copy);
          return english;
        }
        for (const [key, label] of [["title", "Titel"], ["description", "Beschreibung"], ["cardAlt", "Alternativtext des Kartenbilds"], ["leadAlt", "Alternativtext des Hauptbilds"]]) {
          fields[`${key}En`] = pairControl(fields[key], "", label);
          if (key.endsWith("Alt")) fields[`${key}En`].addEventListener("input", () => { fields[`${key}En`].dataset.touched = "true"; });
        }
        const englishCounter = document.createElement("p"); englishCounter.className = "hint";
        englishCounter.innerHTML = '<span id="description-count-en">0</span>/500 Zeichen';
        fields.descriptionEn.after(englishCounter);
        for (const [field, counter] of [[fields.description, "description-count"], [fields.descriptionEn, "description-count-en"]]) {
          field.setAttribute("aria-describedby", counter);
          $("#" + counter).setAttribute("aria-label", field.dataset.fieldLabel + ": Zeichenanzahl");
        }
        const undoRow = document.createElement("div"); undoRow.id = "block-undo"; undoRow.hidden = true;
        undoRow.innerHTML = '<button type="button" class="btn btn--small" id="restore-block">Letzten Block wiederherstellen</button><span class="hint" id="undo-count"></span>';
        $("#block-list").before(undoRow);
        const structuralStatus = document.createElement("p"); structuralStatus.className = "sr-only"; structuralStatus.setAttribute("role", "status");
        $("#block-list").before(structuralStatus);
        $("#restore-block").addEventListener("click", restoreRemovedBlock);
        const quality = document.createElement("div"); quality.id = "image-quality"; quality.className = "hint";
        $("#review-state").after(quality);
        const technical = $("#technical-details");
        $(".advanced__body", technical).prepend(fields.slug.closest(".field"), fields.sourceUrl.closest(".field"));
        const importFilesDetails = $("#import-files").closest("details");
        importFilesDetails.open = true;
        importFilesDetails.hidden = true;
        const dateActions = document.createElement("div");
        dateActions.className = "date-actions";
        fields.dateModified.before(dateActions);
        dateActions.append(fields.dateModified, $("#use-today"));
        const completion = document.createElement("p"); completion.id = "language-completion"; completion.className = "hint";
        $("#generate").before(completion);
        let pendingChange = false;
        function notifyChange(defer = false) {
          workflow?.invalidateReview();
          if (!defer) { refreshGalleryDefaults(); updateSummary(); return; }
          if (pendingChange) return;
          pendingChange = true;
          queueMicrotask(() => { pendingChange = false; refreshGalleryDefaults(); updateSummary(); });
        }
        document.addEventListener("input", (event) => { if (!event.target.closest("#page-preview-dialog, #website-tools")) notifyChange(true); });
        document.addEventListener("change", (event) => { if (!event.target.closest("#page-preview-dialog, #website-tools")) notifyChange(true); });
        function autoAltEn() {
          return "";
        }
        function pairImageFields() {
          for (const image of state.images) {
            const alt = $(`[data-image-alt="${image.id}"]`);
            pairControl(alt, image.altEn || "", "Alternativtext");
            for (const input of alt.closest(".language-pair").querySelectorAll("input")) input.placeholder = input.dataset.language === "en" ? "Describe the visible view, details or work" : "Sichtbare Ansicht, Details oder Arbeiten beschreiben";
            pairControl($(`[data-image-caption="${image.id}"]`), image.captionEn || "", "Bildunterschrift (optional)", false);
          }
          updateCompletion();
        }
        function pairBlockFields() {
          for (const block of state.blocks) {
            const article = $(`[data-block-id="${block.id}"]`);
            if (block.type === "gallery") {
              block.imageIds.forEach((imageId, index) => {
                const meta = block.imageMeta?.[index] || poolImages().find(image => image.id === imageId);
                pairControl($(`[data-entry-alt="${index}"]`, article), meta.altEn || "", "Alternativtext des Galeriebilds");
                pairControl($(`[data-entry-caption="${index}"]`, article), meta.captionEn || "", "Galerie-Bildunterschrift (optional)", false);
              });
              if (!block.textSide) continue;
            }
            const editor = $("[data-editor]", article);
            if (editor.closest(".language-pair--editors")) {
              for (const field of $$("[data-editor]", article)) {
                const english = field.dataset.language === "en";
                const html = block[english ? "htmlEn" : "html"] || "";
                if (sanitizeHtml(field.innerHTML) !== sanitizeHtml(html)) field.innerHTML = editableHtml(html);
                field.dataset.fieldLabel = `${block.textSide ? "Text neben Bild" : blockLabel(block.type)} ${state.blocks.indexOf(block) + 1} · ${english ? "Englisch" : "Deutsch"}`;
                field.setAttribute("aria-label", field.dataset.fieldLabel);
              }
              continue;
            }
            const toolbar = editor.previousElementSibling;
            const pair = document.createElement("div"); pair.className = "language-pair language-pair--editors";
            toolbar.before(pair);
            const german = document.createElement("section"); german.className = "language-editor";
            german.append(toolbar, editor); pair.append(german);
            const english = german.cloneNode(true); pair.append(english);
            for (const [section, language, label] of [[german, "de", "Deutsch"], [english, "en", "Englisch"]]) {
              const heading = document.createElement("div"); heading.className = "language-label"; heading.textContent = label; section.prepend(heading);
              const field = $("[data-editor]", section);
              field.lang = language; field.dataset.language = language;
              field.dataset.bilingualRequired = "true";
              field.dataset.fieldLabel = `${block.textSide ? "Text neben Bild" : blockLabel(block.type)} ${state.blocks.indexOf(block) + 1} · ${label}`;
              field.setAttribute("aria-label", field.dataset.fieldLabel);
              field.dataset.placeholder = `Text auf ${label} eingeben…`;
              if (language === "en") field.innerHTML = editableHtml(block.htmlEn || "");
            }
          }
          updateCompletion();
        }
        function refreshGalleryDefaults() {
          for (const block of state.blocks.filter(item => item.type === "gallery")) {
            block.imageIds.forEach((imageId, index) => {
              if (block.imageMeta?.[index]) return;
              const meta = poolImages().find(image => image.id === imageId);
              if (!meta) return;
              for (const [attribute, key] of [["entry-alt", "alt"], ["entry-caption", "caption"]]) {
                for (const input of $$(`[data-entry-block="${block.id}"][data-${attribute}="${index}"]`)) input.value = meta[key + (input.dataset.language === "en" ? "En" : "")] || "";
              }
            });
          }
          updateCompletion();
        }
        function bilingualIssues() {
          const issues = [];
          for (const element of $$('[data-bilingual-required="true"]')) {
            const value = element.matches("[contenteditable]") ? stripHtml(element.innerHTML) : element.value.trim();
            if (!value) issues.push({ element, message: `${element.dataset.fieldLabel}: Text ist erforderlich.` });
            else if ((element.matches('[data-image-alt], [data-entry-alt]') || [fields.cardAlt, fields.cardAltEn, fields.leadAlt, fields.leadAltEn].includes(element)) && genericVehicleAlternative(value)) {
              issues.push({ element, message: `${element.dataset.fieldLabel}: Bitte die sichtbare Aufnahme beschreiben statt einen nummerierten Platzhalter zu verwenden.` });
            }
          }
          for (const pair of $$(".language-pair")) {
            const optional = $$('[data-bilingual-required="false"]', pair);
            if (optional.length === 2 && Boolean(optional[0].value.trim()) !== Boolean(optional[1].value.trim())) {
              const element = optional.find(input => !input.value.trim());
              issues.push({ element, message: `${element.dataset.fieldLabel}: Beide Bildunterschriften ausfüllen oder beide leer lassen.` });
            }
          }
          return issues;
        }
        function updateCompletion() {
          const summary = $("#language-completion");
          if (!summary) return;
          const issues = bilingualIssues();
          summary.textContent = issues.length ? `Deutsch + Englisch · ${issues.length} Felder müssen ergänzt werden` : "Deutsch + Englisch · Texte vollständig";
        }

        const stepOrder = ["project", "selection", "vehicle", "images", "content", "review"];
        let workflow;

        function stepIssueCounts() {
          const counts = { vehicle: 0, images: 0, content: 0 };
          for (const issue of bilingualIssues()) {
            const step = issue.element.closest("[data-step]")?.dataset.step;
            if (step && Object.hasOwn(counts, step)) counts[step] += 1;
          }
          const slug = fields.slug.value.trim();
          if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) counts.vehicle += 1;
          if (!validVehicleDate(fields.dateModified.value)) counts.vehicle += 1;
          if (fields.year.value && !/^\d{4}$/.test(fields.year.value)) counts.vehicle += 1;
          if (!fields.autoOrder.checked && (fields.order.value.trim() === "" || !Number.isSafeInteger(Number(fields.order.value)))) counts.vehicle += 1;
          if (slug) {
            try {
              const url = new URL(fields.sourceUrl.value);
              if (!["http:", "https:"].includes(url.protocol)) throw new Error();
            } catch { counts.vehicle += 1; }
          }

          if (!state.cardFile) counts.images += 1;
          const leadIsValid = (state.leadImageId === "__card__" && state.cardFile) || state.images.some((image) => image.id === state.leadImageId);
          if (!leadIsValid) counts.images += 1;
          for (const block of state.blocks) {
            if (block.type === "gallery" && !block.imageIds.length) counts.content += 1;
          }
          return counts;
        }

        function updateContentStatus() {
          const count = stepIssueCounts().content;
          $('[data-step-status="content"]').textContent = count ? `${count} offen` : state.blocks.length ? "Fertig" : "Optional";
        }

        function updateStepStatus() {
          const counts = stepIssueCounts();
          const total = counts.vehicle + counts.images + counts.content;
          for (const name of ["vehicle", "images"]) {
            const status = $(`[data-step-status="${name}"]`);
            const button = $(`[data-step-target="${name}"]`);
            status.textContent = counts[name] ? `${counts[name]} offen` : "Fertig";
            button.classList.toggle("is-complete", !counts[name]);
          }
          updateContentStatus();
          workflow?.update();
          $('[data-step-target="content"]').classList.toggle("is-complete", state.blocks.length > 0 && counts.content === 0);
          const reviewStatus = $('[data-step-status="review"]');
          const reviewButton = $('[data-step-target="review"]');
          reviewStatus.textContent = total ? `${total} offen` : "Bereit";
          reviewButton.classList.toggle("is-complete", total === 0);
          const review = $("#review-state");
          review.className = `review-state ${total ? "is-incomplete" : "is-ready"}`;
          review.textContent = total
            ? `${total} ${total === 1 ? "Angabe fehlt" : "Angaben fehlen"}. Sie können jeden Schritt direkt öffnen.`
            : window.VehicleWebsiteTools ? "Alle Pflichtangaben sind vollständig. „Im Projekt speichern“ prüft und speichert den aktuellen Entwurf nach Ihrer Bestätigung." : "Alle Pflichtangaben sind vollständig. Sie können die Angaben prüfen und die ZIP herunterladen.";
        }

        function showStep(name, { focus = false } = {}) {
          if (!stepOrder.includes(name) || (workflow && !workflow.canOpen(name))) return;
          state.currentStep = name;
          for (const panel of $$('[data-step]')) panel.hidden = panel.dataset.step !== name;
          $("#vehicle-form").hidden = ["project", "selection", "review"].includes(name);
          $(".sidebar").hidden = name !== "review";
          for (const button of $$('[data-step-target]')) {
            if (button.dataset.stepTarget === name) button.setAttribute("aria-current", "step");
            else button.removeAttribute("aria-current");
          }
          const index = stepOrder.indexOf(name);
          $("#step-back").disabled = index === 0;
          $("#step-next").hidden = index === stepOrder.length - 1;
          $("#step-next").textContent = index === stepOrder.length - 2 ? "Prüfen" : "Weiter";
          $("#step-position").textContent = `Schritt ${index + 1} von ${stepOrder.length}`;
          $("#workspace-status").hidden = true;
          updateSummary();
          if (focus) {
            requestAnimationFrame(() => {
              const heading = $(`[data-step="${name}"] h2`);
              if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
              $("#editor-shell").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
            });
          }
        }

        function showEditor(mode, step = "vehicle") {
          state.mode = mode;
          $("#start-screen").hidden = true;
          $("#editor-shell").hidden = false;
          
          $("#start-feedback").textContent = "";
          showStep(step, { focus: true });
        }

        function firstIncompleteStep() {
          const counts = stepIssueCounts();
          return ["vehicle", "images", "content"].find((name) => counts[name]) || "review";
        }

        function localDate() {
          const date = new Date();
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        }
        function validDate(value) { return validVehicleDate(value); }
        function cardName() { return state.cardName || (state.cardFile ? `card.${extensionFor(state.cardFile)}` : ""); }
        function setBusy(value, { websiteTools = false } = {}) {
          state.busy = value;
          $("form").inert = value;
          $(".sidebar").inert = value && !websiteTools;
          $(".review-panel").inert = value;
          $("#start-screen").inert = value;
          $("#generate").disabled = value;
          $("form").setAttribute("aria-busy", String(value));
          workflow?.update();
        }
        async function withBusy(work, rethrow = false) {
          setBusy(true);
          try { await work(); }
          catch (error) { setStatus([error.message]); if (rethrow) throw error; }
          finally { setBusy(false); }
        }
        async function checkImage(file) {
          if (checkedImages.has(file)) return checkedImages.get(file);
          if (!file.size || file.size > maxImageBytes) throw new Error("Das Bild muss zwischen 1 Byte und 50 MiB groß sein.");
          const bytes = new Uint8Array(await file.slice(0, 256).arrayBuffer());
          const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
          let type = "";
          if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) type = "image/jpeg";
          else if ([137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value)) type = "image/png";
          else if (ascii(0,4) === "RIFF" && ascii(8,12) === "WEBP") type = "image/webp";
          else if (ascii(4,8) === "ftyp") {
            const size = new DataView(bytes.buffer).getUint32(0);
            const brands = [ascii(8,12)];
            for (let offset = 16; offset + 4 <= Math.min(size, bytes.length); offset += 4) brands.push(ascii(offset, offset + 4));
            if (brands.some((brand) => ["avif", "avis"].includes(brand))) type = "image/avif";
          }
          if (!type || (file.type && file.type !== type && file.type !== "application/octet-stream")) throw new Error("Dateiinhalt und Bildtyp stimmen nicht überein (JPEG, PNG, WebP oder AVIF erforderlich).");
          const checked = new File([file], file.name, { type, lastModified: file.lastModified });
          const url = URL.createObjectURL(checked);
          try {
            const image = new Image();
            image.src = url;
            await image.decode();
            if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 100000000) throw new Error("Das Bild überschreitet 100 Megapixel.");
            const dimensions = Object.freeze({ width: image.naturalWidth, height: image.naturalHeight });
            imageDimensions.set(file, dimensions); imageDimensions.set(checked, dimensions);
            checkedImages.set(file, checked); checkedImages.set(checked, checked);
          } catch { throw new Error("Das Bild ist beschädigt, zu groß oder kann in diesem Browser nicht dekodiert werden."); }
          finally { URL.revokeObjectURL(url); }
          return checked;
        }
        function checkZipEntries(entries) {
          if (entries.length >= 65535) throw new Error("Zu viele ZIP-Einträge (ZIP64 wird nicht unterstützt).");
          const encoder = new TextEncoder();
          const names = new Set();
          let size = 22;
          let payload = 0, folderFiles = 0;
          for (const entry of entries) {
            if (!/^[a-z0-9-]+\/[a-z0-9-]+(?:\/[A-Za-z0-9._-]+|\.astro)$/.test(entry.name) || entry.name.includes("..") || names.has(entry.name.toLowerCase())) throw new Error("Ungültiger oder doppelter ZIP-Dateiname.");
            names.add(entry.name.toLowerCase());
            const length = encoder.encode(entry.name).length;
            const bytes = typeof entry.data === "string" ? encoder.encode(entry.data).length : entry.data.size;
            if (!entry.name.endsWith('.astro')) {
              folderFiles++; payload += bytes;
              if (folderFiles > 2000 || payload > maxExportBytes) throw new Error("Das Fahrzeug überschreitet 2000 Dateien oder 512 MiB.");
              if (bytes > (entry.name.endsWith('/vehicle.json') ? 2 * 1024 ** 2 : maxImageBytes)) throw new Error("vehicle.json darf höchstens 2 MiB und jedes Bild höchstens 50 MiB groß sein.");
            }
            for (const component of entry.name.split('/')) if (!validVehicleFilename(component)) throw new Error("Ein Dateiname wird auf Windows nicht unterstützt oder ist zu lang.");
            if (length > 65535 || !Number.isSafeInteger(bytes) || bytes >= 0xffffffff) throw new Error("ZIP-Größenlimit überschritten.");
            size += 76 + 2 * length + bytes;
            if (size >= 0xffffffff) throw new Error("Der Export überschreitet 512 MiB. Bitte kleinere Bilder verwenden.");
          }
        }
        function validateRecord(record) {
          return validateVehicleRecord(record, (html, context) => {
            const report = {};
            sanitizeHtml(html, report);
            if (report.removed || report.normalized || !stripHtml(html)) throw new Error(`${context}: Nicht unterstütztes oder leeres HTML. Bitte den Text überarbeiten.`);
          });
        }
        async function importVehicle(fileList, { managed = false } = {}) {
          if (state.busy || !fileList.length) return;
          let imported = false;
          const sources = [...fileList];
          await withBusy(async () => {
            if (sources.length > 2000 || sources.reduce((total, file) => total + file.size, 0) > maxExportBytes) throw new Error("Der Import überschreitet 2000 Dateien oder 512 MiB.");
            const files = new Map();
            let root = null;
            for (const file of sources) {
              if (file.name === ".DS_Store") continue;
              const relative = file.webkitRelativePath || file.name;
              const parts = relative.split("/");
              if (parts.length > 2 || parts.some((part) => part === ".." || part === ".")) throw new Error("Bitte genau einen Fahrzeugordner ohne Unterordner auswählen.");
              if (parts.length === 2) {
                if (root !== null && root !== parts[0]) throw new Error("Mehrere Fahrzeugordner ausgewählt.");
                root = parts[0];
              }
              if (files.has(file.name.toLowerCase())) throw new Error(`Doppelter Dateiname: ${file.name}`);
              files.set(file.name.toLowerCase(), file);
            }
            const json = files.get("vehicle.json");
            if (!json || json.size > 2 * 1024 ** 2) throw new Error("Eine vehicle.json-Datei mit höchstens 2 MiB ist erforderlich.");
            let record;
            try { record = JSON.parse(await json.text()); }
            catch { throw new Error("vehicle.json enthält kein gültiges JSON. Bitte die Datei prüfen."); }
            validateRecord(record);
            if (root && root !== record.slug) throw new Error("Ordnername und Slug stimmen nicht überein.");
            const checked = new Map();
            for (const file of files.values()) {
              if (file === json || file.name.endsWith(".astro")) continue;
              if (!validVehicleFilename(file.name) || !validVehicleFilename(file.name.replace(/\.[^.]+$/, '.webp')) || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp|avif)$/i.test(file.name)) throw new Error(`Nicht unterstützte Datei: ${file.name}`);
              const image = await checkImage(file);
              const extension = file.name.split(".").pop().toLowerCase().replace("jpeg", "jpg");
              if (extension !== extensionFor(image)) throw new Error(`Dateiendung passt nicht zum Bild: ${file.name}`);
              checked.set(`./${file.name}`, image);
            }
            const refs = [record.cardImage, record.leadImage, ...record.blocks.flatMap((block) => block.type === "gallery" ? block.images.map((image) => image.src) : [])];
            for (const ref of refs) if (!checked.has(ref)) throw new Error(`Fehlendes Bild: ${ref}`);
            const stems = new Set();
            for (const ref of checked.keys()) {
              const stem = ref.replace(/\.[^.]+$/, "").toLowerCase();
              if (stems.has(stem)) throw new Error(`Bilddateinamen kollidieren: ${ref}`);
              stems.add(stem);
            }
            if ((state.cardFile || state.images.length || state.blocks.length || ["title", "titleEn", "description", "descriptionEn", "cardAlt", "cardAltEn", "leadAlt", "leadAltEn"].some(key => fields[key].value.trim())) && !managed && !confirm("Aktuelle Eingaben durch das geprüfte Fahrzeug ersetzen?")) return;
            if (state.cardUrl) URL.revokeObjectURL(state.cardUrl);
            state.images.forEach((image) => URL.revokeObjectURL(image.url));
            state.watermarkEnabled = false; $("#watermark-all").checked = false;
            removedBlocks.length = 0; updateUndo();
            state.original = { category: record.category, slug: record.slug, sourceUrl: record.sourceUrl };
            state.slugWasEdited = true;
            state.cardFile = checked.get(record.cardImage);
            state.cardImported = true;
            state.cardName = record.cardImage.slice(2);
            showCard();
            state.images = [...checked].filter(([ref]) => ref !== record.cardImage).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })).map(([ref, file]) => {
              const meta = record.blocks.flatMap((block) => block.type === "gallery" ? block.images : []).find((image) => image.src === ref);
              return { id: id(), file, url: URL.createObjectURL(file), originalName: ref.slice(2), outputName: ref.slice(2), alt: meta?.alt || record.leadImageAlt, altEn: meta?.altEn || record.leadImageAltEn || "", caption: meta?.caption || "", captionEn: meta?.captionEn || "", altTouched: true, altEnTouched: true };
            });
            const imageId = (ref) => ref === record.cardImage ? "__card__" : state.images.find((image) => `./${image.outputName}` === ref).id;
            state.leadImageId = imageId(record.leadImage);
            state.blocks = record.blocks.map((block) => ({ id: id(), type: block.type, textSide: block.textSide, html: block.html || "", htmlEn: block.htmlEn || "", originalHtml: block.html, originalHtmlEn: block.htmlEn, imageIds: block.images?.map((image) => imageId(image.src)) || [], imageMeta: block.images?.map(({ alt, altEn, caption, captionEn, size }) => ({ ...(size ? { size } : {}), alt, altEn: altEn || "", ...(caption !== undefined ? { caption } : {}), ...(captionEn !== undefined ? { captionEn } : {}) })) || [] }));
            for (const key of ["title", "slug", "category", "description", "order", "dateModified"]) fields[key].value = record[key];
            for (const [field, key] of [["titleEn", "titleEn"], ["descriptionEn", "descriptionEn"], ["cardAltEn", "cardImageAltEn"], ["leadAltEn", "leadImageAltEn"]]) fields[field].value = record[key] || "";
            fields.cardAltEn.dataset.touched = fields.leadAltEn.dataset.touched = "true";
            fields.year.value = record.year || "";
            fields.cardAlt.value = record.cardImageAlt;
            fields.leadAlt.value = record.leadImageAlt;
            fields.cardAlt.dataset.touched = fields.leadAlt.dataset.touched = "true";
            fields.slug.readOnly = true;
            $("#refresh-slug").disabled = true;
            fields.autoOrder.checked = false;
            fields.order.disabled = false;
            fields.prependOrder.disabled = true;
            $("#manual-order-wrap").hidden = false;
            state.autoOrderValue = null;
            renderImages(); renderBlocks(); updateSummary();
            showEditor("existing");
            imported = true;
            setStatus([], "Fahrzeug vollständig geladen.");
          }, managed);
          return imported;
        }
        for (const selector of ["#import-folder", "#import-files"]) $(selector).addEventListener("change", (event) => { importVehicle(event.target.files); event.target.value = ""; });
        $(".step-nav").addEventListener("click", (event) => {
          const button = event.target.closest("[data-step-target]");
          if (button) showStep(button.dataset.stepTarget, { focus: true });
        });
        $("#step-back").addEventListener("click", () => {
          const index = stepOrder.indexOf(state.currentStep);
          if (index > 0) showStep(stepOrder[index - 1], { focus: true });
        });
        $("#step-next").addEventListener("click", () => {
          const index = stepOrder.indexOf(state.currentStep);
          if (index < stepOrder.length - 1) showStep(stepOrder[index + 1], { focus: true });
        });
        $("#use-today").addEventListener("click", () => { fields.dateModified.value = localDate(); updateSummary(); });
        $("#block-list").addEventListener("paste", (event) => {
          const editor = event.target.closest("[data-editor]");
          if (!editor) return;
          event.preventDefault();
          const report = {};
          const html = event.clipboardData.getData("text/html") || escapeHtml(event.clipboardData.getData("text/plain")).replace(/\r?\n/g, "<br>");
          const clean = sanitizeHtml(html, report);
          document.execCommand("insertHTML", false, editableHtml(clean));
          const block = state.blocks.find((item) => item.id === editor.dataset.editor);
          if (block) block[editor.dataset.language === "en" ? "htmlEn" : "html"] = sanitizeHtml(editor.innerHTML);
          notifyChange(true);
          if (report.removed) setStatus([], "Nicht unterstützte Formatierungen, eingebettete Inhalte oder unsichere Links wurden aus dem eingefügten Text entfernt.");
        });
        $("#block-list").addEventListener("drop", (event) => {
          if (!event.target.closest("[data-editor]")) return;
          event.preventDefault();
          setStatus([], "Bitte Text kopieren und einfügen, damit eingebettete Inhalte vor dem Einfügen geprüft werden können.");
        });
        $("#block-list").addEventListener("input", (event) => {
          const input = event.target;
          if (!input.dataset.entryBlock) return;
          const block = state.blocks.find((item) => item.id === input.dataset.entryBlock);
          const index = Number(input.dataset.entryAlt ?? input.dataset.entryCaption);
          block.imageMeta ||= block.imageIds.map(() => null);
          block.imageMeta[index] ||= { ...poolImages().find((image) => image.id === block.imageIds[index]) };
          if (input.dataset.entryAlt !== undefined) block.imageMeta[index][input.dataset.language === "en" ? "altEn" : "alt"] = input.value;
          else block.imageMeta[index][input.dataset.language === "en" ? "captionEn" : "caption"] = input.value;
        });
        $("#block-list").addEventListener("click", (event) => {
          const button = event.target.closest("button[data-entry-block]");
          if (!button) return;
          const block = state.blocks.find((item) => item.id === button.dataset.entryBlock);
          const index = Number(button.dataset.entryMove ?? button.dataset.entryRemove ?? button.dataset.entrySplit);
          if (button.dataset.entrySplit !== undefined) {
            splitGallery(block.id, index + 1);
            return;
          }
          block.imageMeta ||= block.imageIds.map(() => null);
          if (button.dataset.entryMove !== undefined) { moveItem(block.imageIds, index, index - 1); moveItem(block.imageMeta, index, index - 1); }
          else { block.imageIds.splice(index, 1); block.imageMeta.splice(index, 1); }
          renderBlocks();
          notifyChange();
          const nextIndex = button.dataset.entryMove !== undefined ? index - 1 : Math.min(index, block.imageIds.length - 1);
          const target = $(`[data-entry-block="${block.id}"][data-entry-${button.dataset.entryMove !== undefined && nextIndex > 0 ? "move" : "remove"}="${nextIndex}"]`);
          if (target) target.focus(); else focusBlock(block.id);
          structuralStatus.textContent = button.dataset.entryMove !== undefined ? `Galeriebild an Position ${nextIndex + 1} verschoben.` : "Bild aus der Galerie entfernt.";
        });
        // Restore keyboard focus after the existing reordering handlers rebuild lists.
        for (const [selector, key, fallback] of [["#image-list", "imageId", "#gallery-files"], ["#block-list", "blockId", "[data-add-block='copy']"]]) {
          $(selector).addEventListener("click", (event) => {
            const button = event.target.closest("button");
            const article = event.target.closest("article");
            if (!button || !article) return;
            const value = article.dataset[key];
            const attribute = key === "imageId" ? "data-image-id" : "data-block-id";
            queueMicrotask(() => {
              const active = document.activeElement;
              if (active === document.body || !active?.isConnected) ($(`[${attribute}='${value}'] button:not(:disabled)`) || $(selector + " button:not(:disabled)") || $(fallback))?.focus();
            });
          });
        }

        fields.dateModified.value = localDate();

        function id() {
          return (
            globalThis.crypto?.randomUUID?.() ??
            `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
          );
        }

        function escapeHtml(value) {
          return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
        }

        function slugify(value) {
          return value
            .trim()
            .toLowerCase()
            .replaceAll("ä", "ae")
            .replaceAll("ö", "oe")
            .replaceAll("ü", "ue")
            .replaceAll("ß", "ss")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .replace(/-{2,}/g, "-");
        }

        function extensionFor(file) {
          if (file.type === "image/jpeg") return "jpg";
          if (file.type === "image/png") return "png";
          if (file.type === "image/webp") return "webp";
          if (file.type === "image/avif") return "avif";
          const ext = file.name.split(".").pop().toLowerCase();
          return ext === "jpeg" ? "jpg" : ext;
        }

        function humanSize(bytes) {
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
          return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
        }

        function autoAlt() {
          return "";
        }

        function renumberImages() {
          const stem = name => name.replace(/\.[^.]+$/, '').toLowerCase();
          const used = new Set([cardName(), ...state.images.filter(image => image.originalName).map(image => image.originalName)].filter(Boolean).map(stem));
          state.images.forEach((image, index) => {
            if (!image.originalName) {
              let number = index + 1;
              let name;
              do { name = `image-${String(number++).padStart(3, "0")}.${extensionFor(image.file)}`; }
              while (used.has(stem(name)));
              image.outputName = name;
              used.add(stem(name));
            }
            if (!image.altTouched) image.alt = autoAlt(index);
            if (!image.altEnTouched) image.altEn = autoAltEn(index);
          });
        }

        function updateAutoText() {
          state.autoOrderValue = null;
          const title = fields.title.value.trim();
          if (!state.slugWasEdited) fields.slug.value = slugify(title);
          if (!fields.cardAlt.dataset.touched) fields.cardAlt.value = title;
          if (!fields.leadAlt.dataset.touched)
            fields.leadAlt.value = title
              ? `${title} – Fahrzeugdokumentation`
              : "";
          state.images.forEach((image, index) => {
            if (!image.altTouched) image.alt = autoAlt(index);
            if (!image.altEnTouched) image.altEn = autoAltEn(index);
          });
          if (!fields.cardAltEn.dataset.touched) fields.cardAltEn.value = fields.titleEn.value.trim();
          if (!fields.leadAltEn.dataset.touched) fields.leadAltEn.value = fields.titleEn.value.trim() ? `${fields.titleEn.value.trim()} – vehicle record` : "";
          renderImages();
          refreshGalleryDefaults();
          updateSummary();
        }

        async function setCardFile(file) {
          if (!file || state.busy) return;
          await withBusy(async () => {
            const checked = await checkImage(file);
            if (state.cardUrl) URL.revokeObjectURL(state.cardUrl);
            state.cardFile = checked;
            state.cardImported = false;
            state.cardName = state.cardName ? state.cardName.replace(/\.[^.]+$/, `.${extensionFor(checked)}`) : "";
            showCard();
            renumberImages(); renderImages();
            if (!state.leadImageId) state.leadImageId = "__card__";
            renderLeadOptions();
            renderBlocks();
            updateSummary();
          });
        }

        function dimensionLabel(file) {
          const dimensions = imageDimensions.get(file);
          return dimensions ? `${dimensions.width} × ${dimensions.height} px` : "";
        }
        function updateCardDetails() {
          const label = state.cardFile ? "Kartenbild ersetzen" : "Kartenbild auswählen";
          $("#card-drop > div").firstElementChild.textContent = label + " oder hier ablegen";
          $("#card-drop .file-control label").textContent = label;
          const info = state.cardFile ? `${state.cardImported ? "Importiert" : "Ausgewählt"}: ${state.cardFile.name} · ${dimensionLabel(state.cardFile)} · ${humanSize(state.cardFile.size)} · Export: ${cardName()}` : "Noch kein Kartenbild ausgewählt.";
          $('[data-file-summary="card-file"]').textContent = info;
          $("#card-file-info").textContent = info;
        }
        function imageQualityWarnings() {
          const warnings = new Map();
          const check = (image, width, usage) => {
            if (!image?.file) return;
            const dimensions = imageDimensions.get(image.file);
            if (dimensions && dimensions.width < width) {
              const key = image.id + ":" + usage;
              warnings.set(key, `${image.outputName || cardName()}: ${dimensions.width} × ${dimensions.height} px. Für ${usage} sind mindestens ${width} px Breite empfohlen.`);
            }
          };
          const pool = poolImages();
          check(pool.find(image => image.id === "__card__"), presentation.widths.card, "das Kartenbild");
          if (!state.blocks.some(block => block.imageIds.includes(state.leadImageId))) check(pool.find(image => image.id === state.leadImageId), presentation.widths.lead, "das Hauptbild");
          state.blocks.forEach((block, blockIndex) => block.imageIds.forEach((imageId, index) => {
            const size = block.imageMeta?.[index]?.size || "small";
            check(pool.find(image => image.id === imageId), presentation.widths[size], `Galerie ${blockIndex + 1}, Bild ${index + 1} (${ { small: "Klein", medium: "Mittel", large: "Groß" }[size] })`);
          }));
          return [...warnings.values()];
        }
        function updateImageQuality() {
          const warnings = imageQualityWarnings();
          const root = $("#image-quality"); root.hidden = !warnings.length;
          root.innerHTML = warnings.length ? '<strong>Hinweise zur Bildqualität (Export bleibt möglich)</strong><ul>' + warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join("") + '</ul>' : "";
        }
        function showCard() {
          updateCardDetails();
          if (!state.cardFile) { $("#card-preview").hidden = true; $("#card-preview-image").removeAttribute("src"); $("#card-file-info").textContent = "Noch kein Kartenbild ausgewählt."; return; }
          if (state.cardUrl) URL.revokeObjectURL(state.cardUrl);
          state.cardUrl = URL.createObjectURL(state.cardFile);
          $("#card-preview-image").src = state.cardUrl;
          $("#card-preview").hidden = false;
          updateCardDetails();
        }

        async function addGalleryFiles(fileList) {
          if (state.busy) return;
          const files = [...fileList];
          await withBusy(async () => {
            if (state.images.length + files.length + (state.cardFile ? 1 : 0) + 1 > 2000 || files.reduce((bytes, file) => bytes + file.size, (state.cardFile?.size || 0) + state.images.reduce((bytes, image) => bytes + image.file.size, 0)) > maxExportBytes) throw new Error("Die Bildsammlung überschreitet 2000 Dateien oder 512 MiB. Bitte weniger oder kleinere Bilder auswählen.");
            const errors = [];
            for (const source of files) {
              try {
                const original = await checkImage(source);
                const duplicate = state.images.some(image => {
                  const file = image.file;
                  return file.name === original.name && file.size === original.size && file.lastModified === original.lastModified;
                });
                if (duplicate) { errors.push(`${original.name}: Bereits in der Bildsammlung vorhanden.`); continue; }
                const file = original;
                if (file.size + (state.cardFile?.size || 0) + state.images.reduce((sum, image) => sum + image.file.size, 0) > maxExportBytes) throw new Error("Die Bildsammlung überschreitet 512 MiB.");
                state.images.push({ id: id(), file, url: URL.createObjectURL(file), outputName: "", alt: "", altTouched: false, caption: "" });
              } catch (error) { errors.push(`${source.name}: ${error.message}`); }
            }
            renumberImages();
            if (!state.leadImageId && state.images.length) state.leadImageId = state.images[0].id;
            renderImages();
            renderBlocks();
            updateSummary();
            if (errors.length) setStatus(errors);
          });
        }

        function moveItem(array, fromIndex, toIndex) {
          if (fromIndex < 0 || toIndex < 0 || toIndex >= array.length || fromIndex === toIndex)
            return;
          const [item] = array.splice(fromIndex, 1);
          array.splice(toIndex, 0, item);
        }

        function renderLeadOptions() {
          fields.leadImage.innerHTML = "";
          if (!state.images.length && !state.cardFile) {
            fields.leadImage.disabled = true;
            fields.leadImage.innerHTML =
              '<option value="">Zuerst ein Bild importieren</option>';
            return;
          }
          fields.leadImage.disabled = false;
          if (state.cardFile) {
            const cardOption = document.createElement("option");
            cardOption.value = "__card__";
            cardOption.textContent = `${cardName()} (Kartenbild)`;
            fields.leadImage.append(cardOption);
          }
          for (const image of state.images) {
            const option = document.createElement("option");
            option.value = image.id;
            option.textContent = image.outputName;
            fields.leadImage.append(option);
          }
          const leadIsValid =
            (state.leadImageId === "__card__" && state.cardFile) ||
            state.images.some((image) => image.id === state.leadImageId);
          if (!leadIsValid)
            state.leadImageId = state.cardFile
              ? "__card__"
              : state.images[0].id;
          fields.leadImage.value = state.leadImageId;
        }

        function renderImages() {
          const list = $("#image-list");
          renderLeadOptions();
          if (!state.images.length) {
            list.innerHTML =
              '<div class="empty">Noch keine Galeriebilder importiert.</div>';
            return;
          }
          list.innerHTML = state.images
            .map(
              (image, index) => `
					<article class="image-item" data-image-id="${image.id}">
						<div class="drag-handle" draggable="true" aria-hidden="true">⋮⋮</div>
						<img class="image-thumb" src="${image.url}" alt="" />
						<div class="image-meta">
							<strong class="image-name">${escapeHtml(image.outputName)}</strong><span class="hint">${escapeHtml(dimensionLabel(image.file))}</span>
							<div class="field">
								<label for="alt-${image.id}">Alternativtext</label>
								<input id="alt-${image.id}" type="text" data-image-alt="${image.id}" value="${escapeHtml(image.alt)}" />
							</div>
							<div class="field">
								<label for="caption-${image.id}">Bildunterschrift (optional)</label>
								<input id="caption-${image.id}" type="text" data-image-caption="${image.id}" value="${escapeHtml(image.caption)}" />
							</div>
						</div>
						<div class="image-actions">
							<button class="btn btn--small" type="button" data-image-move="up" data-id="${image.id}" ${index === 0 ? "disabled" : ""} aria-label="Bild nach oben verschieben">↑</button>
							<button class="btn btn--small" type="button" data-image-move="down" data-id="${image.id}" ${index === state.images.length - 1 ? "disabled" : ""} aria-label="Bild nach unten verschieben">↓</button>
							<button class="btn btn--small btn--danger" type="button" data-image-remove="${image.id}">Entfernen</button>
						</div>
					</article>
				`,
            )
            .join("");
          pairImageFields();
        }

        function updateUndo() {
          $("#block-undo").hidden = removedBlocks.length === 0;
          $("#undo-count").textContent = `${removedBlocks.length} wiederherstellbar`;
        }
        function focusBlock(blockId, direction) {
          const article = $(`[data-block-id="${blockId}"]`);
          if (!article) return;
          const move = direction && $(`[data-block-move="${direction}"]`, article);
          (move && !move.disabled ? move : $(".content-block__title", article)).focus({ preventScroll: true });
        }
        function focusImage(imageId, direction) {
          const article = $(`[data-image-id="${imageId}"]`);
          if (!article) { $("#gallery-files").focus(); return; }
          const move = direction && $(`[data-image-move="${direction}"]`, article);
          (move && !move.disabled ? move : $("[data-image-remove]", article)).focus({ preventScroll: true });
        }
        function restoreRemovedBlock() {
          if (state.busy || !removedBlocks.length) return;
          const entry = removedBlocks.pop(), block = structuredClone(entry.block);
          const available = new Set(poolImages().map(image => image.id));
          const kept = block.imageIds.map((imageId, index) => ({ imageId, meta: block.imageMeta[index] })).filter(image => available.has(image.imageId));
          const missing = block.imageIds.length - kept.length;
          block.imageIds = kept.map(image => image.imageId); block.imageMeta = kept.map(image => image.meta);
          let index = state.blocks.findIndex(item => item.id === entry.next);
          if (index < 0) { const previous = state.blocks.findIndex(item => item.id === entry.previous); index = previous < 0 ? Math.min(entry.index, state.blocks.length) : previous + 1; }
          state.blocks.splice(index, 0, block);
          renderBlocks(); updateUndo(); notifyChange(); focusBlock(block.id);
          structuralStatus.textContent = `Block ${index + 1} wiederhergestellt.${missing ? ` ${missing} inzwischen entfernte Bilder sind nicht mehr enthalten.` : ""}`;
          if (missing) setStatus([], structuralStatus.textContent);
        }
        function addBlock(type) {
          const textSide = type === "image-text" ? "left" : undefined;
          if (textSide) type = "gallery";
          state.blocks.push({ id: id(), type, textSide, html: "", htmlEn: "", imageIds: [], imageMeta: [] });
          renderBlocks();
          updateSummary();
        }

        function blockLabel(type) {
          return type === "copy"
            ? "Textblock"
            : type === "contact"
              ? "Kontaktblock"
              : "Galerieblock";
        }

        function renderBlocks() {
          const list = $("#block-list");
          if (!state.blocks.length) {
            list.innerHTML =
              '<div class="empty">Noch keine Inhaltsblöcke vorhanden.</div>';
            updateStepStatus();
            return;
          }
          const template = document.createElement("template");
          template.innerHTML = state.blocks
            .map((block, index) => {
              const body =
                block.type === "gallery"
                  ? renderGalleryChoices(block)
                  : renderTextEditor(block, index);
              const sideControls = block.textSide ? `<p class="hint">Genau ein Bild auswählen. Bild und Text stehen nebeneinander; mobil untereinander.</p><label>Textposition<select data-text-side="${block.id}"><option value="left" ${block.textSide === "left" ? "selected" : ""}>Text links</option><option value="right" ${block.textSide === "right" ? "selected" : ""}>Text rechts</option></select></label>${renderTextEditor(block, index)}` : "";
              return `
						<article class="content-block content-block--${block.type}" data-block-id="${block.id}">
							<header class="content-block__head">
								<div class="content-block__title" role="heading" aria-level="3" tabindex="-1"><span class="drag-handle" draggable="true" aria-hidden="true">⋮⋮</span>${index + 1}. ${block.textSide ? "Text neben Bild" : blockLabel(block.type)}</div>
								<div class="inline-row">
									<button class="btn btn--small" type="button" data-block-move="up" data-id="${block.id}" ${index === 0 ? "disabled" : ""} aria-label="Block nach oben verschieben">↑</button>
									<button class="btn btn--small" type="button" data-block-move="down" data-id="${block.id}" ${index === state.blocks.length - 1 ? "disabled" : ""} aria-label="Block nach unten verschieben">↓</button>
									<button class="btn btn--small btn--danger" type="button" data-block-remove="${block.id}">Entfernen</button>
								</div>
							</header>
							<div class="content-block__body">${body}${sideControls}</div>
						</article>`;
            })
            .join("");
          const ids = new Set(state.blocks.map(block => block.id));
          for (const child of [...list.children]) if (!ids.has(child.dataset.blockId)) child.remove();
          const articles = [];
          for (const fresh of [...template.content.children]) {
            let article = $(`[data-block-id="${fresh.dataset.blockId}"]`, list);
            if (article) {
              $(".content-block__head", article).replaceWith($(".content-block__head", fresh));
              if (article.classList.contains("content-block--gallery")) {
                const body = $(".content-block__body", article), newBody = $(".content-block__body", fresh);
                for (const child of [...body.children]) if (child.matches(".gallery-choices, .gallery-selected, .empty")) child.remove();
                const choices = document.createDocumentFragment();
                for (const child of [...newBody.children]) if (child.matches(".gallery-choices, .gallery-selected, .empty")) choices.append(child);
                body.prepend(choices);
              }
            } else article = fresh;
            articles.push(article);
          }
          const insert = (article, cursor) => {
            if (article === cursor || article.parentElement === list && article.nextElementSibling === cursor) return;
            if (article.parentElement === list && list.moveBefore) list.moveBefore(article, cursor);
            else list.insertBefore(article, cursor);
          };
          // Keep the most recently edited host anchored; move its neighbours around it.
          const anchorIndex = articles.findIndex(article => article.parentElement === list && article.dataset.blockId === lastEditorBlockId);
          if (anchorIndex >= 0) {
            let cursor = articles[anchorIndex];
            for (let i = anchorIndex - 1; i >= 0; i--) { insert(articles[i], cursor); cursor = articles[i]; }
            cursor = articles[anchorIndex].nextElementSibling;
            for (let i = anchorIndex + 1; i < articles.length; i++) { insert(articles[i], cursor); cursor = articles[i].nextElementSibling; }
          } else {
            let cursor = list.firstElementChild;
            for (const article of articles) { insert(article, cursor); cursor = article.nextElementSibling; }
          }
          pairBlockFields();
          updateStepStatus();
        }

        function renderTextEditor(block, index) {
          const isContact = block.type === "contact";
          return `
							<div class="toolbar" role="toolbar" aria-label="Text formatieren">
                  <label class="text-color-control">Textfarbe<select data-text-color aria-label="Textfarbe">${Object.entries(textColors).map(([name, color]) => `<option value="${color}">${colorLabels[name]}</option>`).join("")}</select></label>
                  <button type="button" data-command="removeFormat" title="Formatierung und Farbe entfernen">Format entfernen</button>
								<button type="button" data-command="bold" aria-label="Fett" title="Fett"><strong>B</strong></button>
								<button type="button" data-command="italic" aria-label="Kursiv" title="Kursiv"><em>I</em></button>
								<button type="button" data-command="formatBlock" data-value="h2" title="Überschrift">H2</button>
								<button type="button" data-command="formatBlock" data-value="p" title="Absatz">¶</button>
								${!isContact ? '<button type="button" data-command="formatBlock" data-value="blockquote" title="Zitat">“ Zitat</button>' : ""}
								<button type="button" data-command="insertUnorderedList" title="Liste">• Liste</button>
							</div>
							<div class="editor editor--${isContact ? "contact" : "copy"}" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${blockLabel(block.type)} ${index + 1}" data-editor="${block.id}" data-placeholder="${isContact ? "Anfragetext hier eingeben…" : "Text hier eingeben…"}">${editableHtml(block.html)}</div>
							${
                isContact
                  ? `
								<div class="contact-actions-preview" aria-label="Vorschau der automatisch ergänzten Kontaktmöglichkeiten">
									<span class="contact-actions-preview__label">Kontaktmöglichkeiten</span>
									<div class="contact-actions-preview__buttons" aria-hidden="true">
										<span>03 69 66 / 83 7 83</span>
										<span>E-Mail schreiben</span>
									</div>
								</div>`
                  : ""
              }`;
        }

        function poolImages() {
          return [...(state.cardFile ? [{ id: "__card__", file: state.cardFile, outputName: cardName(), url: state.cardUrl, alt: fields.cardAlt.value, altEn: fields.cardAltEn.value, caption: "", captionEn: "" }] : []), ...state.images];
        }

        function renderGalleryChoices(block) {
          const pool = poolImages();
          if (!pool.length) return '<div class="empty">Zuerst Bilder importieren.</div>';
          return `<div class="gallery-choices">${pool.map((image) => `
            <label class="gallery-choice"><input type="checkbox" data-gallery-block="${block.id}" value="${image.id}" ${block.imageIds.includes(image.id) ? "checked" : ""} />
            <img src="${image.url}" alt="" /><span>${escapeHtml(image.outputName)}</span></label>`).join("")}</div>
            <ol class="gallery-selected">${block.imageIds.map((imageId, index) => {
              const image = pool.find((item) => item.id === imageId);
              if (!image) return "";
              const meta = block.imageMeta?.[index] || image;
              return `<li><strong>${escapeHtml(image.outputName)}</strong>
                <label>Bildgröße<select data-image-size="${index}" data-size-block="${block.id}">${[["small", "Klein · 420 px"], ["medium", "Mittel · 840 px"], ["large", "Groß · Fensterbreite"]].map(([value, label]) => `<option value="${value}" ${(meta.size || "small") === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
                <label>Alternativtext des Galeriebilds<input data-entry-alt="${index}" data-entry-block="${block.id}" value="${escapeHtml(meta.alt)}" /></label>
                <label>Galerie-Bildunterschrift<input data-entry-caption="${index}" data-entry-block="${block.id}" value="${escapeHtml(meta.caption || "")}" /></label>
                <button type="button" class="btn btn--small" data-entry-move="${index}" data-entry-block="${block.id}" ${index === 0 ? "disabled" : ""}>Nach oben</button>
                ${!block.textSide && index < block.imageIds.length - 1 ? `<button type="button" class="btn btn--small" data-entry-split="${index}" data-entry-block="${block.id}">Galerie nach diesem Bild teilen</button>` : ""}
                <button type="button" class="btn btn--small" data-entry-remove="${index}" data-entry-block="${block.id}">Aus Galerie entfernen</button>
              </li>`;
            }).join("")}</ol>`;
        }

        function splitGallery(blockId, position) {
          const index = state.blocks.findIndex((block) => block.id === blockId);
          const block = state.blocks[index];
          if (!block || block.textSide || block.type !== "gallery" || !Number.isInteger(position) || position < 1 || position >= block.imageIds.length) return;
          const metadata = block.imageIds.map((_, index) => block.imageMeta?.[index] || null);
          const next = { ...block, id: id(), imageIds: block.imageIds.slice(position), imageMeta: metadata.slice(position) };
          block.imageIds = block.imageIds.slice(0, position);
          block.imageMeta = metadata.slice(0, position);
          state.blocks.splice(index + 1, 0, next);
          renderBlocks();
          notifyChange();
          setStatus([], "Galerie geteilt. Einen Text- oder Kontaktblock zwischen die beiden Galerien verschieben, um die Bildergruppe zu unterbrechen.");
          $(`[data-block-id='${next.id}'] button:not(:disabled)`)?.focus();
        }

        function previewHtml(html) {
          const template = document.createElement("template");
          template.innerHTML = sanitizeHtml(html || "");
          // Keep this offline even when authored content links to the public website.
          for (const link of template.content.querySelectorAll("a")) link.removeAttribute("href");
          return template.innerHTML;
        }

        function renderPagePreview() {
          const english = $("#preview-language").value === "en";
          const pool = poolImages();
          const text = (value) => escapeHtml(value || "");
          const photo = (image, meta, lead = false) => `<figure class="${lead ? 'lead vehicle-lead' : `story-image story-image--${meta.size || 'small'} photo-${meta.size || 'small'}`}"><span class="story-image__button"><img src="${text(image.url)}" alt="${text(english ? meta.altEn : meta.alt)}" /></span>${!lead && (english ? meta.captionEn : meta.caption) ? `<figcaption>${text(english ? meta.captionEn : meta.caption)}</figcaption>` : ""}</figure>`;
          const lead = pool.find((image) => image.id === state.leadImageId);
          const leadInStory = state.blocks.some((block) => block.type === "gallery" && block.imageIds.includes(state.leadImageId));
          const runs = [];
          for (const block of state.blocks) {
            if (block.type === "gallery") {
              const previous = runs.at(-1);
              const images = block.imageIds.flatMap((imageId, index) => {
                const image = pool.find((item) => item.id === imageId);
                return image ? [photo(image, block.imageMeta?.[index] || image)] : [];
              });
              if (!block.textSide && previous?.type === "gallery" && !previous.textSide) { previous.images.push(...images); previous.sized ||= block.imageMeta?.some(meta => meta?.size && meta.size !== "small"); }
              else runs.push({ type: "gallery", images, textSide: block.textSide, sized: block.imageIds.some((_, index) => block.imageMeta?.[index]?.size && block.imageMeta[index].size !== "small"), wide: block.imageMeta?.[0]?.size === "large", html: previewHtml(english ? block.htmlEn : block.html) });
            } else runs.push({ type: block.type, html: previewHtml(english ? block.htmlEn : block.html) });
          }
          const body = runs.map((run) => run.type === "gallery"
            ? `<div class="photos story-gallery${run.images.length > 1 ? " multiple story-gallery--multiple" : ""}${run.sized ? " sized story-gallery--sized" : ""}${run.textSide ? ` side side-${run.textSide} story-gallery--text${run.textSide === "right" ? " story-gallery--text-right" : ""}${run.wide ? " wide story-gallery--wide" : ""}` : ""}">${run.textSide ? `<div class="copy story-copy story-side-copy">${run.html}</div>` : ""}${run.images.join("")}</div>`
            : run.type === "contact" ? `<section class="contact story-contact"><div>${run.html}</div><div class="story-contact__actions"><a>03 69 66 / 83 7 83</a><a>${english ? "Send email" : "E-Mail schreiben"}</a></div></section>` : `<div class="copy story-copy">${run.html}</div>`).join("");
          const category = english ? { "aktuelle-projekte": "Current projects", "vergangene-projekte": "Completed projects", "fahrzeugangebote": "Cars for sale" }[fields.category.value] : fields.category.selectedOptions[0]?.textContent;
          $("#page-preview-frame").srcdoc = `<!doctype html><html lang="${english ? "en" : "de"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src blob: data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>
            @font-face{font-family:Lora;src:url("${presentation.fontDataUrl}") format("truetype");font-weight:400 700;font-display:swap}
            *{box-sizing:border-box}body{overflow-x:clip;margin:0;background:#eadba5;color:#fff;font-family:Lora,Georgia,serif;overflow-wrap:anywhere}a{color:inherit} .textured-background{position:relative;isolation:isolate} :root{--font-heading:Lora,Georgia,serif;--font-body:Lora,Georgia,serif}
            ${presentation.textureCss}
            ${presentation.gradientCss}
            ${presentation.websiteCss}
          </style></head><body><main class="vehicle-detail textured-background gradient-palette"><div class="background-texture"><div class="background-texture__viewport"><img class="background-texture__surface" src="${presentation.textureDataUrl}" alt=""></div><div class="background-texture__grain"></div></div><header class="vehicle-masthead"><p><a>${text(category)}</a></p><h1>${text(english ? fields.titleEn.value : fields.title.value) || "Titel fehlt"}</h1></header><div class="vehicle-documentation">${lead && !leadInStory ? photo(lead, { alt: fields.leadAlt.value, altEn: fields.leadAltEn.value }, true) : ""}<article class="vehicle-story">${body || '<p>Noch keine Inhaltsblöcke vorhanden.</p>'}</article></div></main></body></html>`;
          sizePagePreview();
        }

        function sizePagePreview() {
          const stage = $("#preview-stage");
          const frame = $("#page-preview-frame");
          const width = Number($("#preview-width").value);
          const scale = Math.min(1, stage.clientWidth / width);
          frame.style.width = `${width}px`;
          frame.style.transform = `scale(${scale})`;
          stage.style.height = `${720 * scale}px`;
        }

        $("#open-page-preview").addEventListener("click", () => {
          $("#page-preview-dialog").showModal();
          renderPagePreview();
          $("#close-page-preview").focus();
        });
        $("#close-page-preview").addEventListener("click", () => $("#page-preview-dialog").close());
        $("#page-preview-dialog").addEventListener("close", () => {
          $("#page-preview-frame").removeAttribute("srcdoc");
          $("#open-page-preview").focus();
        });
        for (const selector of ["#preview-language", "#preview-width"]) $(selector).addEventListener("change", renderPagePreview);
        new ResizeObserver(sizePagePreview).observe($("#preview-stage"));

        function updateSummary() {
          updateCompletion();
          const category = fields.category.value;
          const slug = fields.slug.value.trim();
          fields.sourceUrl.value = state.original && state.original.category === category
            ? state.original.sourceUrl
            : slug ? `https://www.oldtimermanufaktur.de/projekte/${category}/${slug}/` : "";
          $("#summary-category").textContent = category;
          $("#summary-slug").textContent = slug || "—";
          $("#summary-order").textContent = fields.autoOrder.checked
            ? state.autoOrderValue
              ? `${state.autoOrderValue} (automatisch: ${fields.prependOrder.checked ? "Anfang" : "Ende"})`
              : `automatisch (am ${fields.prependOrder.checked ? "Anfang" : "Ende"})`
            : fields.order.value || "—";
          $("#summary-images").textContent = String(
            state.images.length + (state.cardFile ? 1 : 0),
          );
          $("#summary-blocks").textContent = String(state.blocks.length);
          $("#description-count").textContent = String(fields.description.value.length);
          $("#description-count-en").textContent = String(fields.descriptionEn.value.length);
          updateCardDetails(); updateImageQuality();
          const displayCardName = state.cardFile
            ? cardName()
            : "card.ext";
          const imageLines = state.images
            .slice(0, 8)
            .map(
              (image, index) =>
                `${index === state.images.length - 1 && state.images.length <= 8 ? "    └──" : "    ├──"} ${image.outputName}`,
            );
          if (state.images.length > 8)
            imageLines.push(
              `    └── … ${state.images.length - 8} weitere Bilder`,
            );
          $("#file-tree").textContent =
            `${category}/\n├── ${slug || "fahrzeug-slug"}.astro\n└── ${slug || "fahrzeug-slug"}/\n    ├── vehicle.json\n    ├── ${displayCardName}${imageLines.length ? `\n${imageLines.join("\n")}` : ""}`;
          updateStepStatus();
        }

        function stripHtml(html) {
          const template = document.createElement("template");
          template.innerHTML = sanitizeHtml(html);
          return template.content.textContent.trim();
        }

        // CONTRACT: keep this policy aligned with oldtimer/src/config/vehicleHtml.js.
        function isSupportedContentLink(value) {
          if (/[\u0000-\u0020\u007f\\]/.test(value)) return false;
          const relative = value.startsWith("/") && !value.startsWith("//");
          try {
            const url = new URL(value, relative ? "https://www.oldtimermanufaktur.de" : undefined);
            return ["https:", "mailto:", "tel:"].includes(url.protocol) && Boolean(url.pathname) && !url.username && !url.password;
          } catch { return false; }
        }

        function editableHtml(html) {
          const template = document.createElement("template");
          template.innerHTML = sanitizeHtml(html || "");
          // Palette classes are the export contract. Native font elements make
          // imported/pasted colors editable and removable by browser commands.
          for (const span of template.content.querySelectorAll("span[class]")) {
            const color = textColors[span.className.replace("om-color-", "")];
            if (!color) continue;
            const font = document.createElement("font"); font.color = color;
            font.append(...span.childNodes); span.replaceWith(font);
          }
          return template.innerHTML;
        }

        function sanitizeHtml(html, report = {}) {
          const source = document.createElement("template");
          source.innerHTML = html;
          if (/<\s*(?:html|head|body)\b|<!doctype\b/i.test(html)) report.removed = true;
          const output = document.createElement("template");
          const tags = new Set(["p", "h2", "h3", "strong", "em", "br", "blockquote", "ul", "ol", "li", "a", "span"]);
          const discard = new Set(["script", "style", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "template", "noscript", "link", "meta", "base"]);
          const aliases = { b: "strong", i: "em", div: "p" };
          function copyNodes(from, to) {
            for (const node of from.childNodes) {
              if (node.nodeType === Node.TEXT_NODE) { to.append(document.createTextNode(node.textContent)); continue; }
              if (node.nodeType !== Node.ELEMENT_NODE) { report.removed = true; continue; }
              const name = node.localName;
              if (node.namespaceURI !== "http://www.w3.org/1999/xhtml" || discard.has(name)) { report.removed = true; continue; }
              const tag = name === "font" ? "span" : Object.hasOwn(aliases, name) ? aliases[name] : name;
              if (!tags.has(tag)) { report.removed = true; copyNodes(node, to); continue; }
              if (tag !== name) report.normalized = true;
              const clean = document.createElement(tag);
              for (const { name: attr, value } of node.attributes) {
                if (tag === "a" && (attr === "title" || (attr === "href" && isSupportedContentLink(value)))) clean.setAttribute(attr, value);
                else if (tag === "span" && attr === "class" && /^om-color-(black|red|green|blue|cyan|yellow|magenta)$/.test(value)) clean.className = value;
                else if (name === "font" && attr === "color" && colorKey(value)) clean.className = `om-color-${colorKey(value)}`;
                else report.removed = true;
              }
              copyNodes(node, clean);
              to.append(clean);
            }
          }
          copyNodes(source.content, output.content);
          return output.innerHTML.trim();
        }

        function validate() {
          const errors = bilingualIssues().map((issue) => issue.message);
          const slug = fields.slug.value.trim();
          if (!slug) errors.push("Der Slug ist erforderlich.");
          else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
            errors.push(
              "Der Slug darf nur Kleinbuchstaben, Ziffern und einzelne Bindestriche enthalten.",
            );
          if (slug && (!validVehicleFilename(slug + '.astro') || ['index', 'seite'].includes(slug))) errors.push("Der Slug ist reserviert oder zu lang. Bitte einen kürzeren, anderen Dateinamen verwenden.");
          if (
            !fields.autoOrder.checked &&
            (fields.order.value.trim() === "" ||
              !Number.isSafeInteger(Number(fields.order.value)))
          )
            errors.push(
              "Der manuelle Sortierwert muss eine sicher darstellbare ganze Zahl sein.",
            );
          if (!validDate(fields.dateModified.value)) errors.push("Das Änderungsdatum muss ein gültiges Kalenderdatum sein.");
          if (!categories.includes(fields.category.value)) errors.push("Ungültige Kategorie.");
          if (fields.year.value && !/^\d{4}$/.test(fields.year.value))
            errors.push("Das Baujahr muss aus genau vier Ziffern bestehen.");
          if (slug) {
            try {
              const url = new URL(fields.sourceUrl.value);
              if (!["http:", "https:"].includes(url.protocol)) throw new Error();
            } catch {
              errors.push("Die Quell-URL muss eine vollständige HTTP- oder HTTPS-Adresse sein.");
            }
          }
          if (!state.cardFile) errors.push("Ein Kartenbild ist erforderlich.");
          const leadIsValid =
            (state.leadImageId === "__card__" && state.cardFile) ||
            state.images.some((image) => image.id === state.leadImageId);
          if (!leadIsValid) errors.push("Ein Hauptbild für die Detailseite ist erforderlich.");
          state.blocks.forEach((block, index) => {
            if (block.type === "gallery") block.imageIds.forEach((imageId, imageIndex) => {
              const image = poolImages().find((item) => item.id === imageId);
              if (!image) errors.push(`Galerieblock ${index + 1}: Bild fehlt.`);
            });
            if (block.type === "gallery" && !block.imageIds.length)
              errors.push(`Galerieblock ${index + 1} enthält keine Bilder.`);
          });
          const galleryIds = new Set(
            state.blocks
              .filter((block) => block.type === "gallery")
              .flatMap((block) => block.imageIds),
          );
          const unused = state.images.filter(
            (image) =>
              !galleryIds.has(image.id) && image.id !== state.leadImageId,
          );
          return { errors, unused, warnings: imageQualityWarnings() };
        }

        function setStatus(errors, successMessage = "") {
          const status = $("#status");
          const startFeedback = $("#start-feedback");
          const workspaceStatus = $("#workspace-status");
          const messageHtml = errors.length
            ? `<strong>Bitte korrigieren:</strong><ul class="error-list">${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`
            : escapeHtml(successMessage || "Bereit zum Exportieren.");
          if (!$("#start-screen").hidden) {
            startFeedback.innerHTML = messageHtml;
            return;
          }
          if (state.currentStep !== "review" && (errors.length || successMessage)) {
            workspaceStatus.hidden = false;
            workspaceStatus.className = `workspace-status${successMessage && !errors.length ? " is-success" : ""}`;
            workspaceStatus.innerHTML = messageHtml;
            return;
          }
          workspaceStatus.hidden = true;
          if (errors.length) {
            status.className = "status status--error";
            status.innerHTML = messageHtml;
          } else {
            status.className = successMessage
              ? "status status--success"
              : "status";
            status.textContent = successMessage || "Bereit zum Exportieren.";
          }
        }

        function exportHtml(block, key) {
          const clean = sanitizeHtml(block[key] || "");
          const original = key === "html" ? "originalHtml" : "originalHtmlEn";
          return block[key] === block[original] ? block[key] : clean;
        }
        function createRecord() {
          const leadImage = state.images.find(
            (image) => image.id === state.leadImageId,
          );
          const record = {
            slug: fields.slug.value.trim(),
            category: fields.category.value,
            title: fields.title.value.trim(),
            titleEn: fields.titleEn.value.trim(),
            description: fields.description.value.trim(),
            descriptionEn: fields.descriptionEn.value.trim(),
            sourceUrl: state.original && state.original.category === fields.category.value ? state.original.sourceUrl : fields.sourceUrl.value.trim(),
            order: fields.autoOrder.checked
              ? state.autoOrderValue
              : Number(fields.order.value),
            dateModified: fields.dateModified.value,
          };
          if (fields.year.value) record.year = fields.year.value;
          record.cardImage = `./${cardName()}`;
          record.cardImageAlt = fields.cardAlt.value.trim();
          record.cardImageAltEn = fields.cardAltEn.value.trim();
          record.leadImage =
            state.leadImageId === "__card__"
              ? record.cardImage
              : `./${leadImage.outputName}`;
          record.leadImageAlt = fields.leadAlt.value.trim();
          record.leadImageAltEn = fields.leadAltEn.value.trim();
          record.blocks = state.blocks.map((block) => {
            if (block.type !== "gallery")
              return { type: block.type, html: exportHtml(block, "html"), htmlEn: exportHtml(block, "htmlEn") };
            return {
              type: "gallery",
              ...(block.textSide ? { textSide: block.textSide, html: exportHtml(block, "html"), htmlEn: exportHtml(block, "htmlEn") } : {}),
              images: block.imageIds.map((imageId, index) => {
                const image = poolImages().find((item) => item.id === imageId);
                const meta = block.imageMeta?.[index] || image;
                const entry = { ...(meta.size ? { size: meta.size } : {}), src: `./${image.outputName}`, alt: meta.alt.trim(), altEn: (meta.altEn || "").trim() };
                if (Object.hasOwn(meta, "caption") && meta.caption !== undefined) entry.caption = meta.caption;
                if (Object.hasOwn(meta, "captionEn") && meta.captionEn !== undefined) entry.captionEn = meta.captionEn;
                return entry;
              }),
            };
          });
          return record;
        }

        function createAstro(category, slug) {
          return `---\nimport { getEntry } from 'astro:content';\nimport VehicleDetailPage from '../../../components/VehicleDetailPage.astro';\n\nconst vehicle = await getEntry('vehicles', '${category}/${slug}');\n\nif (!vehicle) {\n\tthrow new Error('Missing vehicle content for ${category}/${slug}.');\n}\n---\n\n<VehicleDetailPage {vehicle} />\n`;
        }

        const crcTable = (() => {
          const table = new Uint32Array(256);
          for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++)
              c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            table[n] = c >>> 0;
          }
          return table;
        })();

        function crc32(bytes) {
          let crc = 0xffffffff;
          for (const byte of bytes)
            crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
          return (crc ^ 0xffffffff) >>> 0;
        }

        function zipDateTime(date = new Date()) {
          const year = Math.max(date.getFullYear(), 1980);
          return {
            time:
              (date.getHours() << 11) |
              (date.getMinutes() << 5) |
              Math.floor(date.getSeconds() / 2),
            date:
              ((year - 1980) << 9) |
              ((date.getMonth() + 1) << 5) |
              date.getDate(),
          };
        }

        function write16(view, offset, value) {
          view.setUint16(offset, value, true);
        }
        function write32(view, offset, value) {
          view.setUint32(offset, value, true);
        }

        async function makeZip(entries) {
          checkZipEntries(entries);
          const encoder = new TextEncoder();
          const locals = [];
          const centrals = [];
          let localOffset = 0;
          const stamp = zipDateTime();

          for (const entry of entries) {
            const name = encoder.encode(entry.name);
            const data =
              typeof entry.data === "string"
                ? encoder.encode(entry.data)
                : new Uint8Array(await entry.data.arrayBuffer());
            const checksum = crc32(data);
            const local = new Uint8Array(30 + name.length);
            const localView = new DataView(local.buffer);
            write32(localView, 0, 0x04034b50);
            write16(localView, 4, 20);
            write16(localView, 6, 0x0800);
            write16(localView, 8, 0);
            write16(localView, 10, stamp.time);
            write16(localView, 12, stamp.date);
            write32(localView, 14, checksum);
            write32(localView, 18, data.length);
            write32(localView, 22, data.length);
            write16(localView, 26, name.length);
            write16(localView, 28, 0);
            local.set(name, 30);

            const central = new Uint8Array(46 + name.length);
            const centralView = new DataView(central.buffer);
            write32(centralView, 0, 0x02014b50);
            write16(centralView, 4, 20);
            write16(centralView, 6, 20);
            write16(centralView, 8, 0x0800);
            write16(centralView, 10, 0);
            write16(centralView, 12, stamp.time);
            write16(centralView, 14, stamp.date);
            write32(centralView, 16, checksum);
            write32(centralView, 20, data.length);
            write32(centralView, 24, data.length);
            write16(centralView, 28, name.length);
            write16(centralView, 30, 0);
            write16(centralView, 32, 0);
            write16(centralView, 34, 0);
            write16(centralView, 36, 0);
            write32(centralView, 38, 0);
            write32(centralView, 42, localOffset);
            central.set(name, 46);

            locals.push(local, data);
            centrals.push(central);
            localOffset += local.length + data.length;
          }

          const centralSize = centrals.reduce(
            (size, part) => size + part.length,
            0,
          );
          const end = new Uint8Array(22);
          const endView = new DataView(end.buffer);
          write32(endView, 0, 0x06054b50);
          write16(endView, 4, 0);
          write16(endView, 6, 0);
          write16(endView, 8, entries.length);
          write16(endView, 10, entries.length);
          write32(endView, 12, centralSize);
          write32(endView, 16, localOffset);
          write16(endView, 20, 0);
          return new Blob([...locals, ...centrals, end], {
            type: "application/zip",
          });
        }

        async function generate() {
          if (state.busy) return;
          const button = $("#generate");
          const { errors, unused } = validate();
          if (errors.length) {
            let target = bilingualIssues()[0]?.element;
            const targetStep = target?.closest("[data-step]")?.dataset.step || firstIncompleteStep();
            showStep(targetStep);
            if (!target) target = targetStep === "images" ? $("#card-file") : targetStep === "content" ? $("#block-list button, #block-list input, #block-list [contenteditable]") : $("#title");
            setStatus(errors);
            requestAnimationFrame(() => {
              if (target) {
                target.closest("details")?.setAttribute("open", "");
                target.focus();
              }
              $("#workspace-status").scrollIntoView({
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
                block: "nearest",
              });
            });
            return;
          }
          setBusy(true);
          button.textContent = "ZIP wird erstellt…";
          setStatus([], "Dateien werden vorbereitet…");
          try {
            const snapshot = await prepareOutputSnapshot(editorSnapshot());
            updateSummary();
            await workflow?.prepareExport(snapshot);
            const record = snapshot.record;
            const base = `${record.category}`;
            const folder = `${base}/${record.slug}`;
            const entries = [
              {
                name: `${base}/${record.slug}.astro`,
                data: createAstro(record.category, record.slug),
              },
              {
                name: `${folder}/vehicle.json`,
                data: snapshot.recordText,
              },
              {
                name: `${folder}/${snapshot.images[0].name}`,
                data: snapshot.images[0].file,
              },
              ...snapshot.images.slice(1).map((image) => ({
                name: `${folder}/${image.name}`,
                data: image.file,
              })),
            ];
            const zip = await makeZip(entries);
            const url = URL.createObjectURL(zip);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `${record.category}-${record.slug}.zip`;
            document.body.append(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            const unusedNote = unused.length
              ? ` Hinweis: ${unused.length} ungenutzte Bilder sind im Export enthalten.`
              : "";
            setStatus(
              [],
              `ZIP mit ${entries.length} Dateien erstellt (${humanSize(zip.size)}).${unusedNote}`,
            );
            $("#after-export").hidden = false;
          } catch (error) {
            setStatus([
              `Export fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
            ]);
          } finally {
            setBusy(false);
            button.textContent = window.VehicleWebsiteTools ? "ZIP herunterladen (optional)" : "ZIP herunterladen";
          }
        }

        function setupDropZone(element, onFiles) {
          for (const eventName of ["dragenter", "dragover"]) {
            element.addEventListener(eventName, (event) => {
              event.preventDefault();
              element.classList.add("is-over");
            });
          }
          for (const eventName of ["dragleave", "drop"]) {
            element.addEventListener(eventName, (event) => {
              event.preventDefault();
              element.classList.remove("is-over");
            });
          }
          element.addEventListener("drop", (event) =>
            onFiles(event.dataTransfer.files),
          );
        }

        fields.title.addEventListener("input", updateAutoText);
        fields.titleEn.addEventListener("input", updateAutoText);
        fields.slug.addEventListener("input", () => {
          state.slugWasEdited = true;
          state.autoOrderValue = null;
          updateSummary();
        });
        fields.category.addEventListener("change", () => {
          state.autoOrderValue = null;
          updateSummary();
        });
        fields.autoOrder.addEventListener("change", () => {
          const automatic = fields.autoOrder.checked;
          $("#manual-order-wrap").hidden = automatic;
          fields.order.disabled = automatic;
          fields.prependOrder.disabled = !automatic;
          state.autoOrderValue = null;
          updateSummary();
        });
        fields.prependOrder.addEventListener("change", () => {
          state.autoOrderValue = null;
          updateSummary();
        });
        fields.order.addEventListener("input", updateSummary);
        fields.description.addEventListener("input", updateSummary);
        $("#refresh-slug").addEventListener("click", () => {
          fields.slug.value = slugify(fields.title.value);
          state.slugWasEdited = false;
          state.autoOrderValue = null;
          updateSummary();
        });
        fields.cardAlt.addEventListener("input", () => {
          fields.cardAlt.dataset.touched = "true";
        });
        fields.leadAlt.addEventListener("input", () => {
          fields.leadAlt.dataset.touched = "true";
        });
        fields.leadImage.addEventListener("change", () => {
          state.leadImageId = fields.leadImage.value;
        });
        $("#card-file").addEventListener("change", (event) =>
          setCardFile(event.target.files[0]),
        );
        $("#watermark-all").addEventListener("change", event => {
          state.watermarkEnabled = event.target.checked;
          notifyChange();
          setStatus([], state.watermarkEnabled
            ? window.VehicleWebsiteTools ? "Wasserzeichen werden beim ZIP-Download oder Speichern erstellt." : "Wasserzeichen werden beim ZIP-Download erstellt."
            : "Wasserzeichen deaktiviert.");
        });

        $("#gallery-files").addEventListener("change", (event) => {
          addGalleryFiles(event.target.files);
          event.target.value = "";
        });
        setupDropZone($("#card-drop"), (files) => setCardFile(files[0]));
        setupDropZone($("#gallery-drop"), addGalleryFiles);

        $("#image-list").addEventListener("input", (event) => {
          const image = state.images.find(
            (item) =>
              item.id === event.target.dataset.imageAlt ||
              item.id === event.target.dataset.imageCaption,
          );
          if (!image) return;
          if (event.target.dataset.imageAlt) {
            image[event.target.dataset.language === "en" ? "altEn" : "alt"] = event.target.value;
            image[event.target.dataset.language === "en" ? "altEnTouched" : "altTouched"] = true;
          }
          if (event.target.dataset.imageCaption)
            image[event.target.dataset.language === "en" ? "captionEn" : "caption"] = event.target.value;
        });

        $("#image-list").addEventListener("click", (event) => {
          const move = event.target.closest("[data-image-move]");
          const remove = event.target.closest("[data-image-remove]");
          if (move) {
            const index = state.images.findIndex(
              (image) => image.id === move.dataset.id,
            );
            moveItem(
              state.images,
              index,
              index + (move.dataset.imageMove === "up" ? -1 : 1),
            );
            renumberImages();
            renderImages();
            renderBlocks();
            notifyChange(); focusImage(move.dataset.id, move.dataset.imageMove);
            structuralStatus.textContent = `Bild an Position ${state.images.findIndex(image => image.id === move.dataset.id) + 1} verschoben.`;
          }
          if (remove) {
            const index = state.images.findIndex(
              (image) => image.id === remove.dataset.imageRemove,
            );
            if (index < 0) return;
            URL.revokeObjectURL(state.images[index].url);
            const removedId = state.images[index].id;
            state.images.splice(index, 1);
            state.blocks.forEach((block) => {
              const keep = block.imageIds.map((imageId, i) => ({ imageId, meta: block.imageMeta?.[i] })).filter((entry) => entry.imageId !== removedId);
              block.imageIds = keep.map((entry) => entry.imageId);
              block.imageMeta = keep.map((entry) => entry.meta);
            });
            if (state.leadImageId === removedId)
              state.leadImageId = state.cardFile
                ? "__card__"
                : state.images[0]?.id || "";
            renumberImages();
            renderImages();
            renderBlocks();
            notifyChange(); focusImage((state.images[index] || state.images[index - 1])?.id);
            structuralStatus.textContent = "Bild entfernt. Galerien und Hauptbildauswahl wurden aktualisiert.";
          }
        });

        $("#image-list").addEventListener("dragstart", (event) => {
          const item = event.target.closest("[data-image-id]");
          if (!item || !event.target.closest(".drag-handle")) { event.preventDefault(); return; }
          event.dataTransfer.setData("text/plain", item.dataset.imageId);
          state.draggedImageId = item.dataset.imageId;
          item.classList.add("is-dragging");
        });
        $("#image-list").addEventListener("dragend", (event) => {
          event.target.closest("[data-image-id]")?.classList.remove("is-dragging");
          state.draggedImageId = "";
        });
        $("#image-list").addEventListener("dragover", (event) =>
          event.preventDefault(),
        );
        $("#image-list").addEventListener("drop", (event) => {
          const target = event.target.closest("[data-image-id]");
          if (
            !target ||
            !state.draggedImageId ||
            target.dataset.imageId === state.draggedImageId
          )
            return;
          const from = state.images.findIndex(
            (image) => image.id === state.draggedImageId,
          );
          const to = state.images.findIndex(
            (image) => image.id === target.dataset.imageId,
          );
          const movedId = state.draggedImageId;
          moveItem(state.images, from, to);
          renumberImages();
          renderImages();
          renderBlocks();
          notifyChange(); focusImage(movedId);
          structuralStatus.textContent = `Bild an Position ${to + 1} verschoben.`;
          state.draggedImageId = "";
        });

        $$("[data-add-block]").forEach((button) =>
          button.addEventListener("click", () =>
            addBlock(button.dataset.addBlock),
          ),
        );

        $("#block-list").addEventListener("input", (event) => {
          const editor = event.target.closest("[data-editor]");
          if (editor) {
            const block = state.blocks.find(
              (item) => item.id === editor.dataset.editor,
            );
            if (block) block[editor.dataset.language === "en" ? "htmlEn" : "html"] = sanitizeHtml(editor.innerHTML);
            notifyChange(true);
          }
        });

        $("#block-list").addEventListener("change", (event) => {
          if (!event.target.matches("[data-gallery-block]")) return;
          const block = state.blocks.find((item) => item.id === event.target.dataset.galleryBlock);
          if (!block) return;
          block.imageMeta ||= block.imageIds.map(() => null);
          if (event.target.checked) {
            if (block.textSide) { block.imageIds = []; block.imageMeta = []; }
            const reused = state.blocks.some((item) => item.imageIds.includes(event.target.value));
            block.imageIds.push(event.target.value);
            block.imageMeta.push(null);
            if (reused) setStatus([], "Hinweis: Dieses Bild wird in mehreren Galerieblöcken verwendet.");
          } else {
            const keep = block.imageIds.map((imageId, index) => ({ imageId, meta: block.imageMeta[index] })).filter((item) => item.imageId !== event.target.value);
            block.imageIds = keep.map((item) => item.imageId);
            block.imageMeta = keep.map((item) => item.meta);
          }
          renderBlocks();
          $("[data-gallery-block='" + block.id + "'][value='" + event.target.value + "']")?.focus();
          updateSummary();
        });

        $("#block-list").addEventListener("change", (event) => {
          const input = event.target;
          if (input.dataset.textSide) {
            state.blocks.find(block => block.id === input.dataset.textSide).textSide = input.value;
          } else if (input.dataset.sizeBlock) {
            const block = state.blocks.find(block => block.id === input.dataset.sizeBlock);
            const index = Number(input.dataset.imageSize);
            block.imageMeta[index] ||= { ...poolImages().find(image => image.id === block.imageIds[index]) };
            block.imageMeta[index].size = input.value;
          } else return;
          notifyChange();
        });

        const editorRanges = new WeakMap();
        const editorTypingStyles = new WeakMap();
        function selectedEditor() {
          const selection = getSelection();
          if (!selection?.rangeCount) return null;
          const node = selection.anchorNode;
          const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
          const editor = element?.closest("[data-editor]");
          return editor && editor.contains(selection.getRangeAt(0).commonAncestorContainer) ? editor : null;
        }
        function rememberEditorSelection(editor) {
          lastEditorBlockId = editor.dataset.editor;
          if (selectedEditor() !== editor) return;
          const range = getSelection().getRangeAt(0);
          editorRanges.set(editor, range.cloneRange());
          if (range.collapsed && document.activeElement === editor) editorTypingStyles.set(editor, {
            bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"),
            color: paletteColor(document.queryCommandValue("foreColor")),
          });
        }
        function colorKey(value) {
          const lower = String(value).toLowerCase().trim();
          const rgb = lower.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
          const color = rgb ? `#${rgb.slice(1).map(channel => Number(channel).toString(16).padStart(2, "0")).join("")}` : lower;
          return Object.keys(textColors).find(key => textColors[key] === color || presentation.legacyColors[key] === color);
        }
        function paletteColor(value) {
          const lower = String(value).toLowerCase();
          if (colorKey(lower)) return textColors[colorKey(lower)];
          const rgb = lower.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
          const color = rgb ? `#${rgb.slice(1).map(channel => Number(channel).toString(16).padStart(2, "0")).join("")}` : "";
          return colorKey(color) ? textColors[colorKey(color)] : "";
        }
        function updateTextToolbar(editor) {
          if (selectedEditor() !== editor || document.activeElement !== editor) return;
          const toolbar = $(".toolbar", editor.closest(".language-editor"));
          const block = document.queryCommandValue("formatBlock").toLowerCase();
          for (const button of $$("[data-command]", toolbar)) {
            const command = button.dataset.command;
            if (["bold", "italic", "insertUnorderedList"].includes(command)) button.setAttribute("aria-pressed", String(document.queryCommandState(command)));
            else if (command === "formatBlock") button.setAttribute("aria-pressed", String(block === button.dataset.value));
          }
          const color = paletteColor(document.queryCommandValue("foreColor"));
          $("[data-text-color]", toolbar).value = Object.values(textColors).includes(color) ? color : textColors.black;
        }
        function commitEditorInput(editor) {
          const block = state.blocks.find(item => item.id === editor.dataset.editor);
          if (block) block[editor.dataset.language === "en" ? "htmlEn" : "html"] = sanitizeHtml(editor.innerHTML);
          rememberEditorSelection(editor);
          updateTextToolbar(editor);
          notifyChange(true);
        }
        function textSelectionOffsets(editor, range) {
          if (!range || !editor.contains(range.commonAncestorContainer)) return null;
          const prefix = document.createRange(); prefix.selectNodeContents(editor);
          prefix.setEnd(range.startContainer, range.startOffset);
          const start = prefix.toString().length;
          prefix.setEnd(range.endContainer, range.endOffset);
          return [start, prefix.toString().length];
        }
        function restoreTextOffsets(editor, offsets) {
          if (!offsets) return;
          const point = offset => {
            const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
              if (offset <= node.length) return [node, offset];
              offset -= node.length;
            }
            return [editor, editor.childNodes.length];
          };
          const range = document.createRange();
          range.setStart(...point(offsets[0])); range.setEnd(...point(offsets[1]));
          const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        }
        function restoreTypingStyles(typing) {
          if (!typing) return;
          for (const name of ["bold", "italic"]) if (document.queryCommandState(name) !== typing[name]) document.execCommand(name);
          if (Object.values(textColors).includes(typing.color) && paletteColor(document.queryCommandValue("foreColor")) !== typing.color) document.execCommand("foreColor", false, typing.color);
        }
        function runTextCommand(control, command, value = null) {
          const editor = $("[data-editor]", control.closest(".language-editor"));
          const alreadyEditing = document.activeElement === editor && selectedEditor() === editor;
          if (alreadyEditing) rememberEditorSelection(editor);
          const range = editorRanges.get(editor);
          const typing = editorTypingStyles.get(editor);
          // Do not refocus an already active editor: that can reset pending typing styles.
          if (!alreadyEditing) editor.focus({ preventScroll: true });
          const selection = getSelection();
          if (!alreadyEditing && range && editor.contains(range.commonAncestorContainer)) {
            selection.removeAllRanges(); selection.addRange(range);
          } else if (selectedEditor() !== editor) {
            const end = document.createRange(); end.selectNodeContents(editor); end.collapse(false);
            selection.removeAllRanges(); selection.addRange(end);
          }
          document.execCommand("styleWithCSS", false, false);
          // A native select temporarily owns focus. Restore pending collapsed-caret
          // styles as well as the range before applying its chosen color.
          if (!alreadyEditing && range?.collapsed && typing) {
            restoreTypingStyles(typing);
          }
          const offsets = ["formatBlock", "insertUnorderedList"].includes(command) ? textSelectionOffsets(editor, selection.getRangeAt(0)) : null;
          document.execCommand(command, false, value);
          if (command === "removeFormat" && getSelection().getRangeAt(0).collapsed) {
            // Native removeFormat is a no-op for a collapsed caret in Chromium.
            for (const name of ["bold", "italic"]) if (document.queryCommandState(name)) document.execCommand(name);
            document.execCommand("foreColor", false, textColors.black);
          }
          // Native block/list transformations can place the caret at the start.
          // Restore its text position without rewriting DOM or discarding undo.
          if (offsets) {
            const current = getSelection();
            const after = current?.rangeCount ? textSelectionOffsets(editor, current.getRangeAt(0)) : null;
            if (!after || offsets.some((value, index) => value !== after[index])) restoreTextOffsets(editor, offsets);
            if (offsets[0] === offsets[1]) restoreTypingStyles(typing);
          }
          commitEditorInput(editor);
        }
        document.addEventListener("selectionchange", () => {
          const editor = selectedEditor();
          if (editor) { rememberEditorSelection(editor); updateTextToolbar(editor); }
        });
        for (const name of ["input", "keyup", "mouseup", "focusin"]) $("#block-list").addEventListener(name, event => {
          const editor = event.target.closest("[data-editor]");
          if (editor) { rememberEditorSelection(editor); updateTextToolbar(editor); }
        });
        $("#block-list").addEventListener("mousedown", event => {
          const control = event.target.closest("[data-command], [data-text-color]");
          if (!control) return;
          const editor = $("[data-editor]", control.closest(".language-editor"));
          rememberEditorSelection(editor);
          if (control.matches("button")) event.preventDefault();
        });
        $("#block-list").addEventListener("click", event => {
          const button = event.target.closest("[data-command]");
          if (button) runTextCommand(button, button.dataset.command, button.dataset.value || null);
        });
        $("#block-list").addEventListener("change", event => {
          if (event.target.matches("[data-text-color]")) runTextCommand(event.target, "foreColor", event.target.value);
        });

        $("#block-list").addEventListener("click", (event) => {
          const move = event.target.closest("[data-block-move]");
          const remove = event.target.closest("[data-block-remove]");
          if (move) {
            const index = state.blocks.findIndex(
              (block) => block.id === move.dataset.id,
            );
            moveItem(
              state.blocks,
              index,
              index + (move.dataset.blockMove === "up" ? -1 : 1),
            );
            renderBlocks();
            notifyChange(); focusBlock(move.dataset.id, move.dataset.blockMove);
            structuralStatus.textContent = `Block an Position ${state.blocks.findIndex(block => block.id === move.dataset.id) + 1} verschoben.`;
          }
          if (remove) {
            const index = state.blocks.findIndex(block => block.id === remove.dataset.blockRemove);
            if (index < 0) return;
            removedBlocks.push({ block: structuredClone(state.blocks[index]), index, previous: state.blocks[index - 1]?.id, next: state.blocks[index + 1]?.id });
            if (removedBlocks.length > 20) removedBlocks.shift();
            state.blocks.splice(index, 1);
            renderBlocks(); updateUndo(); notifyChange();
            const neighbour = state.blocks[index] || state.blocks[index - 1];
            if (neighbour) focusBlock(neighbour.id); else $('[data-add-block="copy"]').focus();
            structuralStatus.textContent = "Block entfernt. Mit „Letzten Block wiederherstellen“ rückgängig machen.";
          }
        });

        $("#block-list").addEventListener("dragstart", (event) => {
          if (event.target.closest('input, button, [contenteditable="true"]')) {
            event.preventDefault();
            return;
          }
          const item = event.target.closest("[data-block-id]");
          if (!item || !event.target.closest(".drag-handle")) { event.preventDefault(); return; }
          event.dataTransfer.setData("text/plain", item.dataset.blockId);
          state.draggedBlockId = item.dataset.blockId;
          item.classList.add("is-dragging");
        });
        $("#block-list").addEventListener("dragend", (event) => {
          event.target.closest("[data-block-id]")?.classList.remove("is-dragging");
          state.draggedBlockId = "";
        });
        $("#block-list").addEventListener("dragover", (event) =>
          event.preventDefault(),
        );
        $("#block-list").addEventListener("drop", (event) => {
          const target = event.target.closest("[data-block-id]");
          if (
            !target ||
            !state.draggedBlockId ||
            target.dataset.blockId === state.draggedBlockId
          )
            return;
          const from = state.blocks.findIndex(
            (block) => block.id === state.draggedBlockId,
          );
          const to = state.blocks.findIndex(
            (block) => block.id === target.dataset.blockId,
          );
          const movedId = state.draggedBlockId;
          moveItem(state.blocks, from, to);
          renderBlocks();
          notifyChange(); focusBlock(movedId);
          structuralStatus.textContent = `Block an Position ${to + 1} verschoben.`;
          state.draggedBlockId = "";
        });

        $("#generate").addEventListener("click", generate);
        function resetEditor() {
          if (state.cardUrl) URL.revokeObjectURL(state.cardUrl);
          state.images.forEach(image => URL.revokeObjectURL(image.url));
          removedBlocks.length = 0; updateUndo();
          $("#vehicle-form").reset();
          for (const field of Object.values(fields)) delete field.dataset.touched;
          Object.assign(state, { mode: "new", watermarkEnabled: false, original: null, cardFile: null, cardName: "", cardUrl: "", images: [], blocks: [], leadImageId: "", autoOrderValue: null, slugWasEdited: false });
          $("#watermark-all").checked = false;
          fields.slug.readOnly = false;
          $("#refresh-slug").disabled = false;
          fields.autoOrder.checked = true;
          fields.order.disabled = true;
          fields.prependOrder.disabled = false;
          $("#manual-order-wrap").hidden = true;
          fields.dateModified.value = localDate();
          showCard(); renderImages(); renderBlocks(); updateSummary();
        }
        const preparedWatermarkFiles = new WeakMap();
        function validateSnapshotSize(recordText, images) {
          const jsonSize = new TextEncoder().encode(recordText).length;
          if (jsonSize > 2 * 1024 ** 2 || images.length + 1 > 2000 || images.some(image => image.file.size > maxImageBytes) || jsonSize + images.reduce((sum, image) => sum + image.file.size, 0) > maxExportBytes) throw new Error("Das Fahrzeug überschreitet die Dateigrenzen: 2 MiB JSON, 50 MiB je Bild, 2000 Dateien oder 512 MiB insgesamt. Bitte Inhalte reduzieren.");
        }
        async function prepareOutputSnapshot(snapshot) {
          if (!snapshot.watermarkEnabled || snapshot.watermarkPrepared) return snapshot;
          if (typeof window.VehicleWatermark !== "function") throw new Error(window.VehicleWebsiteTools
            ? "Die Wasserzeichen-Funktion wurde nicht geladen. Bitte die Website-Werkzeuge neu starten und die Editorseite neu laden."
            : "Die Wasserzeichen-Funktion wurde nicht geladen. Bitte watermark.js im selben Ordner wie index.html ablegen und den Editor neu öffnen.");
          // Only final output creates derived files. The editor keeps original
          // bytes, filenames and preview URLs even if preparation fails.
          const names = new Map(snapshot.images.map(image => [image.name, image.name.replace(/\.[^.]+$/, ".webp")]));
          if (new Set([...names.values()].map(name => name.toLowerCase())).size !== snapshot.images.length) throw new Error("Bildnamen kollidieren nach der WebP-Konvertierung. Bitte unterschiedliche Bildnamen verwenden.");
          const images = [];
          for (const [index, image] of snapshot.images.entries()) {
            setStatus([], `Wasserzeichen werden erstellt … ${index + 1} / ${snapshot.images.length}`);
            let file = preparedWatermarkFiles.get(image.file);
            if (!file) {
              file = await window.VehicleWatermark(image.file);
              if (file.type !== "image/webp") throw new Error("Wasserzeichen konnte nicht als WebP erstellt werden. Bitte erneut versuchen.");
              await checkImage(file);
              preparedWatermarkFiles.set(image.file, file);
            }
            images.push({ name: names.get(image.name), file });
          }
          const record = JSON.parse(snapshot.recordText);
          const imagePath = path => {
            const name = names.get(path.slice(2));
            if (!name) throw new Error(`Bilddatei fehlt: ${path}`);
            return `./${name}`;
          };
          record.cardImage = imagePath(record.cardImage);
          record.leadImage = imagePath(record.leadImage);
          for (const block of record.blocks) if (block.type === "gallery") for (const image of block.images) image.src = imagePath(image.src);
          validateRecord(record);
          const recordText = `${JSON.stringify(record, null, "\t")}\n`;
          validateSnapshotSize(recordText, images);
          return { ...snapshot, record, recordText, images, watermarkPrepared: true };
        }

        function editorSnapshot() {
          const { errors } = validate();
          if (errors.length) throw new Error(errors.join("\n"));
          if (fields.autoOrder.checked && !state.autoOrderValue) state.autoOrderValue = Date.now() * (fields.prependOrder.checked ? -1 : 1);
          const record = createRecord();
          validateRecord(record);
          const recordText = `${JSON.stringify(record, null, "\t")}\n`;
          const images = [{ name: cardName(), file: state.cardFile }, ...state.images.map(image => ({ name: image.outputName, file: image.file }))];
          validateSnapshotSize(recordText, images);
          return { record, recordText, images, watermarkEnabled: state.watermarkEnabled };
        }
        workflow = window.VehicleDemoUI({ state, fields, showStep, showEditor, resetEditor, importVehicle, validateRecord, checkImage, createAstro, editorSnapshot, prepareOutputSnapshot, updateSummary, validate, setBusy });
        window.VehicleWebsiteTools?.attach(workflow?.websiteTools);
        showStep("project");
        updateSummary();
      })();
