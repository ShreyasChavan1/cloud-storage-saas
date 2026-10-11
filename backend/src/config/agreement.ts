// Version of the DVT Storage Service Agreement (MSA + SLA) that registration
// currently requires users to accept. Keep in sync with AGREEMENT_VERSION in
// the frontend's src/data/serviceAgreement.ts — bump BOTH whenever the
// agreement text changes. Registration rejects a mismatched version so
// nobody can accept a stale copy of the text from a page that was open
// before the change.
export const CURRENT_AGREEMENT_VERSION = '1.0'
