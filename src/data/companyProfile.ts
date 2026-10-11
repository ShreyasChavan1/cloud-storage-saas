// Company Profile & Service Portfolio, transcribed from
// DVT_Company_Profile_Client_Booklet.pdf.

export interface TitledItem {
  title: string
  text: string
}

export const profileHero = {
  title: 'Company Profile & Service Portfolio',
  tagline: 'Cloud Storage • Data Protection • Managed Digital Services',
  motto: 'Secure. Store. Scale.',
  pillars: [
    { title: 'Cloud & Data Protection', text: 'Backup • Recovery • Privacy • Scalable Storage' },
    { title: 'Managed Digital Services', text: 'Web • Apps • Social Media • Digital Support' },
  ],
  summary: 'Practical technology solutions for safer data, stronger digital presence and simpler technology management.',
  initiative: 'A vision initiative by',
  founder: 'Hrishikesh Dalvi',
}

export const introLetter = {
  heading: 'Introduction Letter',
  subheading: 'A brief introduction for prospective clients and partners.',
  salutation: 'Dear Sir / Madam,',
  greeting: 'Greetings from DVT.',
  paragraphs: [
    'We are pleased to introduce DVT, an emerging technology services company focused on Cloud Storage, Data Protection and Managed Digital Services. Our objective is to help businesses protect important information, improve their digital presence and manage technology requirements through one coordinated service partner.',
    'Our cloud services are designed around practical backup, recovery, privacy and scalability. Our managed digital services cover business websites, web portals, mobile applications, social media management, digital campaigns, maintenance and custom digital projects.',
    'We believe technology should be useful, understandable and aligned with the client’s actual requirement. For this reason, we first understand the business need, define the scope clearly, select suitable technology and then coordinate implementation and support.',
    'The enclosed company profile provides an overview of our capabilities, services, delivery approach and the value we aim to provide. We would be pleased to understand your requirement and propose a suitable solution.',
  ],
  closing: 'Warm regards,',
  signatory: 'Hrishikesh Dalvi',
  signatoryOrg: 'DVT',
  signatoryTagline: 'Cloud Storage & Managed Digital Services',
}

export const atAGlance = {
  heading: 'Company at a Glance',
  subheading: 'One partner for data protection and digital growth.',
  intro:
    'DVT is a technology services company built to make business technology simpler to adopt and easier to manage. We focus on protecting important data and helping organisations build and maintain useful digital systems.',
  cards: [
    { title: 'Our Mission', text: 'Deliver practical, secure and scalable technology services with clear communication and dependable coordination.' },
    { title: 'Our Vision', text: 'Become a trusted technology partner for businesses that need data protection and managed digital solutions.' },
    { title: 'Our Approach', text: 'Understand first. Design clearly. Implement carefully. Support responsibly.' },
    { title: 'Our Values', text: 'Clarity • Privacy • Reliability • Scalability • Professional support' },
  ] as TitledItem[],
  whatWeDoHeading: 'What We Do',
  whatWeDo: [
    'Cloud storage, backup and recovery solutions for important business data.',
    'Privacy-focused data protection with suitable access and encryption controls.',
    'Offsite and secondary backup options for stronger business continuity.',
    'Managed digital services covering websites, apps, social media and ongoing digital support.',
    'Custom technology projects combining cloud infrastructure, development and support.',
  ],
}

