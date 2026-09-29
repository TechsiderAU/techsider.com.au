// Builds the ① Document Registers demo's synthetic set (spec §9.1 ①; Phase D scope ruling 3) and
// writes the three files the site reads:
// - src/data/demos/document-registers.json, the demo entry (the demos collection, makeDemoSchema);
// - public/downloads/document-registers-demo-register.csv, both registers, one line per value;
// - public/downloads/document-registers-demo-documents.txt, every document, page by page.
// Twelve management agreements come from three invented forms, and six trust deeds from two, so each
// register value is written into its page by the same code that records it. Every party, premises,
// insurer, date and amount is invented, and every party is named "Synthetic …". There is no address,
// ABN, phone number or email address. To change the set, edit the tables or the forms here and run
// `node scripts/demo-register-set.mjs`: tests/register-demo.test.mjs fails while a committed file
// differs from what this builds.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { documentsText, downloadsOf, registerCsv } from "../src/lib/register.ts";

/** The register date that insurance expiry and vesting dates are read against. */
export const AS_AT = "1 September 2026";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "30 June 2026" as a UTC day number, for comparing dates. */
export function dayOf(date) {
  const [d, month, y] = date.split(" ");
  const m = MONTHS.indexOf(month);
  if (m === -1) throw new Error(`not a date: "${date}"`);
  return Date.UTC(Number(y), m, Number(d));
}
const before = (date) => dayOf(date) < dayOf(AS_AT);
const BLANK = "______________";
const AGREEMENT_BANNER = "SYNTHETIC DOCUMENT FOR A DEMO. NOT A REAL AGREEMENT.";
const DEED_BANNER = "SYNTHETIC DOCUMENT FOR A DEMO. NOT A REAL TRUST DEED.";
const ok = (value, page) => ({ value, page, status: "ok" });
const lines = (...l) => l.join("\n");

const FORMS = {
  A: "Form A (Synthetic Agency One, 2024 edition)",
  B: "Form B (Synthetic Agency One, 2019 edition)",
  C: "Form C (Synthetic Agency Two, from a bought rent roll)",
  T1: "Deed form T1 (long form)",
  T2: "Deed form T2 (short form)",
};

// The management agreements. limit: null leaves the repair limit blank; owner: null leaves the
// Owner's signature blank. The insurance expiry is read against AS_AT.
const AGREEMENTS = [
  { n: "01", form: "A", start: "1 March 2025", fee: "6.6%", limit: "$500", insurer: "1", expiry: "31 March 2027", owner: "14 February 2025", manager: "17 February 2025" },
  { n: "02", form: "A", start: "1 July 2025", fee: "6.6%", limit: "$800", insurer: "2", expiry: "30 November 2026", owner: "2 June 2025", manager: "3 June 2025" },
  { n: "03", form: "A", start: "1 October 2024", fee: "7.7%", limit: "$500", insurer: "1", expiry: "15 January 2027", owner: "20 August 2024", manager: "22 August 2024" },
  { n: "04", form: "A", start: "1 May 2025", fee: "6.6%", limit: "$1,000", insurer: "3", expiry: "30 April 2027", owner: null, manager: "28 April 2025" },
  { n: "05", form: "A", start: "1 October 2025", fee: "5.5%", limit: "$500", insurer: "2", expiry: "31 October 2026", owner: "9 September 2025", manager: "10 September 2025" },
  { n: "06", form: "B", start: "1 April 2019", fee: "7.7%", limit: "$300", insurer: "2", expiry: "30 September 2026", owner: "11 March 2019", manager: "12 March 2019" },
  { n: "07", form: "B", start: "1 December 2020", fee: "7.7%", limit: "$500", insurer: "3", expiry: "30 June 2026", owner: "4 November 2020", manager: "5 November 2020" },
  { n: "08", form: "B", start: "1 June 2021", fee: "6.6%", limit: "$800", insurer: "1", expiry: "28 February 2027", owner: "17 May 2021", manager: "18 May 2021" },
  { n: "09", form: "B", start: "1 February 2022", fee: "7.7%", limit: "$500", insurer: "3", expiry: "31 July 2027", owner: "23 January 2022", manager: "24 January 2022" },
  { n: "10", form: "C", start: "1 July 2023", fee: "5.5%", limit: null, insurer: "2", expiry: "31 December 2026", owner: "6 June 2023", manager: "7 June 2023" },
  { n: "11", form: "C", start: "1 November 2023", fee: "5.5%", limit: "$1,000", insurer: "1", expiry: "31 May 2027", owner: "19 October 2023", manager: "20 October 2023" },
  { n: "12", form: "C", start: "1 May 2024", fee: "6.6%", limit: "$800", insurer: "3", expiry: "31 January 2027", owner: "8 April 2024", manager: "9 April 2024" },
];

