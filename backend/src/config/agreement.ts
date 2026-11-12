// Version of the DVT Master Service Agreement + SLA that registration
// currently requires users to accept (the English and Marathi pages are the
// same agreement). Keep in sync with MASTER_AGREEMENT_VERSION in the
// frontend's src/data/masterAgreement.ts — bump BOTH whenever the agreement
// text changes. Registration rejects a mismatched version so nobody can
// accept a stale copy of the text from a page that was open before the
// change. The accepted version is saved with the account (AgreementAcceptance).
export const CURRENT_AGREEMENT_VERSION = '2.0'
