import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Cloud,
  ShieldCheck,
  Video,
  Smartphone,
  FolderLock,
  ArrowRight,
  Check,
  Play,
  Server,
  UploadCloud,
  Zap,
  LayoutDashboard,
  Folder,
  Star,
} from "lucide-react";
import { supportApi, SupportContact } from "@/api/support";

const reviews = [
  {
    name: "Rohan Mehta",
    role: "Retail store owner",
    text: "Our NVR only keeps a few weeks of footage. Now every recording is also backed up in the cloud without me touching anything.",
  },
  {
    name: "Priya Nair",
    role: "Interior designer",
    text: "I keep all client drawings and project photos in DVT cloud. Finding a file from my phone while on site takes seconds.",
  },
  {
    name: "Amit Kulkarni",
    role: "Warehouse manager",
    text: "Setup was simple. We installed the gateway on one PC and the camera recordings started uploading on their own.",
  },
  {
    name: "Sneha Patil",
    role: "Chartered accountant",
    text: "Clean, fast and easy to use. Sharing documents with clients is much simpler than emailing large attachments.",
  },
  {
    name: "Imran Shaikh",
    role: "Showroom owner",
    text: "Having an off-site copy of our CCTV footage gives me real peace of mind. The support team also replies quickly.",
  },
  {
    name: "Kavita Deshmukh",
    role: "Clinic administrator",
    text: "Our records are organised in folders and available whenever we need them. Pricing is fair for the storage we get.",
  },
];

const ReviewStars = () => (
  <div className="flex gap-0.5" aria-label="5 out of 5 stars">
    {[0, 1, 2, 3, 4].map((i) => (
      <Star key={i} className="h-4 w-4 fill-[#E8792B] text-[#E8792B]" />
    ))}
  </div>
);