// Each form puts the four register fields on its own pages, in its own words.
const AGREEMENT_FORMS = {
  A: (a) => ({
    pages: [
      lines(
        AGREEMENT_BANNER,
        `MANAGEMENT AGREEMENT: ${FORMS.A}`,
        `Agreement number: MA-${a.n}`,
        `Owner: Synthetic Owner ${a.n}`,
        "Manager: Synthetic Agency One",
        `Premises: Synthetic premises ${a.n}`,
        `1. Appointment. The Owner appoints the Manager to let and manage the Premises from ${a.start}. This agreement continues until either party ends it by written notice.`,
        "2. Letting. The Manager may advertise the Premises, choose a tenant and sign a residential tenancy agreement for the Owner.",
      ),
      lines(
        `3. Management fee. The Owner pays the Manager a management fee of ${a.fee} of all rent collected, deducted before rent is paid to the Owner.`,
        `4. Repairs. The Manager may arrange a repair without first asking the Owner if it costs no more than ${a.limit ?? `$${BLANK}`}. Above that amount the Manager must get the Owner's approval, except in an emergency.`,
      ),
      lines(
        `5. Landlord insurance. The Owner keeps landlord insurance for the Premises. Insurer: Synthetic Insurer ${a.insurer}. Policy: SYN-${a.n}-LI. Expiry: ${a.expiry}.`,
        "6. Owner's authority. By signing, the Owner authorises the Manager to act for the Owner as this agreement sets out.",
        `Signed by the Owner: ${a.owner ? `signed ${a.owner}` : `${BLANK} Date: ${BLANK}`}`,
        `Signed for the Manager: signed ${a.manager}`,
      ),
    ],
    at: { fee: 2, limit: 2, insurance: 3, authority: 3 },
    limitItem: "clause 4",
  }),
  B: (a) => ({
    pages: [
      lines(
        AGREEMENT_BANNER,
        `EXCLUSIVE MANAGEMENT AUTHORITY: ${FORMS.B}`,
        `Authority number: MA-${a.n}`,
        "SCHEDULE",
        `Item 1. Owner: Synthetic Owner ${a.n}`,
        "Item 2. Manager: Synthetic Agency One",
        `Item 3. Premises: Synthetic premises ${a.n}`,
        `Item 4. Start date: ${a.start}`,
        `Item 5. Management fee: ${a.fee} of gross rent`,
        `Item 6. Repair limit, for each repair without further approval: ${a.limit ?? `$${BLANK}`}`,
        `Item 7. Landlord insurance: Synthetic Insurer ${a.insurer}, policy SYN-${a.n}-LI, current to ${a.expiry}`,
      ),
      lines(
        "TERMS",
        "1. The Owner appoints the Manager on the terms of this authority and its schedule.",
        "2. The Manager may spend up to the repair limit in Item 6 on any one repair without asking the Owner.",
        "3. The Owner keeps the landlord insurance in Item 7 current and gives the Manager a copy of each renewal.",
        "4. Either party may end this authority by written notice.",
        "EXECUTION",
        `Owner: ${a.owner ? `signed ${a.owner}` : `${BLANK} Date: ${BLANK}`}`,
        `Manager: signed ${a.manager}`,
      ),
    ],
    at: { fee: 1, limit: 1, insurance: 1, authority: 2 },
    limitItem: "Item 6",
  }),
  C: (a) => ({
    pages: [
      lines(
        AGREEMENT_BANNER,
        `AGREEMENT TO MANAGE RESIDENTIAL PROPERTY: ${FORMS.C}`,
        `Reference: MA-${a.n}`,
        `Between Synthetic Owner ${a.n} (the Owner) and Synthetic Agency Two (the Manager), for Synthetic premises ${a.n}.`,
        `This agreement starts on ${a.start} and continues until either party ends it by written notice.`,
      ),
      lines(
        "PART A: KEY TERMS",
        `A1. Management fee: ${a.fee} of rent received.`,
        `A2. Owner's repair limit: the Manager may approve repairs costing up to ${a.limit ?? `$${BLANK}`} each.`,
        `A3. Landlord insurance: Synthetic Insurer ${a.insurer}, policy SYN-${a.n}-LI, expiry ${a.expiry}.`,
      ),
      lines(
        "PART B: STANDARD TERMS",
        "B1. The Owner authorises the Manager to let the premises, collect rent and arrange repairs within the limit in A2.",
        "B2. The Owner will tell the Manager if the landlord insurance lapses.",
        "SIGNATURES",
        `Owner's signature: ${a.owner ? `signed ${a.owner}` : `${BLANK} Date: ${BLANK}`}`,
        `Manager's signature: signed ${a.manager}`,
      ),
    ],
    at: { fee: 2, limit: 2, insurance: 2, authority: 3 },
    limitItem: "item A2",
  }),
};

