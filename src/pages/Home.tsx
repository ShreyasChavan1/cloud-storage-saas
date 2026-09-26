import { Link } from "react-router-dom";
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
} from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen bg-[#070D1C] text-white overflow-hidden">
      {/* Navigation */}
      <header className="border-b border-[#263250] bg-[#070D1C]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/dalvi-vaultgrid-logo.png"
              alt="DV Technologies"
              className="h-14 w-auto object-contain"
            />

            <div className="hidden sm:block">
              <div className="font-semibold tracking-tight text-white">
                DV Technologies
              </div>
              <div className="text-[10px] text-[#91A0C0] -mt-0.5">
                Cloud Storage & Backup
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-[#A9B5CC]">
            <a
              href="#features"
              className="hover:text-[#16C6D4] transition"
            >
              Features
            </a>

            <a
              href="#cctv"
              className="hover:text-[#16C6D4] transition"
            >
              CCTV Backup
            </a>

            <a
              href="#security"
              className="hover:text-[#16C6D4] transition"
            >
              Security
            </a>

            <Link
              to="/pricing"
              className="hover:text-[#16C6D4] transition"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex px-4 py-2 text-sm text-[#A9B5CC] hover:text-white transition"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF7000] text-white text-sm font-medium hover:bg-[#FF8126] transition shadow-lg shadow-orange-950/20"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-[#087C91]/15 blur-[130px] rounded-full" />

            <div className="absolute top-40 left-10 w-[300px] h-[300px] bg-[#FF7000]/5 blur-[110px] rounded-full" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-20 lg:pt-32 lg:pb-28">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#16C6D4]/20 bg-[#16C6D4]/5 text-xs text-[#9FDDE3] mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16C6D4] shadow-[0_0_8px_rgba(22,198,212,0.8)]" />
                Secure cloud storage & automatic backup
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
                Secure cloud storage
                <br />
                for your files and
                <br />
                <span className="text-[#FF7000]">
                  CCTV & NVR recordings.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl mx-auto text-base sm:text-lg text-[#91A0C0] leading-8">
                DV Technologies provides secure cloud storage for your files,
                automatic CCTV backup, and NVR recording backup from one
                simple platform.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-[#FF7000] text-white font-medium hover:bg-[#FF8126] transition shadow-lg shadow-orange-950/30"
                >
                  Start storing securely
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl border border-[#263250] bg-[#111A30]/70 text-[#D6DDEC] hover:border-[#16C6D4]/40 hover:bg-[#111A30] transition"
                >
                  <Play className="w-4 h-4 text-[#16C6D4]" />
                  See how it works
                </a>
              </div>
            </div>

            {/* Product preview */}
            <div className="mt-20 max-w-5xl mx-auto">
              <div className="rounded-2xl border border-[#263250] bg-[#0D1426] p-2 shadow-2xl shadow-black/30">
                <div className="rounded-xl border border-[#263250] bg-[#0B1222] overflow-hidden">
                  <div className="h-10 border-b border-[#263250] flex items-center px-4 gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF7000]/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16C6D4]/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />

                    <div className="ml-5 h-6 flex-1 max-w-md mx-auto rounded-md bg-[#111A30] border border-[#263250]" />
                  </div>

                  <div className="p-6 grid md:grid-cols-[180px_1fr] gap-6 min-h-[330px]">
                    <div className="hidden md:block space-y-2">
                      <div className="h-8 rounded-lg bg-[#FF7000]/15 border border-[#FF7000]/20" />
                      <div className="h-8 rounded-lg bg-[#111A30]" />
                      <div className="h-8 rounded-lg bg-[#111A30]" />
                      <div className="h-8 rounded-lg bg-[#111A30]" />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-5">
                        <div>
                          <div className="h-5 w-32 bg-[#263250] rounded" />
                          <div className="h-3 w-48 bg-[#18233B] rounded mt-2" />
                        </div>

                        <div className="h-8 w-24 bg-[#FF7000]/20 border border-[#FF7000]/20 rounded-lg" />
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        {[
                          ["Documents", "124 files", FolderLock],
                          ["CCTV Backup", "2.4 TB", Video],
                          ["Shared Files", "36 files", Cloud],
                        ].map(([title, value, Icon]) => {
                          const ItemIcon = Icon as typeof FolderLock;

                          return (
                            <div
                              key={title as string}
                              className="rounded-xl border border-[#263250] bg-[#111A30]/70 p-4"
                            >
                              <div className="w-9 h-9 rounded-lg bg-[#16C6D4]/10 border border-[#16C6D4]/10 mb-5 flex items-center justify-center">
                                <ItemIcon className="w-4 h-4 text-[#16C6D4]" />
                              </div>

                              <div className="text-sm text-[#D6DDEC]">
                                {title as string}
                              </div>

                              <div className="text-xs text-[#65738F] mt-1">
                                {value as string}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-5 rounded-xl border border-[#263250] bg-[#111A30]/70 p-5">
                        <div className="flex justify-between mb-3">
                          <span className="text-xs text-[#91A0C0]">
                            Storage used
                          </span>

                          <span className="text-xs text-[#D6DDEC]">
                            48.2 GB / 100 GB
                          </span>
                        </div>

                        <div className="h-2 rounded-full bg-[#1A2740] overflow-hidden">
                          <div className="h-full w-[48%] bg-gradient-to-r from-[#FF7000] to-[#16C6D4] rounded-full" />
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
          className="border-y border-[#263250] bg-[#0A1222]"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div key={item.title} className="flex gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-lg border border-[#263250] bg-[#111A30] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#16C6D4]" />
                  </div>

                  <div>
                    <h2 className="text-sm font-medium text-white">
                      {item.title}
                    </h2>

                    <p className="text-xs text-[#65738F] mt-1 leading-5">
                      {item.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cloud Storage */}
        <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#16C6D4] mb-5">
                <FolderLock className="w-4 h-4" />
                Cloud Storage
              </div>

              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                One place for your important files.
              </h2>

              <p className="mt-5 text-[#91A0C0] leading-7 max-w-xl">
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
                    <div className="w-5 h-5 rounded-full bg-[#16C6D4]/10 border border-[#16C6D4]/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-[#16C6D4]" />
                    </div>

                    <span className="text-sm text-[#D6DDEC]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 mt-8 text-sm text-[#16C6D4] hover:text-[#6BE0E8] transition"
              >
                View storage plans
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-[#263250] bg-[#0D1426] p-6 shadow-xl shadow-black/20">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Documents", "128 files"],
                    ["Projects", "42 files"],
                    ["Photos", "1,284 files"],
                    ["Shared", "36 files"],
                  ].map(([name, count]) => (
                    <div
                      key={name}
                      className="rounded-xl border border-[#263250] bg-[#111A30] p-5"
                    >
                      <FolderLock className="w-5 h-5 text-[#16C6D4]" />

                      <div className="mt-8 text-sm text-white">
                        {name}
                      </div>

                      <div className="text-xs text-[#65738F] mt-1">
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
          className="border-y border-[#263250] bg-[#0A1222]"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-2xl border border-[#263250] bg-[#0D1426] p-6 shadow-xl shadow-black/20">
                  <div className="text-xs text-[#65738F] mb-6">
                    AUTOMATIC BACKUP
                  </div>

                  <div className="space-y-4">
                    {/* NVR */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-[#263250] bg-[#111A30]">
                      <div className="w-10 h-10 rounded-lg bg-[#16C6D4]/10 flex items-center justify-center">
                        <Server className="w-5 h-5 text-[#16C6D4]" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm text-white">NVR</div>
                        <div className="text-xs text-[#65738F]">
                          Local recording
                        </div>
                      </div>

                      <Check className="w-4 h-4 text-[#16C6D4]" />
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="w-5 h-5 text-[#263250] rotate-90" />
                    </div>

                    {/* Gateway */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-[#FF7000]/20 bg-[#FF7000]/5">
                      <div className="w-10 h-10 rounded-lg bg-[#FF7000]/10 flex items-center justify-center">
                        <UploadCloud className="w-5 h-5 text-[#FF7000]" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm text-white">
                          Nimbus Gateway
                        </div>

                        <div className="text-xs text-[#65738F]">
                          Automatic upload
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#16C6D4]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16C6D4] shadow-[0_0_7px_rgba(22,198,212,0.7)]" />
                        Active
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="w-5 h-5 text-[#263250] rotate-90" />
                    </div>

                    {/* Cloud */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-[#263250] bg-[#111A30]">
                      <div className="w-10 h-10 rounded-lg bg-[#16C6D4]/10 flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-[#16C6D4]" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm text-white">
                          Nimbus Cloud
                        </div>

                        <div className="text-xs text-[#65738F]">
                          Off-site recording backup
                        </div>
                      </div>

                      <Check className="w-4 h-4 text-[#16C6D4]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#16C6D4] mb-5">
                  <Video className="w-4 h-4" />
                  CCTV & NVR Backup
                </div>

                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                  Keep your CCTV recordings beyond the NVR.
                </h2>

                <p className="mt-5 text-[#91A0C0] leading-7 max-w-xl">
                  Nimbus can automatically transfer NVR recordings to cloud
                  storage, giving businesses an off-site copy of important
                  footage.
                </p>

                <div className="mt-7 grid sm:grid-cols-2 gap-4">
                  {[
                    "Automatic uploads",
                    "Off-site backup",
                    "Multiple cameras",
                    "Cloud access",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-[#16C6D4]" />

                      <span className="text-sm text-[#D6DDEC]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32"
        >
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-wider text-[#16C6D4] mb-5">
              How it works
            </div>

            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Simple from setup to backup.
            </h2>

            <p className="mt-5 text-[#91A0C0] leading-7">
              Connect your devices, choose what you want protected, and let
              Nimbus handle the rest.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              {
                number: "01",
                icon: Zap,
                title: "Connect",
                text: "Create your Nimbus account and connect your storage or NVR.",
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
                  className="rounded-2xl border border-[#263250] bg-[#0D1426] p-7 hover:border-[#16C6D4]/30 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#4D5B76]">
                      {step.number}
                    </span>

                    <Icon className="w-5 h-5 text-[#16C6D4]" />
                  </div>

                  <h3 className="mt-12 text-lg font-medium text-white">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm text-[#65738F] leading-6">
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
          className="border-y border-[#263250] bg-[#0A1222]"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
            <div className="max-w-3xl mx-auto text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-[#16C6D4]/10 border border-[#16C6D4]/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#16C6D4]" />
              </div>

              <h2 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight">
                Built to keep your data where it belongs.
              </h2>

              <p className="mt-5 text-[#91A0C0] leading-7">
                Nimbus is designed to give you a central place for important
                files and backup data, with controlled access to your account
                and stored content.
              </p>

              <div className="mt-10 grid sm:grid-cols-3 gap-5 text-left">
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
                    text: "Access your stored files through the Nimbus application.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#263250] bg-[#070D1C] p-5"
                  >
                    <h3 className="text-sm font-medium text-white">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-xs text-[#65738F] leading-5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
          <div className="relative overflow-hidden rounded-3xl border border-[#263250] bg-[#0D1426] px-6 py-14 sm:px-12 text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[450px] h-[200px] bg-[#16C6D4]/10 blur-[90px] rounded-full pointer-events-none" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Keep your important data accessible.
              </h2>

              <p className="mt-4 text-[#91A0C0] max-w-xl mx-auto">
                Store your files and protect your CCTV recordings with Nimbus
                cloud storage.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#FF7000] text-white font-medium hover:bg-[#FF8126] transition shadow-lg shadow-orange-950/30"
                >
                  Create your account
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-[#263250] text-[#D6DDEC] hover:border-[#16C6D4]/40 hover:bg-[#111A30] transition"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#263250] bg-[#070D1C]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-10">
            {/* Brand */}
            <div>
              <img
                src="/dalvi-vaultgrid-logo.png"
                alt="DV Technologies"
                className="h-14 w-auto object-contain"
              />

              <p className="mt-4 text-sm text-[#65738F] max-w-sm leading-6">
                Secure cloud storage, automatic CCTV backup and NVR cloud
                backup solutions from DV Technologies.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-white">
                Product
              </h3>

              <div className="mt-4 space-y-3 text-sm text-[#91A0C0]">
                <Link
                  to="/pricing"
                  className="block hover:text-[#16C6D4] transition"
                >
                  Pricing
                </Link>

                <a
                  href="#features"
                  className="block hover:text-[#16C6D4] transition"
                >
                  Features
                </a>

                <a
                  href="#cctv"
                  className="block hover:text-[#16C6D4] transition"
                >
                  CCTV & NVR Backup
                </a>

                <a
                  href="#security"
                  className="block hover:text-[#16C6D4] transition"
                >
                  Security
                </a>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold text-white">
                Contact
              </h3>

              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <div className="text-[#65738F]">
                    Owner Email
                  </div>

                  <div className="text-white mt-1">
                    hrishikeshdalvi0504@gmail.com
                  </div>
                </div>

                <div>
                  <div className="text-[#65738F]">
                    Phone
                  </div>

                  <div className="text-white mt-1">
                    9168598659
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-[#263250] flex flex-col sm:flex-row justify-between gap-3 text-xs text-[#4D5B76]">
            <span>
              © {new Date().getFullYear()} DV Technologies. All rights
              reserved.
            </span>

            <span>
              Cloud Storage • CCTV Backup • NVR Backup
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;