export const cloudServices = {
  heading: 'Cloud Storage & Data Protection',
  subheading: 'Protect important information. Recover when needed. Grow without complexity.',
  items: [
    { title: 'Secure Cloud Backup', text: 'Managed backup for documents, media, business files and selected systems.' },
    { title: 'Automatic Backup', text: 'Scheduled backup helps reduce dependence on manual copying.' },
    { title: 'Data Protection with Privacy', text: 'Suitable access controls and encryption options are selected according to the solution.' },
    { title: 'Scalable Storage', text: 'Capacity can be expanded as business data grows.' },
    { title: 'Versioning & Snapshots', text: 'Previous versions can support recovery after accidental changes or selected incidents.' },
    { title: 'Ransomware-Resilient Options', text: 'Separated or immutable backup options can be used where the selected platform supports them.' },
    { title: 'Offsite / Secondary Backup', text: 'An additional copy away from the main location helps reduce single-location risk.' },
    { title: 'Recovery Support', text: 'Assistance with restoring available backup data within the agreed service scope.' },
    { title: 'CCTV Archive Solutions', text: 'Storage planning for CCTV footage based on capacity, retention and access needs.' },
  ] as TitledItem[],
  footnote: 'Backup is not only storage. It is preparation for recovery.',
}

export const managedServices = {
  heading: 'Managed Digital Services',
  subheading: 'From idea to delivery - with one coordination point.',
  intro:
    'DVT can manage selected digital requirements from planning to delivery. Where specialist skills are required, suitable professionals can be coordinated under a defined project scope while DVT remains the client’s primary coordination point.',
  items: [
    { title: 'Website & Web Solutions', text: 'Business websites, portfolio sites, portals and custom web requirements.' },
    { title: 'Mobile App Solutions', text: 'Mobile applications developed around approved features and user needs.' },
    { title: 'Social Media Management', text: 'Page setup, content coordination, posting support and ongoing account handling.' },
    { title: 'Digital Advertising', text: 'Campaign planning and coordination for selected online and social platforms.' },
    { title: 'Professional Digital Presence', text: 'Business profiles, digital assets and online presence setup.' },
    { title: 'Maintenance & Support', text: 'Ongoing support for websites, applications and selected digital services.' },
    { title: 'Custom Managed Digital Solutions', text: 'Projects combining web, cloud, hosting, databases, APIs, integrations and ongoing support.' },
  ] as TitledItem[],
  managedHeading: 'What ‘Managed’ Means',
  managedText:
    'The client does not need to coordinate multiple technical people independently. DVT can help define requirements, coordinate delivery, track scope, manage communication and support the solution after launch according to the agreed engagement.',
}

export const clientBenefits = {
  heading: 'Client Benefits',
  subheading: 'Technology designed around business outcomes.',
  items: [
    { title: 'One Point of Coordination', text: 'Discuss cloud and digital requirements through one service partner.' },
    { title: 'Better Data Readiness', text: 'Regular backup and recovery planning can reduce the impact of data loss incidents.' },
    { title: 'Privacy-Focused Design', text: 'Access and encryption options are selected according to the solution and client need.' },
    { title: 'Scalable Services', text: 'Start with the required capacity or scope and expand as the business grows.' },
    { title: 'Less Manual Follow-Up', text: 'Automation and managed coordination reduce routine technology administration.' },
    { title: 'Flexible Delivery', text: 'Services can be adapted for small businesses, growing organisations and custom projects.' },
    { title: 'Clear Scope', text: 'Deliverables, responsibilities, third-party dependencies and support terms are defined before execution.' },
    { title: 'Ongoing Support', text: 'DVT remains a coordination point where maintenance or support is included.' },
  ] as TitledItem[],
  whoHeading: 'Who We Can Serve',
  whoText:
    'Small and growing businesses • Professional offices • Retail and service businesses • Project-based organisations • Local enterprises • Businesses with important files or CCTV data • Organisations requiring websites, portals, apps or managed digital support.',
}