function agreement(a) {
  const form = AGREEMENT_FORMS[a.form](a);
  const doc = {
    id: `ma-${a.n}`,
    title: `Synthetic management agreement MA-${a.n}`,
    template: FORMS[a.form],
    pages: form.pages.map((text, i) => ({ n: i + 1, text })),
  };
  const cells = {
    "management-fee": ok(a.fee, form.at.fee),
    "repair-limit": a.limit
      ? ok(a.limit, form.at.limit)
      : { value: "Not stated", page: form.at.limit, status: "review", note: `The repair limit in ${form.limitItem} on page ${form.at.limit} is blank. Ask the Owner to set one.` },
    "landlord-insurance": before(a.expiry)
      ? { value: a.expiry, page: form.at.insurance, status: "review", note: `The policy expired on ${a.expiry}, before this register's date of ${AS_AT}. Ask the Owner for the current policy.` }
      : ok(a.expiry, form.at.insurance),
    "owner-authority": a.owner
      ? ok(`Signed ${a.owner}`, form.at.authority)
      : { value: "Not signed", page: form.at.authority, status: "blocked", note: `The Owner's signature and date on page ${form.at.authority} are blank, so there is no signed authority to act on.` },
  };
  return { doc, row: { doc: doc.id, cells } };
}

// The trust deeds. variation: a deed of variation filed after the deed, which replaced the
// Appointor. missing: a page the file doesn't hold. The vesting date is read against AS_AT.
const DEEDS = [
  { n: "01", form: "T1", made: "1 July 2004", vesting: "30 June 2084" },
  { n: "02", form: "T1", made: "1 July 2009", vesting: "30 June 2089", variation: { date: "12 May 2021", appointor: "Synthetic Principal 07" } },
  { n: "03", form: "T1", made: "1 July 2012", vesting: "30 June 2092" },
  { n: "04", form: "T2", made: "1 July 1986", vesting: "30 June 2026" },
  { n: "05", form: "T2", made: "1 July 2016", vesting: "30 June 2096" },
  { n: "06", form: "T2", made: "1 July 2019", vesting: "30 June 2099", missing: 2 },
];

const DEED_FORMS = {
  T1: (d) => ({
    pages: [
      lines(
        DEED_BANNER,
        `DEED OF SETTLEMENT: SYNTHETIC FAMILY TRUST ${d.n}. ${FORMS.T1}.`,
        `Date of this deed: ${d.made}`,
        `Settlor: Synthetic Settlor ${d.n}`,
        `Trustee: Synthetic Trustee Company ${d.n}`,
        "The Settlor has given ten dollars to the Trustee, to hold on the trusts of this deed.",
      ),
      lines(
        "Clause 1. Definitions",
        `Appointor means Synthetic Principal ${d.n}, or a person who becomes Appointor under clause 14.`,
        "Beneficiaries means the Principal, the Principal's relatives, and companies and trusts they control.",
        `Principal means Synthetic Principal ${d.n}.`,
        `Vesting Date means ${d.vesting}, or an earlier date the Trustee chooses in writing.`,
      ),
      lines(
        "Clause 9. Income and capital",
        "9.1 The Trustee may pay or apply the income of each year for any one or more Beneficiaries, in the shares it decides.",
        "9.2 The Trustee may pay or apply capital for any one or more Beneficiaries before the Vesting Date.",
        "Clause 9.3 (streaming). The Trustee may make a Beneficiary specifically entitled to a capital gain or a franked distribution.",
      ),
      lines(
        "Clause 14. Appointor",
        "The Appointor may remove the Trustee and appoint a new trustee by written notice.",
        "Clause 16. Variation",
        "The Trustee may vary this deed with the Appointor's written consent, but not to make the Vesting Date later.",
        "EXECUTION",
        `Signed by the Settlor: signed ${d.made}`,
        `Executed by Synthetic Trustee Company ${d.n}: signed ${d.made}`,
      ),
      ...(d.variation
        ? [
            lines(
              `DEED OF VARIATION: SYNTHETIC FAMILY TRUST ${d.n}`,
              `Date of variation: ${d.variation.date}`,
              "Under clause 16, the Trustee, with the Appointor's written consent, varies the deed as follows.",
              `In clause 1, the definition of Appointor is replaced with: Appointor means ${d.variation.appointor}.`,
              `Executed by Synthetic Trustee Company ${d.n}: signed ${d.variation.date}`,
              `Consent of the Appointor, Synthetic Principal ${d.n}: signed ${d.variation.date}`,
            ),
          ]
        : []),
    ],
    at: { trustee: 1, appointor: 2, vesting: 2, streaming: 3, variations: 4, variation: 5 },
    streaming: "Clause 9.3",
    vestingWord: "Vesting Date",
  }),
  T2: (d) => ({
    pages: [
      lines(
        DEED_BANNER,
        `TRUST DEED: SYNTHETIC FAMILY TRUST ${d.n}. ${FORMS.T2}. This deed has 3 pages.`,
        `Made on ${d.made} by Synthetic Settlor ${d.n}, who gives ten dollars to the trustee named below.`,
        "SCHEDULE",
        `Trustee: Synthetic Trustee Company ${d.n}`,
        `Appointor: Synthetic Principal ${d.n}`,
        `Vesting day: ${d.vesting}`,
      ),
      lines(
        "DISTRIBUTIONS",
        "The trustee may distribute income and capital among the beneficiaries in the shares it decides.",
        "Clause 6.2 (streaming). The trustee may make a beneficiary specifically entitled to a capital gain or a franked distribution.",
        "VARIATION",
        "Clause 8. The trustee may vary this deed with the appointor's written consent.",
      ),
      lines(
        "EXECUTION",
        `Signed by the settlor: signed ${d.made}`,
        `Signed for the trustee: signed ${d.made}`,
      ),
    ],
    at: { trustee: 1, appointor: 1, vesting: 1, streaming: 2, variations: 3 },
    streaming: "Clause 6.2",
    vestingWord: "vesting day",
  }),
};

