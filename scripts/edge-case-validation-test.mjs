/**
 * Edge-case battle tests for Debtors Application validators.
 * Mirrors the regexes + validation logic from Debtors Application.dc.html
 * so we can exercise inputs without the design-component runtime.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email) => {
  const value = String(email || "").trim();
  if (!EMAIL_RE.test(value)) return false;
  if (value.includes("..")) return false;
  const [local, domain] = value.split("@");
  if (!local || !domain) return false;
  if (local.startsWith(".") || local.endsWith(".") || domain.startsWith(".") || domain.endsWith(".")) return false;
  return domain.split(".").every((part) => part.length > 0);
};
const SA_PHONE_RE = /^(\+27|0)[1-9]\d{8}$/;
const GENERIC_PHONE_RE = /^\+?[1-9]\d{7,14}$/;
const SA_ID_RE = /^\d{13}$/;
const VAT_RE = /^4\d{9}$/;
const INCOME_TAX_RE = /^[01239]\d{9}$/;
const CIPC_RE = /^\d{4}\/\d{6}\/\d{2}$/;
const BRANCH_CODE_RE = /^\d{6}$/;
const ACCOUNT_NUMBER_RE = /^\d{6,16}$/;
const SWIFT_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

function requireField(errors, key, value, message) {
  if (!value || String(value).trim() === "") errors[key] = message || "This field is required";
}
function isPhoneValid(phone, isLocal) {
  const stripped = phone.replace(/[\s\-()]/g, "");
  return isLocal ? SA_PHONE_RE.test(stripped) : SA_PHONE_RE.test(stripped) || GENERIC_PHONE_RE.test(stripped);
}
function formatPhoneNumber(raw, isLocal) {
  if (!raw) return "";
  let digits = raw.trim().replace(/[^\d+]/g, "");
  const hadPlus = digits.startsWith("+");
  digits = digits.replace(/\+/g, "");
  if (!digits) return "";
  if (isLocal) {
    if (digits.startsWith("0")) digits = "27" + digits.slice(1);
    else if (!digits.startsWith("27")) digits = "27" + digits;
    return "+" + digits;
  }
  return (hadPlus ? "+" : "") + digits;
}
function isValidSaIdChecksum(id) {
  let sum = 0, alternate = false;
  for (let i = id.length - 1; i >= 0; i--) {
    let digit = parseInt(id[i], 10);
    if (alternate) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}
function validateRegNumberFormat(entityType, value) {
  if (entityType === "CC") {
    if (!/^CK\d{2,4}\/\d{4,6}$/i.test(value)) return "Enter a valid CK registration number, e.g. CK2007/123456";
  } else if (entityType === "Sole Proprietor" || entityType === "Partnership") {
    if (!INCOME_TAX_RE.test(value)) return "Income tax number must be 10 digits, starting with 0, 1, 2, 3 or 9";
  } else if (entityType === "Trust") {
    if (!/^IT\s?\d{1,6}\/\d{2,4}$/i.test(value)) return "Enter a valid Trust (IT) number, e.g. IT1234/17";
  } else if (!CIPC_RE.test(value)) {
    return "Enter a valid CIPC number, e.g. 2020/123456/07";
  }
  return null;
}
function isSameName(a, b) {
  const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return normalize(a) === normalize(b) && normalize(a).length > 0;
}

function blankDirector() {
  const today = new Date();
  const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  return { fullName:"", idNumber:"", residentialAddress:"", idDocument:null, suretyshipAgreed:false, suretyshipSignature:"", suretyshipDate:todayStr, suretyshipDrawnSignature:null };
}

function initialFormData() {
  return {
    company: { tradingName:"", registeredName:"", website:"", entityType:"", isForeignEntity:null, cipcNumber:"", countryOfRegistration:"", foreignRegistrationNumber:"" },
    contact: { country:"South Africa", accountsContactName:"", accountsEmail:"", accountsPhone:"", accountsCell:"", accountsPhysicalAddress:"", accountsPostalAddress:"", accountsPostalSameAsPhysical:false, buyerContactDifferent:false, buyerContactName:"", buyerEmail:"", buyerPhone:"", buyerCell:"" },
    directors: [blankDirector()],
    references: { tradeRef1:{companyName:"",contactPerson:"",phone:"",email:""}, tradeRef2:{companyName:"",contactPerson:"",phone:"",email:""} },
    tax: { vatRegistered:null, vatNumber:"", incomeTaxNumber:"", bbeeLevel:"" },
    banking: { isForeignBank:false, bankName:"", accountHolder:"", accountNumber:"", branchCode:"", accountType:"", swiftCode:"", bankCountry:"", bankAddress:"" },
    documents: { cipcCertificate:null, vatCertificate:null, sarsNoticeOfRegistration:null, vatNoticeOfRegistration:null, bbeeCertificate:null, bankConfirmationLetter:null },
    credit: { creditLimitRequested:"", estimatedMonthlyPurchase:"", paymentTermsRequested:"" },
    declaration: { signatureFullName:"", signatureDate:"" },
    consent: { accurateInfo:false, popiConsent:false },
  };
}

// Ported validators (same as app)
function validateCompany(formData) {
  const errors = {};
  const { company } = formData;
  requireField(errors, "tradingName", company.tradingName);
  requireField(errors, "entityType", company.entityType, "Select an entity type");
  if (company.isForeignEntity === null) {
    errors.isForeignEntity = "Select whether this is a local or foreign entity";
  } else if (company.isForeignEntity) {
    requireField(errors, "countryOfRegistration", company.countryOfRegistration);
    requireField(errors, "foreignRegistrationNumber", company.foreignRegistrationNumber);
  } else {
    requireField(errors, "cipcNumber", company.cipcNumber);
    if (company.cipcNumber) {
      const regErr = validateRegNumberFormat(company.entityType, company.cipcNumber);
      if (regErr) errors.cipcNumber = regErr;
    }
  }
  return errors;
}
function validateContact(formData) {
  const errors = {};
  const { contact } = formData;
  const isLocalContact = contact.country === "South Africa" || contact.country === "";
  requireField(errors, "accountsContactName", contact.accountsContactName);
  requireField(errors, "accountsEmail", contact.accountsEmail);
  if (contact.accountsEmail && !isValidEmail(contact.accountsEmail)) errors.accountsEmail = "Enter a valid email address";
  requireField(errors, "accountsPhone", contact.accountsPhone);
  if (contact.accountsPhone && !isPhoneValid(contact.accountsPhone, isLocalContact)) errors.accountsPhone = isLocalContact ? "Enter a valid South African phone number" : "Enter a valid phone number";
  if (contact.accountsCell && !isPhoneValid(contact.accountsCell, isLocalContact)) errors.accountsCell = isLocalContact ? "Enter a valid South African cell number" : "Enter a valid cell number";
  requireField(errors, "accountsPhysicalAddress", contact.accountsPhysicalAddress);
  requireField(errors, "country", contact.country, "Select a country");
  if (!contact.accountsPostalSameAsPhysical) {
    requireField(errors, "accountsPostalAddress", contact.accountsPostalAddress, "Enter a postal address");
  }
  if (contact.buyerContactDifferent) {
    requireField(errors, "buyerContactName", contact.buyerContactName);
    requireField(errors, "buyerEmail", contact.buyerEmail);
    if (contact.buyerEmail && !isValidEmail(contact.buyerEmail)) errors.buyerEmail = "Enter a valid email address";
    requireField(errors, "buyerPhone", contact.buyerPhone);
    if (contact.buyerPhone && !isPhoneValid(contact.buyerPhone, isLocalContact)) errors.buyerPhone = isLocalContact ? "Enter a valid South African phone number" : "Enter a valid phone number";
    if (contact.buyerCell && !isPhoneValid(contact.buyerCell, isLocalContact)) errors.buyerCell = isLocalContact ? "Enter a valid South African cell number" : "Enter a valid cell number";
  }
  return errors;
}
function validateDirectors(formData) {
  const errors = {};
  formData.directors.forEach((director, index) => {
    requireField(errors, `directors.${index}.fullName`, director.fullName);
    requireField(errors, `directors.${index}.idNumber`, director.idNumber);
    if (director.idNumber) {
      if (!SA_ID_RE.test(director.idNumber)) errors[`directors.${index}.idNumber`] = "Enter a valid 13-digit SA ID number";
      else if (!isValidSaIdChecksum(director.idNumber)) errors[`directors.${index}.idNumber`] = "This doesn't look like a valid SA ID number";
    }
    requireField(errors, `directors.${index}.residentialAddress`, director.residentialAddress);
    if (!director.idDocument) errors[`directors.${index}.idDocument`] = "Upload a copy of this director's ID";
  });
  return errors;
}
function validateReferences(formData) {
  const errors = {};
  const { references } = formData;
  ["tradeRef1", "tradeRef2"].forEach((key) => {
    const ref = references[key];
    requireField(errors, `${key}.companyName`, ref.companyName);
    requireField(errors, `${key}.contactPerson`, ref.contactPerson);
    requireField(errors, `${key}.phone`, ref.phone);
    if (ref.phone && !isPhoneValid(ref.phone, false)) errors[`${key}.phone`] = "Enter a valid phone number";
    requireField(errors, `${key}.email`, ref.email);
    if (ref.email && !isValidEmail(ref.email)) errors[`${key}.email`] = "Enter a valid email address";
  });
  return errors;
}
function validateTax(formData) {
  const errors = {};
  const { tax } = formData;
  if (tax.vatRegistered === null) errors.vatRegistered = "Select whether the business is VAT registered";
  if (tax.vatRegistered) {
    requireField(errors, "vatNumber", tax.vatNumber);
    if (tax.vatNumber && !VAT_RE.test(tax.vatNumber)) errors.vatNumber = "VAT number must be exactly 10 digits and start with 4";
  }
  requireField(errors, "incomeTaxNumber", tax.incomeTaxNumber);
  if (tax.incomeTaxNumber && !INCOME_TAX_RE.test(tax.incomeTaxNumber)) errors.incomeTaxNumber = "Income tax number must be 10 digits, starting with 0, 1, 2, 3 or 9";
  requireField(errors, "bbeeLevel", tax.bbeeLevel, "Select a B-BBEE level");
  return errors;
}
function validateBanking(formData) {
  const errors = {};
  const { banking } = formData;
  requireField(errors, "accountHolder", banking.accountHolder);
  requireField(errors, "bankName", banking.bankName);
  requireField(errors, "accountNumber", banking.accountNumber);
  if (banking.isForeignBank) {
    requireField(errors, "bankCountry", banking.bankCountry);
    requireField(errors, "swiftCode", banking.swiftCode);
    if (banking.swiftCode && !SWIFT_RE.test(banking.swiftCode.replace(/\s/g, "").toUpperCase())) errors.swiftCode = "Enter a valid 8 or 11 character SWIFT/BIC code";
  } else {
    if (banking.accountNumber && !ACCOUNT_NUMBER_RE.test(banking.accountNumber)) errors.accountNumber = "Account number must be 6-16 digits";
    requireField(errors, "branchCode", banking.branchCode);
    if (banking.branchCode && !BRANCH_CODE_RE.test(banking.branchCode)) errors.branchCode = "Branch code must be exactly 6 digits";
    requireField(errors, "accountType", banking.accountType, "Select an account type");
  }
  return errors;
}
function validateDocuments(formData) {
  const errors = {};
  const { documents, tax, company } = formData;
  const cipcRequired = !company.isForeignEntity && (company.entityType === "(Pty) Ltd" || company.entityType === "CC");
  const bbeeRequired = !!tax.bbeeLevel && tax.bbeeLevel !== "Exempt" && tax.bbeeLevel !== "Non-compliant";
  const check = (key, file, required) => { if (!file && required) errors[key] = "This document is required"; };
  check("cipcCertificate", documents.cipcCertificate, cipcRequired);
  check("vatCertificate", documents.vatCertificate, !!tax.vatRegistered);
  check("sarsNoticeOfRegistration", documents.sarsNoticeOfRegistration, !tax.vatRegistered);
  check("vatNoticeOfRegistration", documents.vatNoticeOfRegistration, !!tax.vatRegistered);
  check("bbeeCertificate", documents.bbeeCertificate, bbeeRequired);
  check("bankConfirmationLetter", documents.bankConfirmationLetter, true);
  return errors;
}
function validateCredit(formData) {
  const errors = {};
  const { credit } = formData;
  requireField(errors, "creditLimitRequested", credit.creditLimitRequested);
  if (credit.creditLimitRequested) {
    const limit = Number(credit.creditLimitRequested);
    if (!Number.isFinite(limit) || limit <= 0) errors.creditLimitRequested = "Enter a valid credit limit greater than 0";
  }
  if (credit.estimatedMonthlyPurchase) {
    const volume = Number(credit.estimatedMonthlyPurchase);
    if (!Number.isFinite(volume) || volume < 0) errors.estimatedMonthlyPurchase = "Enter a valid amount";
  }
  if (credit.paymentTermsRequested === "60 Days from statement") errors.paymentTermsRequested = "We unfortunately do not offer 60 days terms.";
  return errors;
}
function validateSuretyship(formData) {
  const errors = {};
  formData.directors.forEach((director, index) => {
    if (!director.suretyshipAgreed) errors[`suretyship.${index}.agreed`] = "This director/member must agree to the suretyship terms";
    requireField(errors, `suretyship.${index}.signature`, director.suretyshipSignature, "Type your full name to sign");
    if (director.suretyshipSignature && !isSameName(director.suretyshipSignature, director.fullName)) errors[`suretyship.${index}.signature`] = "Signature must match this director's full name exactly";
    requireField(errors, `suretyship.${index}.date`, director.suretyshipDate, "Select the date");
    if (director.suretyshipDate) {
      const today = new Date(); today.setHours(23, 59, 59, 999);
      if (new Date(director.suretyshipDate) > today) errors[`suretyship.${index}.date`] = "Signature date cannot be in the future";
    }
  });
  return errors;
}
function validateDeclarationAndConsent(formData) {
  const errors = {};
  const { declaration, consent } = formData;
  requireField(errors, "signatureFullName", declaration.signatureFullName, "Type your full name to sign");
  requireField(errors, "signatureDate", declaration.signatureDate, "Select the date");
  if (declaration.signatureDate) {
    const today = new Date(); today.setHours(23, 59, 59, 999);
    if (new Date(declaration.signatureDate) > today) errors.signatureDate = "Signature date cannot be in the future";
  }
  if (!consent.accurateInfo) errors.accurateInfo = "You must confirm the information is accurate";
  if (!consent.popiConsent) errors.popiConsent = "You must consent to POPI Act processing";
  return errors;
}

// File dropzone accept rules
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
function acceptFile(file) {
  if (!file) return { ok: false, error: "no file" };
  if (file.size > MAX_FILE_SIZE_BYTES) return { ok: false, error: "File must be 10MB or smaller" };
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return { ok: false, error: "File must be a PDF, JPG or PNG" };
  return { ok: true, stored: { name: file.name, size: file.size, type: file.type } };
}

const results = [];
function assert(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail: cond ? "" : detail });
  const mark = cond ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${cond ? "" : " — " + detail}`);
}
function assertHas(name, errors, key, substr = "") {
  const msg = errors[key];
  const ok = !!msg && (!substr || String(msg).includes(substr));
  assert(name, ok, ok ? "" : `expected errors['${key}']${substr ? ` containing "${substr}"` : ""}, got ${JSON.stringify(errors)}`);
}
function assertClean(name, errors) {
  assert(name, Object.keys(errors).length === 0, `expected no errors, got ${JSON.stringify(errors)}`);
}

console.log("\n=== COMPANY ===");
{
  const fd = initialFormData();
  assertHas("empty company blocks next", validateCompany(fd), "tradingName");
  assertHas("null foreign/local blocks", validateCompany(fd), "isForeignEntity");

  fd.company = { ...fd.company, tradingName: "   ", entityType: "(Pty) Ltd", isForeignEntity: false, cipcNumber: "2020/123456/07" };
  assertHas("whitespace-only trading name rejected", validateCompany(fd), "tradingName");

  fd.company.tradingName = "SGA Fab";
  fd.company.cipcNumber = "2020-123456-07";
  assertHas("wrong CIPC separators rejected", validateCompany(fd), "cipcNumber");

  fd.company.cipcNumber = "2020/12345/07";
  assertHas("short CIPC middle rejected", validateCompany(fd), "cipcNumber");

  fd.company.cipcNumber = "2020/123456/07";
  assertClean("valid Pty CIPC accepted", validateCompany(fd));

  fd.company.entityType = "CC";
  fd.company.cipcNumber = "2007/123456/23";
  assertHas("CC with Pty-style number rejected", validateCompany(fd), "cipcNumber");
  fd.company.cipcNumber = "CK2007/123456";
  assertClean("valid CK accepted", validateCompany(fd));
  fd.company.cipcNumber = "ck2007/123456";
  assertClean("lowercase CK accepted (case-insensitive)", validateCompany(fd));

  fd.company.entityType = "Trust";
  fd.company.cipcNumber = "IT1234/17";
  assertClean("valid Trust IT accepted", validateCompany(fd));
  fd.company.cipcNumber = "IT 1234/17";
  assertClean("Trust IT with space accepted", validateCompany(fd));
  fd.company.cipcNumber = "T1234/17";
  assertHas("bad Trust number rejected", validateCompany(fd), "cipcNumber");

  fd.company.entityType = "Sole Proprietor";
  fd.company.cipcNumber = "0123456789";
  assertClean("sole prop income tax as reg accepted", validateCompany(fd));
  fd.company.cipcNumber = "5123456789";
  assertHas("income tax starting with 5 rejected", validateCompany(fd), "cipcNumber");

  fd.company = { ...initialFormData().company, tradingName: "Acme", entityType: "LLC", isForeignEntity: true, countryOfRegistration: "", foreignRegistrationNumber: "" };
  assertHas("foreign missing country", validateCompany(fd), "countryOfRegistration");
  assertHas("foreign missing reg number", validateCompany(fd), "foreignRegistrationNumber");

  fd.company.countryOfRegistration = "Germany";
  fd.company.foreignRegistrationNumber = "HRB 12345";
  assertClean("foreign entity with any reg string accepted (no format check)", validateCompany(fd));

  // XSS / control chars still "valid" to company validator
  fd.company.tradingName = `<img src=x onerror=alert(1)>`;
  fd.company.isForeignEntity = false;
  fd.company.entityType = "(Pty) Ltd";
  fd.company.cipcNumber = "2020/123456/07";
  assertClean("HTML/XSS trading name passes company validation (escape risk elsewhere)", validateCompany(fd));
}

console.log("\n=== CONTACT / EMAIL / PHONE ===");
{
  const fd = initialFormData();
  fd.contact.accountsContactName = "Jane";
  fd.contact.accountsPhysicalAddress = "1 Main Rd";
  fd.contact.country = "South Africa";
  fd.contact.accountsPostalSameAsPhysical = true;

  const badEmails = ["", " ", "plain", "a@", "@b.com", "a@b", "a@b.", "a@@b.com", "a@b..com", "jane doe@co.za"];
  for (const email of badEmails) {
    fd.contact.accountsEmail = email;
    fd.contact.accountsPhone = "0821234567";
    const e = validateContact(fd);
    assert(`reject email ${JSON.stringify(email)}`, !!e.accountsEmail || !!e.accountsContactName === false && Object.keys(e).length > 0 || !!e.accountsEmail, JSON.stringify(e));
  }
  // clearer individual asserts
  fd.contact.accountsEmail = "not-an-email";
  assertHas("reject not-an-email", validateContact(fd), "accountsEmail");
  fd.contact.accountsEmail = "a@b";
  assertHas("reject a@b (no TLD dot segment)", validateContact(fd), "accountsEmail");
  fd.contact.accountsEmail = "ok@co.za";
  fd.contact.accountsPhone = "0821234567";
  assertClean("accept ok@co.za + SA phone", validateContact(fd));

  // weak email that still matches EMAIL_RE
  fd.contact.accountsEmail = "a@b.c";
  assertClean("weak email a@b.c ACCEPTED by current regex", validateContact(fd));

  fd.contact.accountsEmail = "ok@co.za";
  fd.contact.accountsPhone = "12345";
  assertHas("reject short SA phone", validateContact(fd), "accountsPhone");
  fd.contact.accountsPhone = "082 123 4567";
  assertClean("accept spaced SA phone", validateContact(fd));
  fd.contact.accountsPhone = "+27 82 123 4567";
  assertClean("accept +27 spaced phone", validateContact(fd));
  fd.contact.accountsPhone = "(082)123-4567";
  assertClean("accept (082)123-4567 after strip", validateContact(fd));
  fd.contact.accountsPhone = "0027821234567";
  assertHas("reject 00-prefix international", validateContact(fd), "accountsPhone");

  // blur normalization side effects
  assert("format 0821234567 -> +27821234567", formatPhoneNumber("0821234567", true) === "+27821234567");
  assert("format 821234567 -> +27821234567 (missing leading 0)", formatPhoneNumber("821234567", true) === "+27821234567");
  assert("format garbage letters stripped", formatPhoneNumber("abc", true) === "");
  assert("format foreign keeps plus", formatPhoneNumber("+441234567890", false) === "+441234567890");

  // After blur, incomplete number can become invalid longer format
  const formattedShort = formatPhoneNumber("08212345", true);
  assert("short local formats then fails phone check", formattedShort === "+278212345" && !isPhoneValid(formattedShort, true));

  fd.contact.country = "United Kingdom";
  fd.contact.accountsPhone = "+441234567890";
  fd.contact.accountsEmail = "ok@co.uk";
  assertClean("UK number accepted when foreign country", validateContact(fd));
  fd.contact.accountsPhone = "0821234567";
  assertClean("SA format still accepted when foreign country (dual regex)", validateContact(fd));

  fd.contact.buyerContactDifferent = true;
  fd.contact.accountsPhone = "+441234567890";
  assertHas("buyer required when different", validateContact(fd), "buyerContactName");
  assertHas("buyer email required", validateContact(fd), "buyerEmail");
  assertHas("buyer phone required", validateContact(fd), "buyerPhone");

  // postal same-as unchecked with empty postal — NOT validated by validateContact
  fd.contact.accountsPostalSameAsPhysical = false;
  fd.contact.accountsPostalAddress = "";
  fd.contact.buyerContactDifferent = false;
  fd.contact.accountsEmail = "ok@co.za";
  fd.contact.accountsPhone = "0821234567";
  const contactErrs = validateContact(fd);
  assert("empty postal address validated when 'same as physical' unchecked", !!contactErrs.accountsPostalAddress, JSON.stringify(contactErrs));
}

console.log("\n=== DIRECTORS / SA ID ===");
{
  const fd = initialFormData();
  // Known valid Luhn-style SA ID used in many demos: 8001015009087
  const VALID_ID = "8001015009087";
  assert("checksum accepts known valid ID", isValidSaIdChecksum(VALID_ID));
  assert("checksum rejects transposed", !isValidSaIdChecksum("8001015009078"));

  fd.directors[0] = { ...blankDirector(), fullName: "John Doe", idNumber: "123", residentialAddress: "Addr", idDocument: { name: "id.pdf", size: 100, type: "application/pdf" } };
  assertHas("reject short ID", validateDirectors(fd), "directors.0.idNumber");

  fd.directors[0].idNumber = "8001015009088"; // wrong checksum
  assertHas("reject bad checksum", validateDirectors(fd), "directors.0.idNumber", "doesn't look like");

  fd.directors[0].idNumber = VALID_ID;
  assertClean("valid director accepted", validateDirectors(fd));

  fd.directors[0].idDocument = null;
  assertHas("missing ID upload rejected", validateDirectors(fd), "directors.0.idDocument");

  // Fake metadata-only "upload" (what the UI stores) passes validation
  fd.directors[0].idDocument = { name: "fake.pdf", size: 1, type: "application/pdf" };
  assertClean("metadata-only file object passes directors validation (no bytes stored)", validateDirectors(fd));

  fd.directors[0].fullName = "   ";
  assertHas("whitespace director name rejected", validateDirectors(fd), "directors.0.fullName");

  // ID with spaces would fail SA_ID_RE — UI strips non-digits on change
  fd.directors[0].fullName = "John Doe";
  fd.directors[0].idNumber = "800101 5009087";
  assertHas("spaced ID rejected by regex (UI strips digits though)", validateDirectors(fd), "directors.0.idNumber");
}

console.log("\n=== REFERENCES ===");
{
  const fd = initialFormData();
  const e = validateReferences(fd);
  assertHas("ref1 company required", e, "tradeRef1.companyName");
  assertHas("ref2 email required", e, "tradeRef2.email");

  fd.references.tradeRef1 = { companyName: "A", contactPerson: "B", phone: "0821234567", email: "a@b.c" };
  fd.references.tradeRef2 = { companyName: "C", contactPerson: "D", phone: "+1", email: "bad" };
  const e2 = validateReferences(fd);
  assertHas("ref2 bad phone", e2, "tradeRef2.phone");
  assertHas("ref2 bad email", e2, "tradeRef2.email");
}

console.log("\n=== TAX ===");
{
  const fd = initialFormData();
  assertHas("vatRegistered null rejected", validateTax(fd), "vatRegistered");

  fd.tax.vatRegistered = true;
  fd.tax.vatNumber = "3123456789";
  fd.tax.incomeTaxNumber = "0123456789";
  fd.tax.bbeeLevel = "Level 4";
  assertHas("VAT not starting with 4", validateTax(fd), "vatNumber");

  fd.tax.vatNumber = "4123456789";
  assertClean("valid VAT", validateTax(fd));

  fd.tax.vatNumber = "412345678";
  assertHas("VAT too short", validateTax(fd), "vatNumber");

  fd.tax.vatRegistered = false;
  fd.tax.vatNumber = "";
  fd.tax.incomeTaxNumber = "5123456789";
  assertHas("income tax bad prefix", validateTax(fd), "incomeTaxNumber");
  assert("non-VAT does not require vatNumber", !validateTax({ ...fd, tax: { ...fd.tax, incomeTaxNumber: "0123456789" } }).vatNumber);
}

console.log("\n=== BANKING ===");
{
  const fd = initialFormData();
  fd.banking = { ...fd.banking, accountHolder: "Co", bankName: "FNB", accountNumber: "12345", branchCode: "250655", accountType: "Cheque" };
  assertHas("account number too short", validateBanking(fd), "accountNumber");

  fd.banking.accountNumber = "12345678901234567"; // 17
  assertHas("account number too long", validateBanking(fd), "accountNumber");

  fd.banking.accountNumber = "1234567890";
  fd.banking.branchCode = "25065";
  assertHas("branch code not 6 digits", validateBanking(fd), "branchCode");

  fd.banking.branchCode = "250655";
  assertClean("valid local banking", validateBanking(fd));

  fd.banking.accountNumber = "12 3456";
  assertHas("spaced account number rejected", validateBanking(fd), "accountNumber");

  fd.banking.isForeignBank = true;
  fd.banking.accountNumber = "GB29NWBK60161331926819"; // IBAN — no format check when foreign
  fd.banking.swiftCode = "bad";
  fd.banking.bankCountry = "UK";
  assertHas("bad SWIFT rejected", validateBanking(fd), "swiftCode");
  assert("GAP: foreign IBAN/account has no format validation", !validateBanking({ ...fd, banking: { ...fd.banking, swiftCode: "BARCGB22" } }).accountNumber);

  fd.banking.swiftCode = "barcgb22";
  assertClean("lowercase SWIFT accepted after uppercasing in check", validateBanking(fd));
  fd.banking.swiftCode = "BARC GB 22";
  assertClean("SWIFT with spaces accepted", validateBanking(fd));
  fd.banking.swiftCode = "BARCGB22XXX";
  assertClean("11-char SWIFT accepted", validateBanking(fd));
}

console.log("\n=== DOCUMENTS (conditional) ===");
{
  const fd = initialFormData();
  fd.company.isForeignEntity = false;
  fd.company.entityType = "(Pty) Ltd";
  fd.tax.vatRegistered = true;
  fd.tax.bbeeLevel = "Level 1";
  let e = validateDocuments(fd);
  assertHas("Pty requires CIPC cert", e, "cipcCertificate");
  assertHas("VAT requires vat cert", e, "vatCertificate");
  assertHas("VAT requires vat notice", e, "vatNoticeOfRegistration");
  assertHas("B-BBEE level requires cert", e, "bbeeCertificate");
  assertHas("always requires bank letter", e, "bankConfirmationLetter");
  assert("VAT registered should NOT require SARS notice", !e.sarsNoticeOfRegistration);

  fd.tax.vatRegistered = false;
  e = validateDocuments(fd);
  assertHas("non-VAT requires SARS notice", e, "sarsNoticeOfRegistration");
  assert("non-VAT should NOT require vat cert", !e.vatCertificate);

  fd.tax.bbeeLevel = "Exempt";
  e = validateDocuments(fd);
  assert("Exempt B-BBEE does not require cert", !e.bbeeCertificate);

  fd.tax.bbeeLevel = "Non-compliant";
  e = validateDocuments(fd);
  assert("Non-compliant B-BBEE does not require cert", !e.bbeeCertificate);

  fd.company.entityType = "Sole Proprietor";
  e = validateDocuments(fd);
  assert("Sole Prop does not require CIPC cert", !e.cipcCertificate);

  fd.company.isForeignEntity = true;
  fd.company.entityType = "(Pty) Ltd";
  e = validateDocuments(fd);
  assert("Foreign entity does not require CIPC cert", !e.cipcCertificate);

  // Metadata-only bank letter passes
  fd.documents.bankConfirmationLetter = { name: "b.pdf", size: 1, type: "application/pdf" };
  fd.documents.sarsNoticeOfRegistration = { name: "s.pdf", size: 1, type: "application/pdf" };
  e = validateDocuments(fd);
  assertClean("metadata stubs satisfy document validation", e);
}

console.log("\n=== CREDIT ===");
{
  const fd = initialFormData();
  assertHas("credit limit required", validateCredit(fd), "creditLimitRequested");

  fd.credit.creditLimitRequested = "0";
  assertHas("zero credit rejected", validateCredit(fd), "creditLimitRequested");

  fd.credit.creditLimitRequested = "-5";
  assertHas("negative credit rejected", validateCredit(fd), "creditLimitRequested");
  // Note: UI bindNumericSection strips non-digits so '-' can't be typed; Number("-5") still fails

  fd.credit.creditLimitRequested = "100000";
  assertClean("valid credit", validateCredit(fd));

  fd.credit.estimatedMonthlyPurchase = "-1";
  assertHas("negative monthly rejected", validateCredit(fd), "estimatedMonthlyPurchase");

  fd.credit.estimatedMonthlyPurchase = "0";
  assertClean("zero monthly allowed", validateCredit(fd));

  fd.credit.paymentTermsRequested = "60 Days from statement";
  assertHas("60-day terms blocked", validateCredit(fd), "paymentTermsRequested");

  fd.credit.paymentTermsRequested = "30 Days from statement";
  assertClean("30-day terms allowed", validateCredit(fd));

  // Extremely large number still finite
  fd.credit.creditLimitRequested = "999999999999999";
  assertClean("huge credit accepted (no upper bound)", validateCredit(fd));

  fd.credit.creditLimitRequested = "1e5";
  // Number("1e5") === 100000 — but UI strips non-digits so 'e' gone; raw validator:
  assertClean("scientific notation 1e5 accepted by Number()", validateCredit(fd));
}

console.log("\n=== SURETYSHIP / DECLARATION ===");
{
  const fd = initialFormData();
  fd.directors[0].fullName = "Jane Smith";
  fd.directors[0].suretyshipAgreed = false;
  fd.directors[0].suretyshipSignature = "";
  fd.directors[0].suretyshipDate = "";
  let e = validateSuretyship(fd);
  assertHas("must agree", e, "suretyship.0.agreed");
  assertHas("must type signature", e, "suretyship.0.signature");
  assertHas("must date", e, "suretyship.0.date");

  fd.directors[0].suretyshipAgreed = true;
  fd.directors[0].suretyshipSignature = "Jane";
  fd.directors[0].suretyshipDate = "2099-01-01";
  e = validateSuretyship(fd);
  assertHas("partial name mismatch", e, "suretyship.0.signature", "match");
  assertHas("future date rejected", e, "suretyship.0.date", "future");

  fd.directors[0].suretyshipSignature = "  jane   smith  ";
  fd.directors[0].suretyshipDate = new Date().toISOString().slice(0, 10);
  assertClean("whitespace-normalized name match accepted", validateSuretyship(fd));

  fd.directors[0].suretyshipSignature = "Jane Smith";
  // Drawn signature not required
  fd.directors[0].suretyshipDrawnSignature = null;
  assertClean("GAP: drawn signature pad optional — null still passes", validateSuretyship(fd));

  e = validateDeclarationAndConsent(fd);
  assertHas("declaration name required", e, "signatureFullName");
  assertHas("POPI required", e, "popiConsent");
  assertHas("accuracy required", e, "accurateInfo");

  fd.declaration.signatureFullName = "Anyone At All"; // no match to director required
  fd.declaration.signatureDate = new Date().toISOString().slice(0, 10);
  fd.consent.accurateInfo = true;
  fd.consent.popiConsent = true;
  assertClean("GAP: declaration name need not match any director", validateDeclarationAndConsent(fd));
}

console.log("\n=== FILE DROPZONE ===");
{
  assert("reject >10MB", !acceptFile({ name: "a.pdf", size: 10 * 1024 * 1024 + 1, type: "application/pdf" }).ok);
  assert("accept exactly 10MB", acceptFile({ name: "a.pdf", size: 10 * 1024 * 1024, type: "application/pdf" }).ok);
  assert("reject gif", !acceptFile({ name: "a.gif", size: 100, type: "image/gif" }).ok);
  assert("reject exe disguised without mime", !acceptFile({ name: "a.exe", size: 100, type: "application/octet-stream" }).ok);
  assert("accept png", acceptFile({ name: "a.png", size: 100, type: "image/png" }).ok);
  assert("accept jpeg", acceptFile({ name: "a.jpg", size: 100, type: "image/jpeg" }).ok);
  // MIME spoof: .exe with pdf mime would be accepted by type check alone
  assert("GAP: extension not checked — .exe with pdf MIME accepted", acceptFile({ name: "malware.exe", size: 100, type: "application/pdf" }).ok);
  const stored = acceptFile({ name: "doc.pdf", size: 500, type: "application/pdf" }).stored;
  assert("stored object has no file bytes / content / data URL", stored && !("content" in stored) && !("data" in stored) && !("file" in stored));
}

console.log("\n=== SUMMARY ===");
const failed = results.filter((r) => !r.pass);
const passed = results.filter((r) => r.pass);
console.log(`Passed: ${passed.length}  Failed: ${failed.length}  Total: ${results.length}`);
if (failed.length) {
  console.log("\nFailed cases:");
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
  process.exitCode = 1;
}
