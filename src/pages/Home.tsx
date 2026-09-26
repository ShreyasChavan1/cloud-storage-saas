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
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Navigation */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
              <Cloud className="w-5 h-5 text-slate-950" />
            </div>

            <div>
              <div className="font-semibold tracking-tight">Nimbus</div>
              <div className="text-[10px] text-slate-400 -mt-0.5">
                by DV Technologies
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition">
              Features
            </a>
            <a href="#cctv" className="hover:text-white transition">
              CCTV Backup
            </a>
            <a href="#security" className="hover:text-white transition">
              Security
            </a>
            <Link to="/pricing" className="hover:text-white transition">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex px-4 py-2 text-sm text-slate-300 hover:text-white transition"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-950 text-sm font-medium hover:bg-slate-200 transition"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-20 lg:pt-32 lg:pb-28">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-slate-300 mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Cloud storage built for modern businesses
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
                Your files.
                <br />
                Your recordings.
                <br />
                <span className="text-slate-400">Securely in the cloud.</span>
              </h1>

              <p className="mt-7 max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-8">
                Nimbus provides secure cloud storage for your files, automatic
                CCTV backup, and NVR recording backup from one simple platform.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-950 font-medium hover:bg-slate-200 transition"
                >
                  Start storing securely
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07] transition"
                >
                  <Play className="w-4 h-4" />
                  See how it works
                </a>
              </div>
            </div>

            {/* Product preview */}
            <div className="mt-20 max-w-5xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-2 shadow-2xl">
                <div className="rounded-xl border border-white/10 bg-slate-900 overflow-hidden">
                  <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />

                    <div className="ml-5 h-6 flex-1 max-w-md mx-auto rounded-md bg-white/[0.04] border border-white/5" />
                  </div>

                  <div className="p-6 grid md:grid-cols-[180px_1fr] gap-6 min-h-[330px]">
                    <div className="hidden md:block space-y-2">
                      <div className="h-8 rounded-lg bg-white/10" />
                      <div className="h-8 rounded-lg bg-white/[0.04]" />
                      <div className="h-8 rounded-lg bg-white/[0.04]" />
                      <div className="h-8 rounded-lg bg-white/[0.04]" />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-5">
                        <div>
                          <div className="h-5 w-32 bg-white/10 rounded" />
                          <div className="h-3 w-48 bg-white/[0.05] rounded mt-2" />
                        </div>

                        <div className="h-8 w-24 bg-white/10 rounded-lg" />
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        {[
                          ["Documents", "124 files"],
                          ["CCTV Backup", "2.4 TB"],
                          ["Shared Files", "36 files"],
                        ].map(([title, value]) => (
                          <div
                            key={title}
                            className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
                          >
                            <div className="w-9 h-9 rounded-lg bg-white/[0.07] mb-5" />
                            <div className="text-sm text-slate-300">
                              {title}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-5">
                        <div className="flex justify-between mb-3">
                          <span className="text-xs text-slate-400">
                            Storage used
                          </span>
                          <span className="text-xs text-slate-300">
                            48.2 GB / 100 GB
                          </span>
                        </div>

                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full w-[48%] bg-white rounded-full" />
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
        <section id="features" className="border-y border-white/10 bg-white/[0.015]">
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
                  <div className="w-10 h-10 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-slate-300" />
                  </div>

                  <div>
                    <h2 className="text-sm font-medium">{item.title}</h2>
                    <p className="text-xs text-slate-500 mt-1 leading-5">
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
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-5">
                <FolderLock className="w-4 h-4" />
                Cloud Storage
              </div>

              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                One place for your important files.
              </h2>

              <p className="mt-5 text-slate-400 leading-7 max-w-xl">
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
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 mt-8 text-sm text-white hover:text-slate-300 transition"
              >
                View storage plans
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Documents", "128 files"],
                    ["Projects", "42 files"],
                    ["Photos", "1,284 files"],
                    ["Shared", "36 files"],
                  ].map(([name, count]) => (
                    <div
                      key={name}
                      className="rounded-xl border border-white/10 bg-slate-900/70 p-5"
                    >
                      <FolderLock className="w-5 h-5 text-slate-400" />
                      <div className="mt-8 text-sm">{name}</div>
                      <div className="text-xs text-slate-500 mt-1">
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
        <section id="cctv" className="border-y border-white/10 bg-white/[0.015]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
                  <div className="text-xs text-slate-500 mb-6">
                    AUTOMATIC BACKUP
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.025]">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                        <Server className="w-5 h-5 text-slate-300" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm">NVR</div>
                        <div className="text-xs text-slate-500">
                          Local recording
                        </div>
                      </div>

                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="w-5 h-5 text-slate-600 rotate-90" />
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.025]">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                        <UploadCloud className="w-5 h-5 text-slate-300" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm">Nimbus Gateway</div>
                        <div className="text-xs text-slate-500">
                          Automatic upload
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="w-5 h-5 text-slate-600 rotate-90" />
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.025]">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-slate-300" />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm">Nimbus Cloud</div>
                        <div className="text-xs text-slate-500">
                          Off-site recording backup
                        </div>
                      </div>

                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-5">
                  <Video className="w-4 h-4" />
                  CCTV & NVR Backup
                </div>

                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                  Keep your CCTV recordings beyond the NVR.
                </h2>

                <p className="mt-5 text-slate-400 leading-7 max-w-xl">
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
                      <Check className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-5">
              How it works
            </div>

            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Simple from setup to backup.
            </h2>

            <p className="mt-5 text-slate-400 leading-7">
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
                  className="rounded-2xl border border-white/10 bg-white/[0.025] p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      {step.number}
                    </span>

                    <Icon className="w-5 h-5 text-slate-400" />
                  </div>

                  <h3 className="mt-12 text-lg font-medium">{step.title}</h3>

                  <p className="mt-3 text-sm text-slate-500 leading-6">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-y border-white/10 bg-white/[0.015]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
            <div className="max-w-3xl mx-auto text-center">
              <ShieldCheck className="w-8 h-8 mx-auto text-slate-400" />

              <h2 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight">
                Built to keep your data where it belongs.
              </h2>

              <p className="mt-5 text-slate-400 leading-7">
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
                    className="rounded-xl border border-white/10 bg-slate-950/50 p-5"
                  >
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="mt-2 text-xs text-slate-500 leading-5">
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
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-14 sm:px-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Keep your important data accessible.
            </h2>

            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              Store your files and protect your CCTV recordings with Nimbus
              cloud storage.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-950 font-medium hover:bg-slate-200 transition"
              >
                Create your account
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-white/10 text-slate-200 hover:bg-white/[0.06] transition"
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} DV Technologies. Nimbus Cloud.
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <Link to="/pricing" className="hover:text-white transition">
              Pricing
            </Link>

            <Link to="/login" className="hover:text-white transition">
              Login
            </Link>

            <Link to="/register" className="hover:text-white transition">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

