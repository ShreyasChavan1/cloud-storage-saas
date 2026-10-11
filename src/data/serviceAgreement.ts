// DVT Storage Service Agreement (MSA + SLA) — "Website / Login Acceptance
// Version", transcribed from DVT_Storage_Service_Agreement_MSA_SLA_Website.pdf.
//
// Whenever the text below changes, bump AGREEMENT_VERSION here AND
// CURRENT_AGREEMENT_VERSION in backend/src/config/agreement.ts. Registration
// stores the version each user accepted, and the backend rejects a mismatch.
export const AGREEMENT_VERSION = '1.1'

// TODO before launch — the PDF still has these as [INSERT DATE].
export const AGREEMENT_EFFECTIVE_DATE = '[INSERT DATE]'
export const AGREEMENT_LAST_UPDATED = '[INSERT DATE]'

// The PDF is marked "GENERAL TEMPLATE — LEGAL REVIEW REQUIRED BEFORE
// PRODUCTION USE". Leave this true until counsel has signed off, then flip it.
export const SHOW_TEMPLATE_BANNER = true

export interface AgreementSection {
  number: number
  title: string
  paragraphs: string[]
}

export const agreementSections: AgreementSection[] = [
  {
    number: 1,
    title: 'Agreement and Electronic Acceptance',
    paragraphs: [
      'This Storage Service Agreement (“Agreement”) governs access to and use of the cloud storage, backup, archive, recovery and related services (“Services”) provided under the DVT brand (“DVT”, “we”, “us” or “our”). By creating an account, purchasing or activating a Service, or selecting the acceptance checkbox and continuing to login/use the Service, the customer (“Customer”, “you” or “your”) confirms that the Customer has read, understood and agreed to this Agreement. If an individual accepts for an organisation, that individual confirms that they are authorised to bind that organisation.',
      'The version of this Agreement displayed or linked at the time of acceptance forms part of the electronic service record. DVT records the Agreement version accepted at registration, together with the account identifier and the date and time the account was created.',
    ],
  },
  {
    number: 2,
    title: 'Service Scope',
    paragraphs: [
      'DVT may provide one or more of the following according to the Customer’s selected plan, quotation or order: cloud storage; scheduled or automatic backup; offsite/secondary backup; file archive; CCTV archive; version history or snapshots; recovery assistance; storage migration; and related technical support. Features, capacity, retention, recovery method, users/devices and support level are limited to the plan or written order purchased by the Customer.',
      'Any feature not expressly included in the applicable plan/order is excluded. Custom services, dedicated infrastructure, unusually large restores, physical media, migration, on-site support and third-party licences may be separately chargeable.',
    ],
  },
  {
    number: 3,
    title: 'Customer Account and Security',
    paragraphs: [
      'The Customer is responsible for providing accurate account information, keeping usernames, passwords, encryption keys, recovery codes and authentication devices confidential, and promptly reporting suspected unauthorised access. The Customer must use reasonable security controls and multi-factor authentication where available.',
      'Unless DVT has expressly agreed to manage a credential or encryption key, loss of a Customer-controlled key, password or recovery credential may make data unrecoverable. DVT is not responsible for access caused by the Customer sharing or failing to protect credentials, except to the extent directly caused by DVT’s breach of its obligations.',
    ],
  },
  {
    number: 4,
    title: 'Customer Data and Ownership',
    paragraphs: [
      'As between DVT and the Customer, the Customer retains ownership of Customer Data. The Customer grants DVT and its authorised infrastructure/sub-processors only the rights reasonably necessary to host, transmit, store, back up, secure, restore, support and otherwise provide the Services.',
      'The Customer is responsible for ensuring that it has the legal right and authority to upload, store and process Customer Data and to instruct DVT to process it. DVT does not acquire ownership of Customer Data merely because it is stored through the Service.',
    ],
  },
  {
    number: 5,
    title: 'Privacy and Personal Data',
    paragraphs: [
      'Where DVT processes personal data in connection with account administration, billing, support or the storage service, DVT will process such data for lawful service-related purposes and in accordance with applicable Indian data-protection requirements. DVT collects the following account and personal data: name, email address, optional phone number and profile picture; a one-way hash of the password (the password itself is never stored); subscription and payment records; sign-in session details; and the files, folders, share links and device registrations the Customer creates in the Service. This data is used to create and run the account, provide the storage service, process billing, give support and keep the Service secure. A Customer can ask for access to, correction of or deletion of this data, or raise a privacy complaint, using the contact details in the Service Provider Contact section of this Agreement.',
      'For Customer Data uploaded by a business Customer, the parties’ data-protection roles depend on the actual processing activity. Where appropriate, DVT may act as a processor/service provider on the Customer’s instructions. The Customer remains responsible for determining whether its collection and use of personal data is lawful and for giving required notices/consents to its own users, employees or customers.',
    ],
  },
  {
    number: 6,
    title: 'Security Measures',
    paragraphs: [
      'DVT uses the following measures in the standard Service: encrypted transmission (HTTPS) between the Customer’s browser or app and the Service; account authentication, with email verification required before the first login; passwords stored only as one-way hashes; storage-access credentials held in encrypted form; account-level access controls, so each account can reach only its own files and the share links it creates; and a recoverable trash, plus version history on the plans that include it. Encryption at rest for stored files, snapshots, and separated or immutable/object-lock copies are not part of the standard plans and are provided only where the applicable order states them.',
      'No internet, cloud, storage or security system can be guaranteed to be completely secure or continuously available. DVT therefore does not promise “100% security” or absolute prevention of cyberattack, ransomware, corruption, deletion or service interruption.',
    ],
  },
  {
    number: 7,
    title: 'Backup Responsibilities',
    paragraphs: [
      'The Customer must verify that the correct data sources, devices, folders, cameras or systems are included in the backup configuration. Unless the purchased plan expressly states otherwise, DVT does not guarantee that every file, application, database or device is automatically included.',
      'For business-critical information, the Customer is responsible for keeping an additional independent copy. A successful backup status does not replace periodic recovery testing. DVT may provide restore testing where included in the applicable plan.',
    ],
  },
  {
    number: 8,
    title: 'Storage Capacity, Fair Use and Overages',
    paragraphs: [
      'Storage capacity and price are those of the plan shown on the Pricing page, or stated in the written order, when the Customer purchases. When an account reaches its storage capacity, further uploads are blocked until the Customer deletes files (deleted files count towards storage until the trash is emptied) or moves to a larger plan. DVT does not charge automatically for exceeding capacity. Capacity beyond the listed plans is available only under a written order.',
      'The Customer must not deliberately use a plan in a way designed to bypass technical limits, billing metrics or fair-use restrictions.',
    ],
  },
  {
    number: 9,
    title: 'CCTV Archive',
    paragraphs: [
      'Where CCTV archive is purchased, required storage depends on camera count, bitrate/resolution, recording hours, compression, retention period and actual recording behaviour. Estimates are planning estimates and actual consumption may differ. If actual storage reaches the purchased capacity, new uploads, including CCTV backup uploads, are blocked until space is freed or additional capacity is purchased.',
      'DVT does not guarantee that a camera/NVR/DVR will continuously transmit footage where failure is caused by the Customer’s camera, recorder, local network, internet connection, power supply, configuration or unsupported equipment.',
    ],
  },
  {
    number: 10,
    title: 'Service Availability (SLA)',
    paragraphs: [
      'DVT targets 99.5% monthly availability for the DVT-controlled customer portal/storage access layer only where a paid plan expressly includes this SLA. No current plan includes it, so the target is not a commitment to any customer unless it is stated in the Customer’s plan or order. It is a service target, not a guarantee of uninterrupted access. Availability measurement excludes Scheduled Maintenance and Excluded Events described below.',
      'If a particular upstream cloud/infrastructure provider offers a different service level, DVT may identify that provider commitment in the Customer’s order. DVT does not pass through a stronger SLA than DVT has contractually committed to in writing.',
    ],
  },
  {
    number: 11,
    title: 'Scheduled Maintenance and Excluded Events',
    paragraphs: [
      'DVT will give advance notice of scheduled maintenance by email or on its website where reasonably practicable. SLA calculations exclude outages or degradation caused by: Customer systems, credentials, local internet/power, unsupported software or hardware; third-party services outside DVT’s reasonable control; emergency security maintenance; force majeure; legal/government action; attacks that cannot reasonably be prevented by the agreed controls; or Customer misuse/suspension for breach or non-payment.',
    ],
  },
  {
    number: 12,
    title: 'Support and Incident Handling',
    paragraphs: [
      'Support is available through the Support page in the Service (email and phone) and as stated in the selected plan/order. DVT will use reasonable efforts to acknowledge and work on reported incidents according to severity. Unless a specific support schedule is purchased, response times are targets rather than guaranteed resolution times.',
      'Standard acknowledgement targets: Critical service-access incident — acknowledgement within 4 business hours; High impact — within 8 business hours; Normal request — within 1 business day. Resolution time depends on diagnosis, data volume, third-party dependencies and the nature of the incident.',
    ],
  },
  {
    number: 13,
    title: 'Data Restore and Recovery',
    paragraphs: [
      'Restore time depends on the amount of data, internet bandwidth, archive tier, integrity of available backup copies and third-party infrastructure. DVT does not guarantee a fixed Recovery Time Objective (RTO) or Recovery Point Objective (RPO) unless the applicable plan/order expressly states those values.',
      'The Customer must test restored data promptly and notify DVT of any material issue. Large-scale restores, expedited restores or physical data delivery may incur additional charges if not included in the plan.',
      'Files the Customer deletes are moved to the trash of the account and can be restored from there by the Customer until the trash is emptied or the item is deleted from the trash. Both actions are permanent, and DVT does not provide recovery of files after that. Items may also be removed from the trash automatically by the storage system.',
    ],
  },
  {
    number: 14,
    title: 'Fees, Billing and Taxes',
    paragraphs: [
      'The Customer will pay the subscription, storage, setup, migration, overage and other charges shown in the applicable plan/order. Recurring charges are payable for the applicable billing period. Applicable taxes, statutory levies, payment-gateway charges or separately identified third-party usage charges may be additional.',
      'DVT may change future pricing by giving reasonable notice. A pricing change will not retrospectively alter amounts already paid for a completed prepaid period unless required by law or mutually agreed.',
    ],
  },
  {
    number: 15,
    title: 'Non-Payment and Suspension',
    paragraphs: [
      'If a renewal payment is not received by the renewal date, the subscription becomes past due. A renewal paid within the 3-day grace period continues the plan unchanged. If the amount is still unpaid after the grace period, the account is moved to the Free plan and its storage limit reduces to the Free plan capacity. This change does not delete any files. If the stored data is above the Free plan capacity, new uploads are blocked until the Customer deletes files or restores a paid plan. DVT may also suspend an account where Section 16 or Section 24 allows. Downgrade and suspension do not cancel amounts already due, and DVT does not delete Customer Data solely because of non-payment.',
    ],
  },
  {
    number: 16,
    title: 'Acceptable Use',
    paragraphs: [
      'The Customer must not use the Services to store, distribute or facilitate content or activity that is unlawful; infringes intellectual-property or privacy rights; contains malicious code intended to harm others; facilitates unauthorised access or cyber abuse; or materially interferes with the Service or other customers.',
      'DVT may suspend or restrict affected content/accounts where reasonably necessary to comply with law, respond to a valid legal direction, protect the Service, or address a material breach. Where legally and operationally possible, DVT will provide notice.',
    ],
  },
  {
    number: 17,
    title: 'Third-Party Infrastructure',
    paragraphs: [
      'DVT may use third-party data centres, cloud storage, hosting, network, security, software, payment or support providers to deliver the Service. Their systems may be subject to their own technical limitations, maintenance and terms. DVT remains responsible for its own contractual obligations but is not responsible for third-party failures beyond the responsibility DVT has expressly assumed under this Agreement.',
      'Customer files are stored in S3-compatible object storage hosted in the Asia-Pacific region, outside India, and online payments are processed by Razorpay. A Customer with specific data-location requirements must state them in the order before purchase.',
    ],
  },
  {
    number: 18,
    title: 'Confidentiality',
    paragraphs: [
      'Each party will use reasonable care to protect the other party’s non-public confidential information and will use it only for the purpose of providing or receiving the Services. Confidentiality obligations do not apply to information that is public without breach, independently developed, lawfully received from another source, or required to be disclosed by law. Where legally permitted, the receiving party will give reasonable notice of compulsory disclosure.',
    ],
  },
  {
    number: 19,
    title: 'Data Retention after Termination',
    paragraphs: [
      'Account deletion is permanent. When an account is deleted, whether at the Customer’s request or by DVT under Section 24, DVT deletes the account’s files, folders, trash, version history and share links and removes the account, and a deleted account cannot be restored. A Customer can request deletion through the support contact in the Service Provider Contact section. The Customer must download or migrate required data before requesting deletion or before the service end date. Closing a subscription, moving to the Free plan or non-payment does not by itself delete files; Section 15 explains what happens to the storage limit.',
    ],
  },
  {
    number: 20,
    title: 'Intellectual Property',
    paragraphs: [
      'DVT and its licensors retain rights in the DVT platform, branding, documentation, software, interfaces and service technology. The Customer receives only the limited right to use the Service during the active subscription. Customer Data remains subject to Section 4.',
    ],
  },
  {
    number: 21,
    title: 'Disclaimer',
    paragraphs: [
      'Except for express commitments in the applicable order and to the extent permitted by law, the Services are provided on an “as available” basis. DVT does not warrant that the Service will be uninterrupted, error-free, immune from all attacks, or suitable for every regulatory or archival purpose. The Customer is responsible for evaluating whether the selected plan meets its legal, retention and business-continuity requirements.',
    ],
  },
  {
    number: 22,
    title: 'Limitation of Liability',
    paragraphs: [
      'To the maximum extent permitted by applicable law, neither party will be liable for indirect, incidental, special, exemplary or consequential losses, including lost profits or lost business, arising from the Service. DVT’s aggregate contractual liability arising from the affected Service will not exceed the fees paid or payable by the Customer for that affected Service during the six (6) months immediately preceding the event giving rise to the claim.',
      'This limitation does not apply to liability that cannot legally be excluded or limited.',
    ],
  },
  {
    number: 23,
    title: 'Indemnity',
    paragraphs: [
      'The Customer will be responsible for third-party claims arising from Customer Data or the Customer’s unlawful use of the Service, to the extent caused by the Customer’s breach of this Agreement, infringement of third-party rights, or violation of applicable law. DVT will remain responsible for claims to the extent directly caused by DVT’s own breach or unlawful conduct.',
    ],
  },
  {
    number: 24,
    title: 'Term, Termination and Account Closure',
    paragraphs: [
      'This Agreement begins when accepted and continues while the Customer has an active account or Service. The Customer may cancel according to the applicable plan. DVT may terminate or suspend for material breach, unlawful use, security risk, prolonged non-payment or where continued service becomes legally or technically impracticable, subject to reasonable notice where appropriate.',
      'Termination does not affect accrued payment obligations, confidentiality, ownership, liability provisions or other terms intended to survive.',
    ],
  },
  {
    number: 25,
    title: 'Changes to this Agreement',
    paragraphs: [
      'DVT may update this Agreement for legal, security, operational or service changes. DVT will communicate material changes through the account, website, email or another reasonable channel before they take effect where practicable. For changes that materially alter the Customer’s rights or obligations, DVT may require renewed electronic acceptance.',
    ],
  },
  {
    number: 26,
    title: 'Governing Law and Dispute Resolution',
    paragraphs: [
      'This Agreement is governed by the laws of India. The parties must first attempt in good faith to resolve disputes through written escalation. Subject to applicable consumer-protection and mandatory jurisdiction rules, courts having jurisdiction at Mumbai, Maharashtra will have jurisdiction.',
    ],
  },
  {
    number: 27,
    title: 'Notices and Contact',
    paragraphs: [
      'Service, billing, legal and privacy notices may be delivered through the registered email address, customer portal or other contact information supplied by the Customer. The Customer must keep contact information current.',
    ],
  },
  {
    number: 28,
    title: 'Entire Agreement and Order of Precedence',
    paragraphs: [
      'This Agreement, together with the privacy terms in Section 5, the applicable plan/order and any signed/custom addendum, forms the agreement for the Service. If terms conflict, a signed/custom order or addendum prevails for the specific Customer, followed by this Agreement, unless the order expressly states otherwise.',
    ],
  },
]

export const slaSummary =
  'Availability target (where included): 99.5% monthly for the DVT-controlled service layer. Critical incident acknowledgement target: 4 business hours. High-impact incident acknowledgement target: 8 business hours. Normal support request acknowledgement target: 1 business day. RPO/RTO: Not guaranteed unless expressly specified in the Customer’s plan/order. Scheduled maintenance and Excluded Events: excluded from availability calculation. Service credits: None by default.'
