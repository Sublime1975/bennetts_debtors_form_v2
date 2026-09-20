/**
 * Bennett's Debtors Application — Firebase submit helper.
 * Keeps the existing UI; writes Firestore + Storage. Email is sent by Cloud Functions (Resend free).
 */
(function (global) {
  "use strict";

  const META_KEYS = ["name", "size", "type", "url", "path"];

  function isConfigured() {
    const c = global.BENNETTS_FIREBASE;
    return !!(c && c.apiKey && c.projectId && c.apiKey !== "YOUR_API_KEY");
  }

  function ensureApp() {
    if (!isConfigured()) {
      throw new Error("Firebase is not configured. Copy public/firebase-config.example.js to public/firebase-config.js and add your web app keys.");
    }
    if (!global.firebase) {
      throw new Error("Firebase SDK failed to load.");
    }
    if (!global.firebase.apps.length) {
      global.firebase.initializeApp(global.BENNETTS_FIREBASE);
    }
    return global.firebase.app();
  }

  function fileMetaOnly(entry) {
    if (!entry) return null;
    const out = {};
    META_KEYS.forEach((k) => {
      if (entry[k] != null) out[k] = entry[k];
    });
    return Object.keys(out).length ? out : null;
  }

  function stripFilesFromForm(formData) {
    function clean(value) {
      if (value == null) return value;
      if (typeof File !== "undefined" && value instanceof File) return undefined;
      if (Array.isArray(value)) return value.map(clean);
      if (typeof value === "object") {
        // File meta blob from dropzone
        if (value.file || (value.name && value.size != null && value.type && !value.url && !value.path && !value.tradingName)) {
          return {
            name: value.name,
            size: value.size,
            type: value.type,
            url: value.url || null,
            path: value.path || null,
          };
        }
        const out = {};
        Object.keys(value).forEach((k) => {
          if (k === "file") return;
          out[k] = clean(value[k]);
        });
        return out;
      }
      return value;
    }
    return clean(formData);
  }

  async function uploadOne(storage, refNumber, fieldKey, entry) {
    if (!entry || !entry.file) return fileMetaOnly(entry);
    const safeName = String(entry.name || "upload").replace(/[^\w.\-]+/g, "_");
    const path = `applications/${refNumber}/${fieldKey}/${Date.now()}-${safeName}`;
    const storageRef = storage.ref().child(path);
    await storageRef.put(entry.file, { contentType: entry.type || entry.file.type });
    // Private bucket: store path for Admin/Console; signed URLs can be generated server-side later.
    return {
      name: entry.name,
      size: entry.size,
      type: entry.type,
      path,
    };
  }

  async function uploadDocumentMap(storage, refNumber, documents) {
    const out = {};
    const keys = Object.keys(documents || {});
    for (const key of keys) {
      out[key] = await uploadOne(storage, refNumber, key, documents[key]);
    }
    return out;
  }

  async function uploadDirectorIds(storage, refNumber, directors) {
    const out = [];
    for (let i = 0; i < (directors || []).length; i++) {
      const d = directors[i];
      const idDocument = await uploadOne(storage, refNumber, `director-${i}-id`, d.idDocument);
      let drawnPath = null;
      if (d.suretyshipDrawnSignature && typeof d.suretyshipDrawnSignature === "string" && d.suretyshipDrawnSignature.startsWith("data:")) {
        const blob = await (await fetch(d.suretyshipDrawnSignature)).blob();
        const path = `applications/${refNumber}/director-${i}-signature/drawn.png`;
        await storage.ref().child(path).put(blob, { contentType: blob.type || "image/png" });
        drawnPath = path;
      }
      out.push({
        fullName: d.fullName,
        idNumber: d.idNumber,
        residentialAddress: d.residentialAddress,
        idDocument,
        suretyshipAgreed: !!d.suretyshipAgreed,
        suretyshipSignature: d.suretyshipSignature,
        suretyshipDate: d.suretyshipDate,
        suretyshipDrawnSignaturePath: drawnPath,
      });
    }
    return out;
  }

  /**
   * @param {{ formData: object, referenceNumber: string }} payload
   */
  async function submitApplication(payload) {
    ensureApp();
    const { formData, referenceNumber } = payload;
    const db = global.firebase.firestore();
    const storage = global.firebase.storage();

    const documents = await uploadDocumentMap(storage, referenceNumber, formData.documents);
    const directors = await uploadDirectorIds(storage, referenceNumber, formData.directors);

    const base = stripFilesFromForm(formData);
    base.documents = documents;
    base.directors = directors;

    const doc = {
      referenceNumber,
      createdAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      status: "new",
      emailStatus: "pending",
      company: base.company,
      contact: base.contact,
      directors: base.directors,
      references: base.references,
      tax: base.tax,
      banking: base.banking,
      documents: base.documents,
      credit: base.credit,
      declaration: base.declaration,
      consent: base.consent,
    };

    await db.collection("applications").doc(referenceNumber).set(doc);
    return { referenceNumber, id: referenceNumber };
  }

  global.BennettsFirebaseSubmit = {
    isConfigured,
    submitApplication,
  };
})(typeof window !== "undefined" ? window : globalThis);