export const howWeWork = {
  heading: 'How We Work',
  subheading: 'A simple process with clear responsibilities.',
  steps: [
    { title: 'Understand', text: 'We discuss the business need, current setup, data size, users, digital goals and expected outcome.' },
    { title: 'Plan', text: 'We define the service scope, technical approach, responsibilities and dependencies.' },
    { title: 'Implement', text: 'The approved storage, backup or digital solution is configured or developed.' },
    { title: 'Validate', text: 'Access, backup, restore or digital functionality is checked before go-live.' },
    { title: 'Support', text: 'Ongoing monitoring, maintenance or coordination continues according to the agreed scope.' },
  ] as TitledItem[],
  engagementHeading: 'Engagement Options',
  engagement: [
    'Cloud storage subscription for recurring backup and storage requirements.',
    'Project-based delivery for websites, apps, portals and defined digital work.',
    'Monthly managed services for maintenance, social media and recurring digital support.',
    'Custom managed solutions for projects combining infrastructure, development and ongoing support.',
  ],
}

export const technologySecurity = {
  heading: 'Technology, Security & Privacy',
  subheading: 'Strong controls, realistic promises.',
  technologyHeading: 'Technology Approach',
  technologyText:
    'Depending on the requirement, solutions may use managed cloud storage, NAS systems, S3-compatible object storage, backup software, versioning, snapshots, offsite copies, VPS/cloud hosting, databases, APIs and professional development tools. The final technology stack is selected only after the requirement is understood.',
  securityHeading: 'Security Approach',
  security: [
    'Encryption options for data transfer and storage, depending on the selected platform.',
    'Controlled user and administrator access.',
    'Multi-factor authentication where supported and appropriate.',
    'Version history, snapshots and separated copies for stronger recovery readiness.',
    'Immutable or object-lock options where supported by the selected storage platform.',
  ],
  privacyHeading: 'Privacy Approach',
  privacyText:
    'Privacy depends on architecture. Where client-side or end-to-end encryption is selected, access and key responsibilities must be clearly defined. DVT does not make unrealistic claims such as ‘100% secure’; instead, the actual controls, retention, recovery and support responsibilities are documented for the client.',
  continuityHeading: 'Business Continuity Principle',
  continuityText:
    'For important data, DVT recommends keeping more than one copy and maintaining a separated or offsite copy. Critical clients may also consider immutable backup where suitable.',
}

export const capability = {
  heading: 'Capability & Professional Experience',
  subheading: 'A business-focused approach to technology delivery.',
  intro:
    'DVT is an emerging company. We therefore present our capability honestly rather than using inflated client counts, project numbers or years of experience.',
  bringHeading: 'What We Bring',
  bring: [
    'Experience in project coordination and structured execution.',
    'Understanding of business workflows, documentation and reporting.',
    'Testing, issue tracking and user-support discipline.',
    'Vendor and stakeholder coordination.',
    'Technology service planning and requirement definition.',
    'Ability to coordinate specialist developers and technical professionals for project-specific work.',
  ],
  whyHeading: 'Why This Matters to Clients',
  whyText:
    'A successful technology project needs more than coding or storage capacity. It needs clear requirements, responsibility, communication, testing, handover and support. DVT’s operating model is designed around these practical delivery needs.',
  closingLines: ['Our goal is not to sell more technology.', 'It is to give the client the right technology, clearly managed.'],
}

export const whyWorkWithUs = {
  heading: 'Why Work With Us',
  subheading: 'Simple solutions. Clear communication. Responsible delivery.',
  items: [
    { title: 'Practical First', text: 'We focus on what the client actually needs.' },
    { title: 'Clear Communication', text: 'Technical information is explained in understandable language.' },
    { title: 'Flexible Model', text: 'Cloud, digital and custom services can be combined as required.' },
    { title: 'Responsible Security', text: 'We use realistic security language and clearly define controls.' },
    { title: 'Managed Delivery', text: 'We coordinate requirements, implementation and support.' },
    { title: 'Built to Scale', text: 'Solutions can evolve as the client’s business grows.' },
  ] as TitledItem[],
  commitmentHeading: 'Our Commitment',
  commitmentText:
    'We aim to keep every solution understandable, scalable and suitable for the client’s real requirement. We clearly communicate what is included, what depends on third-party platforms and what support is being provided.',
  thanks: 'Thank you for considering DVT as your technology service partner.',
}