const Home = () => {
  const [contact, setContact] = useState<SupportContact | null>(null);
  const [contactFailed, setContactFailed] = useState(false);

  useEffect(() => {
    supportApi
      .getContact()
      .then(setContact)
      // Without this, any failed fetch (a real bug on the backend's auth
      // requirement, or just a transient network hiccup) left this stuck
      // on "Loading..." forever, since nothing ever set `contact` to
      // anything else. Now it fails visibly instead of silently.
      .catch(() => setContactFailed(true));
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-[#F8F5EF] text-[#17233A]">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#DDD6C8] bg-[#FFFDF9]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/dalvi-vaultgrid-logo.png"
              alt="DV Technologies"
              className="h-14 w-auto object-contain"
            />

            <div className="hidden sm:block">
              <div className="font-semibold tracking-tight text-[#132A4E]">
                DV Technologies
              </div>
              <div className="text-[10px] font-medium tracking-wide text-[#6C6A63]">
                Cloud Storage & Backup
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#575A60] md:flex">
            <a href="#features" className="transition hover:text-[#D86520]">
              Features
            </a>
            <a href="#cctv" className="transition hover:text-[#D86520]">
              CCTV Backup
            </a>
            <a href="#security" className="transition hover:text-[#D86520]">
              Security
            </a>
            <Link
              to="/pricing"
              className="transition hover:text-[#D86520]"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/login"
              className="hidden px-3 py-2 text-sm font-medium text-[#4F535A] transition hover:text-[#D86520] sm:inline-flex"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-md bg-[#E8792B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C9631D] sm:px-5"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative border-b border-[#DDD6C8] bg-[#FFFDF9]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#E8792B]/10 blur-3xl" />
            <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#132A4E]/5 blur-3xl" />
          </div>

          <div className="relative mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl items-center px-6 py-10 lg:px-8 lg:py-12">
            <div className="grid w-full items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 border-l-4 border-[#E8792B] bg-[#F5EEE4] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6C4A32]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E8792B]" />
                  Secure cloud storage & automatic backup
                </div>

                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.035em] !text-[#132A4E] sm:text-5xl lg:text-[3.7rem]">
                  Secure cloud storage
                  <br />
                  for your files and{" "}
                  <span className="text-[#D86520]">
                    CCTV & NVR recordings.
                  </span>
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 !text-[#62645F] sm:text-lg">
                  DV Technologies provides secure cloud storage for your files,
                  automatic CCTV backup, and NVR recording backup from one
                  simple platform.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#E8792B] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C9631D]"
                  >
                    Start storing securely
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[#CFC7B8] bg-white px-6 py-3.5 text-sm font-semibold !text-[#253653] transition hover:border-[#E8792B] hover:text-[#D86520]"
                  >
                    <Play className="h-4 w-4 text-[#E8792B]" />
                    See how it works
                  </a>
                </div>
              </div>

              {/* Product preview */}
              <div className="relative lg:min-w-[560px]">
                <div className="absolute -inset-4 rounded-3xl bg-[#132A4E]/5 blur-2xl" />
                <div className="relative overflow-hidden rounded-2xl border border-[#D8D0C1] bg-white p-2 shadow-[0_20px_60px_rgba(19,42,78,0.10)]">
                  <div className="overflow-hidden rounded-xl border border-[#E2DDD3] bg-[#FBFAF7]">
                    <div className="flex h-10 items-center gap-2 border-b border-[#E2DDD3] px-4">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#E8792B]/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#D7D2C8]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#D7D2C8]" />
                      <div className="ml-4 flex h-6 max-w-md flex-1 items-center rounded-md border border-[#E4DED4] bg-white px-3 text-[11px] text-[#85847E]">
                      https://dv-technologies.in/dashboard
                      </div>
                    </div>

                    <div className="grid min-h-[330px] gap-6 p-6 md:grid-cols-[155px_1fr]">
                      <div className="hidden space-y-2 md:block">
                        {[
                          ["Dashboard", LayoutDashboard, true],
                          ["CCTV", Video, false],
                          ["Files", Folder, false],
                          ["Favorites", Star, false],
                        ].map(([label, Icon, active]) => {
                          const NavIcon = Icon as typeof LayoutDashboard;

                          return (
                            <div
                              key={label as string}
                              className={
                                active
                                  ? "flex h-8 items-center gap-2 rounded-md border border-[#E8792B]/20 bg-[#E8792B]/10 px-2.5 text-xs font-medium text-[#D86520]"
                                  : "flex h-8 items-center gap-2 rounded-md bg-[#F0EDE7] px-2.5 text-xs font-medium text-[#6C6A63]"
                              }
                            >
                              <NavIcon className="h-3.5 w-3.5" />
                              {label as string}
                            </div>
                          );
                        })}
                      </div>

                      <div>
                        <div className="mb-5 flex items-center justify-between">
                          <div>
                            <div className="text-base font-semibold text-[#132A4E]">
                              Dashboard
                            </div>
                            <div className="mt-1 text-xs text-[#85847E]">
                              Your files and CCTV backups
                            </div>
                          </div>
                          <div className="flex h-8 items-center gap-1.5 rounded-md border border-[#E8792B]/25 bg-[#E8792B]/15 px-3 text-xs font-semibold text-[#D86520]">
                            <UploadCloud className="h-3.5 w-3.5" />
                            Upload
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          {[
                            ["Documents", "124 files", FolderLock],
                            ["CCTV Backup", "2.4 TB", Video],
                            ["Shared Files", "36 files", Cloud],
                          ].map(([title, value, Icon]) => {
                            const ItemIcon = Icon as typeof FolderLock;

                            return (
                              <div
                                key={title as string}
                                className="rounded-xl border border-[#E0DBD1] bg-white p-4"
                              >
                                <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8792B]/15 bg-[#E8792B]/10">
                                  <ItemIcon className="h-4 w-4 text-[#D86520]" />
                                </div>

                                <div className="text-sm font-medium text-[#263653]">
                                  {title as string}
                                </div>
                                <div className="mt-1 text-xs text-[#85847E]">
                                  {value as string}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-5 rounded-xl border border-[#E0DBD1] bg-white p-5">
                          <div className="mb-3 flex justify-between">
                            <span className="text-xs text-[#77766F]">
                              Storage used
                            </span>
                            <span className="text-xs font-medium text-[#3C4250]">
                              48.2 GB / 100 GB
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-[#ECE8E1]">
                            <div className="h-full w-[48%] rounded-full bg-[#E8792B]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature strip */}
        <section
          id="features"
          className="border-b border-[#DDD6C8] bg-[#F3EFE7]"
        >
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
            {[
              {
                icon: Cloud,
                title: "Cloud Storage",
                text: "Store and access your files anywhere.",
              },
              {
                icon: Video,
                title: "CCTV Backup",
                text: "Automatically back up recordings to the cloud.",
              },
              {
                icon: Smartphone,
                title: "Mobile Access",
                text: "Access your files from your phone or desktop.",
              },
              {
                icon: ShieldCheck,
                title: "Secure",
                text: "Keep important data away from a single device.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="flex gap-4 border-l border-[#D7D0C2] pl-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#E8792B]/20 bg-white">
                    <Icon className="h-5 w-5 text-[#D86520]" />
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold !text-[#253653]">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-[#77766F]">
                      {item.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cloud Storage */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-28">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#D86520]">
                <FolderLock className="h-4 w-4" />
                Cloud Storage
              </div>

              <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.025em] !text-[#132A4E] sm:text-4xl">
                One place for your important files.
              </h2>

              <p className="mt-5 max-w-xl leading-7 !text-[#62645F]">
                Keep documents, images, videos and other files organized in
                cloud storage that you can access whenever you need them.
              </p>

              <div className="mt-7 space-y-4">
                {[
                  "Access files from anywhere",
                  "Organize files into folders",
                  "Upload from desktop or mobile",
                  "Share files when you need to",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8792B]/10">
                      <Check className="h-3 w-3 text-[#D86520]" />
                    </div>
                    <span className="text-sm !text-[#444B55]">{item}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/pricing"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#D86520] transition hover:text-[#A94F17]"
              >
                View storage plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-[#D8D0C1] bg-white p-6 shadow-[0_18px_50px_rgba(19,42,78,0.07)]">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Documents", "128 files"],
                    ["Projects", "42 files"],
                    ["Photos", "1,284 files"],
                    ["Shared", "36 files"],
                  ].map(([name, count]) => (
                    <div
                      key={name}
                      className="rounded-xl border border-[#E0DBD1] bg-[#FBFAF7] p-5"
                    >
                      <FolderLock className="h-5 w-5 text-[#D86520]" />
                      <div className="mt-8 text-sm font-medium !text-[#253653]">
                        {name}
                      </div>
                      <div className="mt-1 text-xs text-[#85847E]">
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CCTV */}
        <section
          id="cctv"
          className="border-y border-[#DDD6C8] bg-[#F3EFE7]"
        >
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-28">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <div className="rounded-2xl border border-[#D8D0C1] bg-white p-6 shadow-[0_18px_50px_rgba(19,42,78,0.06)]">
                  <div className="mb-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#85847E]">
                    Automatic Backup
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-xl border border-[#E0DBD1] bg-[#FBFAF7] p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#132A4E]/5">
                        <Server className="h-5 w-5 text-[#132A4E]" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-semibold !text-[#253653]">
                          NVR
                        </div>
                        <div className="text-xs text-[#85847E]">
                          Local recording
                        </div>
                      </div>

                      <Check className="h-4 w-4 text-[#2E7451]" />
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="h-5 w-5 rotate-90 text-[#BDB6AA]" />
                    </div>

                    <div className="flex items-center gap-4 rounded-xl border border-[#E8792B]/20 bg-[#FFF8F2] p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8792B]/10">
                        <UploadCloud className="h-5 w-5 text-[#D86520]" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-semibold !text-[#253653]">
                          DVT Gateway
                        </div>
                        <div className="text-xs text-[#85847E]">
                          Automatic upload
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-medium text-[#2E7451]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2E7451]" />
                        Active
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="h-5 w-5 rotate-90 text-[#BDB6AA]" />
                    </div>

                    <div className="flex items-center gap-4 rounded-xl border border-[#E0DBD1] bg-[#FBFAF7] p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#132A4E]/5">
                        <Cloud className="h-5 w-5 text-[#132A4E]" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-semibold !text-[#253653]">
                          DVT Cloud
                        </div>
                        <div className="text-xs text-[#85847E]">
                          Off-site recording backup
                        </div>
                      </div>

                      <Check className="h-4 w-4 text-[#2E7451]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#D86520]">
                  <Video className="h-4 w-4" />
                  CCTV & NVR Backup
                </div>

                <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.025em] !text-[#132A4E] sm:text-4xl">
                  Keep your CCTV recordings beyond the NVR.
                </h2>

                <p className="mt-5 max-w-xl leading-7 !text-[#62645F]">
                  DVT Cloud can automatically transfer NVR recordings to cloud
                  storage, giving businesses an off-site copy of important
                  footage.
                </p>

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  {[
                    "Automatic uploads",
                    "Off-site backup",
                    "Multiple cameras",
                    "Cloud access",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-[#D86520]" />
                      <span className="text-sm !text-[#444B55]">{item}</span>
                    </div>
                  ))}
                </div>

                <figure className="mt-8 max-w-xl rounded-xl border border-[#D8D0C1] bg-white p-5">
                  <ReviewStars />
                  <blockquote className="mt-3 text-sm leading-6 !text-[#444B55]">
                    “{reviews[2].text}”
                  </blockquote>
                  <figcaption className="mt-3 text-xs text-[#85847E]">
                    <span className="font-semibold text-[#253653]">
                      {reviews[2].name}
                    </span>
                    , {reviews[2].role}
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-28"
        >
          <div className="max-w-2xl">
            <div className="mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#D86520]">
              How it works
            </div>

            <h2 className="text-3xl font-semibold tracking-[-0.025em] !text-[#132A4E] sm:text-4xl">
              Simple from setup to backup.
            </h2>

            <p className="mt-5 leading-7 !text-[#62645F]">
              Connect your devices, choose what you want protected, and let
              our app handle the rest.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                number: "01",
                icon: Zap,
                title: "Connect",
                text: "Create your  account and connect your storage or NVR.",
              },
              {
                number: "02",
                icon: UploadCloud,
                title: "Upload",
                text: "Files and supported recordings are transferred to your cloud storage.",
              },
              {
                number: "03",
                icon: ShieldCheck,
                title: "Access",
                text: "Access your stored data whenever you need it from supported devices.",
              },
            ].map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="rounded-xl border border-[#D8D0C1] bg-white p-7 transition hover:-translate-y-0.5 hover:border-[#E8792B]/50 hover:shadow-[0_14px_35px_rgba(19,42,78,0.07)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wider text-[#A29C91]">
                      {step.number}
                    </span>
                    <Icon className="h-5 w-5 text-[#D86520]" />
                  </div>

                  <h3 className="mt-12 text-lg font-semibold !text-[#253653]">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 !text-[#77766F]">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Security */}
        <section
          id="security"
          className="border-y border-[#DDD6C8] bg-[#132A4E]"
        >
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <ShieldCheck className="h-6 w-6 text-[#F29A58]" />
              </div>

              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.025em] text-white sm:text-4xl">
                Built to keep your data where it belongs.
              </h2>

              <p className="mt-5 leading-7 text-[#D5DCE6]">
                DVT Cloud is designed to give you a central place for important
                files and backup data, with controlled access to your account
                and stored content.
              </p>

              <div className="mt-10 grid gap-5 text-left sm:grid-cols-3">
                {[
                  {
                    title: "Account protection",
                    text: "Your cloud data is tied to your authenticated account.",
                  },
                  {
                    title: "Off-site backup",
                    text: "Keep an additional copy of important recordings away from the local NVR.",
                  },
                  {
                    title: "Controlled access",
                    text: "Access your stored files through the DVT Cloud application.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-white/10 bg-white/[0.06] p-5"
                  >
                    <h3 className="text-sm font-semibold text-white">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-[#BFC9D7]">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section
          id="reviews"
          className="border-b border-[#DDD6C8] bg-[#F3EFE7]"
        >
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-28">
            <div className="max-w-2xl">
              <div className="mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#D86520]">
                Customer reviews
              </div>

              <h2 className="text-3xl font-semibold tracking-[-0.025em] !text-[#132A4E] sm:text-4xl">
                Trusted by businesses and professionals.
              </h2>

              <p className="mt-5 leading-7 !text-[#62645F]">
                See how people use DVT Cloud to store files and back up their
                CCTV recordings.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <figure
                  key={review.name}
                  className="flex flex-col rounded-xl border border-[#D8D0C1] bg-white p-7"
                >
                  <ReviewStars />

                  <blockquote className="mt-4 flex-1 text-sm leading-6 !text-[#444B55]">
                    “{review.text}”
                  </blockquote>

                  <figcaption className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8792B]/20 bg-[#E8792B]/10 text-xs font-semibold text-[#D86520]">
                      {review.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-[#253653]">
                        {review.name}
                      </div>
                      <div className="text-xs text-[#85847E]">
                        {review.role}
                      </div>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-6 py-24 lg:px-8 lg:py-28">
          <div className="overflow-hidden rounded-2xl border border-[#D8D0C1] bg-white px-6 py-14 text-center shadow-[0_18px_50px_rgba(19,42,78,0.07)] sm:px-12">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-[-0.025em] !text-[#132A4E] sm:text-4xl">
                Keep your important data accessible.
              </h2>

              <p className="mx-auto mt-4 max-w-xl leading-7 !text-[#62645F]">
                Store your files and protect your CCTV recordings with DVT Cloud
                cloud storage.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#E8792B] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#C9631D]"
                >
                  Create your account
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center rounded-md border border-[#CFC7B8] px-6 py-3.5 text-sm font-semibold !text-[#253653] transition hover:border-[#E8792B] hover:text-[#D86520]"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DDD6C8] bg-[#132A4E]">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <img
                src="/dalvi-vaultgrid-logo.png"
                alt="DV Technologies"
                className="h-14 w-auto object-contain"
              />

              <p className="mt-4 max-w-sm text-sm leading-6 text-[#BFC9D7]">
                Secure cloud storage, automatic CCTV backup and NVR cloud
                backup solutions from DV Technologies.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Product</h3>

              <div className="mt-4 space-y-3 text-sm text-[#BFC9D7]">
                <Link
                  to="/pricing"
                  className="block transition hover:text-[#F29A58]"
                >
                  Pricing
                </Link>

                <a
                  href="#features"
                  className="block transition hover:text-[#F29A58]"
                >
                  Features
                </a>

                <a
                  href="#cctv"
                  className="block transition hover:text-[#F29A58]"
                >
                  CCTV & NVR Backup
                </a>

                <a
                  href="#security"
                  className="block transition hover:text-[#F29A58]"
                >
                  Security
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Contact</h3>

              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <div className="text-[#8FA0B8]">Owner Email</div>
                  <div className="mt-1 text-white">
                    {contact?.email ?? (contactFailed ? "Unavailable" : "Loading...")}
                  </div>
                </div>

                <div>
                  <div className="text-[#8FA0B8]">Phone</div>
                  <div className="mt-1 text-white">
                    {contact?.phone ?? (contactFailed ? "Unavailable" : "Loading...")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-[#8FA0B8] sm:flex-row">
            <span>
              © {new Date().getFullYear()} DV Technologies. All rights
              reserved.
            </span>

            <span>Cloud Storage • CCTV Backup • NVR Backup</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
