// The facts the Master Service Agreement leaves blank. Fill these in ONCE here
// and both the English and Marathi pages pick them up. Anything left as ''
// shows the original bracketed placeholder from the PDF (e.g. "[INSERT]"),
// so nothing is invented and an unfinished field is easy to spot on the page.
//
// The email shown for support / privacy / billing is NOT set here: it is the
// contact edited in the admin dashboard ("Support Contact"), shared with the
// rest of the site.
export const masterAgreementDetails = {
  // Used in section 1: the legal entity or proprietor and its address, written
  // as one phrase, e.g. 'Hrishikesh Dalvi, proprietor of DVT, <address>'.
  legalNameAndAddress: '',
  // Section 15 fields (shown separately).
  legalName: '',
  address: '',
  gstin: '',
  // e.g. '21 October 2026'.
  effectiveDate: '',
  // Section 3: how many days after delivery a defect must be reported, e.g. '7'.
  correctionPeriodDays: '',
  website: 'www.dv-technologies.in',
  // Shows an amber "draft, legal review pending" notice above the text.
  showDraftNotice: false,
}