function deed(d) {
  const form = DEED_FORMS[d.form](d);
  const doc = {
    id: `td-${d.n}`,
    title: `Synthetic trust deed TD-${d.n}`,
    template: FORMS[d.form],
    pages: form.pages.map((text, i) => ({ n: i + 1, text })).filter((p) => p.n !== d.missing),
  };
  const cells = {
    trustee: ok(`Synthetic Trustee Company ${d.n}`, form.at.trustee),
    appointor: d.variation
      ? { value: d.variation.appointor, page: form.at.variation, status: "review", note: `The deed of variation on page ${form.at.variation} replaced the Appointor named on page ${form.at.appointor}, Synthetic Principal ${d.n}. For the partner to check before anyone relies on it.` }
      : ok(`Synthetic Principal ${d.n}`, form.at.appointor),
    "vesting-date": before(d.vesting)
      ? { value: d.vesting, page: form.at.vesting, status: "review", note: `The ${form.vestingWord} is before this register's date of ${AS_AT}. For the partner to review.` }
      : ok(d.vesting, form.at.vesting),
    variations: d.variation ? ok(d.variation.date, form.at.variation) : ok("None found", form.at.variations),
    streaming: d.missing === form.at.streaming
      ? { value: "Page missing", page: 1, status: "blocked", note: `The file holds pages 1 and 3 of this 3-page deed. Page ${d.missing}, which holds this form's streaming clause, is missing.` }
      : ok(form.streaming, form.at.streaming),
  };
  return { doc, row: { doc: doc.id, cells } };
}

/** The demo entry: src/data/demos/document-registers.json. */
export function buildRegisterDemo() {
  const agreements = AGREEMENTS.map(agreement);
  const deeds = DEEDS.map(deed);
  return {
    solution: "document-registers",
    title: "Every value links to the page it came from.",
    kind: "register",
    provenance: "illustrative",
    data: {
      documents: [...agreements, ...deeds].map((x) => x.doc),
      registers: [
        {
          id: "management-agreements",
          // Dated, so an "ok" expiry that a visitor's own date has passed still reads as right.
          title: `Management agreement register as at ${AS_AT}`,
          fields: [
            { key: "management-fee", label: "Management fee" },
            { key: "repair-limit", label: "Owner repair limit" },
            { key: "landlord-insurance", label: "Landlord insurance expiry" },
            { key: "owner-authority", label: "Owner's signed authority" },
          ],
          rows: agreements.map((x) => x.row),
        },
        {
          id: "trust-deeds",
          title: `Trust deed register as at ${AS_AT}`,
          fields: [
            { key: "trustee", label: "Trustee" },
            { key: "appointor", label: "Appointor" },
            { key: "vesting-date", label: "Vesting date" },
            { key: "variations", label: "Deed of variation" },
            { key: "streaming", label: "Streaming clause" },
          ],
          rows: deeds.map((x) => x.row),
        },
      ],
      download: "/downloads/document-registers-demo-register.csv",
    },
  };
}

function main() {
  const root = new URL("../", import.meta.url);
  const demo = buildRegisterDemo();
  const { register, documents } = downloadsOf(demo.data);
  const out = [
    ["src/data/demos/document-registers.json", `${JSON.stringify(demo, null, 2)}\n`],
    [`public${register}`, registerCsv(demo.data)],
    [`public${documents}`, documentsText(demo.data)],
  ];
  for (const [rel, text] of out) {
    writeFileSync(new URL(rel, root), text);
    console.log(`wrote ${rel}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
