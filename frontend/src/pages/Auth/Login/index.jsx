import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import logo from "../../../assets/images/logosirajjj.png";
import { travelImages } from "../../../data/travelImages";
import {
  Mail,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    agentCode: "",
  });

  const [loading, setLoading] = useState(false);
  const [autoLoginTriggered, setAutoLoginTriggered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const performLogin = useCallback(async (payload) => {
    setLoading(true);
    try {
      const identifier = payload.email.trim();
      const isPhone = /^[\d\s\+\-\(\)]+$/.test(identifier);

      const res = await axiosInstance.post(
        "/auth/login",
        {
          ...(isPhone ? { phone: identifier } : { email: identifier }),
          password: payload.password,
          agentCode: payload.agentCode || undefined,
        },
        {
          withCredentials: true,
        },
      );

      if (res.status === 200 && res.data.success) {
        toast.success("Login successful!");

        if (res.data.redirectUrl) {
          window.location.href = res.data.redirectUrl;
          return;
        }

        if (res.data.token && res.data.user) {
          localStorage.setItem("frontend_token", res.data.token);
          localStorage.setItem("frontend_user", JSON.stringify(res.data.user));

          if (
            res.data.user.role === "Admin" ||
            res.data.user.role === "Super Admin"
          ) {
            window.location.href = "/admin-portal/";
          } else {
            window.location.href = "/dashboard";
          }
          return;
        }
        toast.error("Login response is missing redirect or token.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Server error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email") || "";
    const password = params.get("password") || "";
    const agentCode = params.get("agentCode") || "";
    const auto = params.get("auto") === "true";

    if (!email && !password && !agentCode) return;

    const payload = {
      email: decodeURIComponent(email),
      password: decodeURIComponent(password),
      agentCode: decodeURIComponent(agentCode),
    };

    setFormData(payload);

    if (auto && payload.email && payload.password && !autoLoginTriggered) {
      setAutoLoginTriggered(true);
      performLogin(payload);
    }
  }, [autoLoginTriggered, performLogin]);

  const handleSubmit = (e) => {
    e.preventDefault();
    performLogin(formData);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      toast.error("Email is required.");
      return;
    }
    setForgotLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password", {
        email: forgotEmail,
      });
      toast.success("Password reset link sent successfully.");
      setShowForgot(false);
      setForgotEmail("");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send reset link.",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-(--clay-bg) font-sans relative overflow-hidden">
      {/* ── TOP FLOATING BRAND LOGO ── */}
      <Link
        to="/"
        className="siraj-logo-frame siraj-login-logo-frame absolute top-5 left-5 lg:top-8 lg:left-8 z-50"
      >
        <img
          src={logo}
          alt="New Al Siraj Travels"
        />
      </Link>

      {/* ── LEFT SECTION: BRAND PANEL (navy, photo + collage, hidden on mobile) ── */}
      <div className="hidden lg:flex w-5/12 relative flex-col justify-end p-14 xl:p-16 text-white overflow-hidden bg-linear-to-br from-(--siraj-black) via-(--clay-navy-dark) to-(--clay-navy)">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage: `url(${travelImages.airport})`,
          }}
        />
        {/* decorative dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* decorative gold glow */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-(--clay-gold) opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-24 -left-20 w-64 h-64 rounded-full bg-(--clay-navy-light) opacity-30 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6 max-w-md">
          <div className="clay-glass-light inline-flex items-center gap-2 px-3.5 py-1.5">
            <Sparkles className="w-3.5 h-3.5 text-(--clay-gold-light)" />
            <span className="text-[11px] uppercase tracking-widest font-bold text-white">
              Agent Portal
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.05]">
            <span className="block">Welcome Back to</span>
            <span className="block text-(--clay-gold-light)">
              New Al Siraj
            </span>
          </h1>

          <p className="text-white/75 text-sm leading-relaxed font-medium border-t border-white/15 pt-6">
            Sign in to manage group bookings, visas, and hotel packages across
            your registered travel account.
          </p>

          <div className="flex items-center gap-6 pt-2">
            <div>
              <p className="text-2xl font-black text-white">10,000+</p>
              <p className="text-white/60 text-xs font-bold uppercase tracking-wide mt-1">
                Travellers
              </p>
            </div>
            <span className="h-8 w-px bg-white/15" />
            <div>
              <p className="text-2xl font-black text-white">14+</p>
              <p className="text-white/60 text-xs font-bold uppercase tracking-wide mt-1">
                Years
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT SECTION: AUTHENTICATION INTERFACE ── */}
      <div className="w-full lg:w-7/12 p-6 pt-28 md:p-16 flex flex-col justify-center items-center relative">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, #163b73 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="clay-white relative z-10 w-full max-w-md p-8 md:p-10 flex flex-col gap-7">
          <header className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-(--clay-gold-dark)" />
              <span className="text-(--clay-gold-dark) text-[11px] font-bold tracking-[0.25em] uppercase">
                Sign In
              </span>
            </div>
            <h2 className="text-3xl font-black text-(--clay-navy)">
              Access Your Account
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              Enter your credentials to reach your control panel.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-400">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-(--clay-navy-light) pointer-events-none">
                  <Mail size={16} />
                </div>
                <input
                  type="text"
                  name="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="clay-well w-full pl-12 pr-4 py-3 bg-white border border-gray-100 text-sm text-gray-900 placeholder:text-gray-400 focus:border-(--clay-navy-light) transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-400">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-(--clay-navy-light) pointer-events-none">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="clay-well w-full pl-12 pr-11 py-3 bg-white border border-gray-100 text-sm text-gray-900 placeholder:text-gray-400 focus:border-(--clay-navy-light) transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-(--clay-navy) transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold clay-btn w-full py-3.5 rounded-full text-sm font-bold tracking-wide text-(--clay-navy-dark) flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Login"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* SYSTEM INTERFACES AND NAVIGATION LINKS */}
          <div className="pt-5 border-t border-gray-100 flex flex-col gap-3 text-center text-sm font-medium">
            <p className="text-gray-500">
              Not registered?{" "}
              <Link
                to="/auth/register"
                className="font-bold text-(--clay-navy) hover:text-(--clay-gold-dark) transition-colors"
              >
                Apply for Account
              </Link>
            </p>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-gray-400 hover:text-(--clay-navy) transition-colors inline-block mx-auto text-xs"
            >
              Forgot your password?{" "}
              <span className="font-bold underline">Reset credentials</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── CREDENTIAL RECOVERY MODAL ── */}
      {showForgot && (
        <div className="fixed inset-0 bg-(--clay-navy-dark)/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="clay-white max-w-sm w-full p-7 md:p-8 text-center space-y-5">
            <div className="clay-gold w-14 h-14 rounded-full! flex items-center justify-center mx-auto">
              <ShieldCheck className="text-(--clay-navy-dark)" size={26} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-(--clay-navy)">
                Credential Recovery
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Enter your registered email address to receive a password reset
                link.
              </p>
            </div>

            <input
              type="email"
              placeholder="name@company.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="clay-well w-full px-4 py-3 bg-white border border-gray-100 text-sm text-gray-900 outline-none focus:border-(--clay-navy-light) placeholder:text-gray-400"
            />

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                className="btn-gold clay-btn w-full py-3 rounded-full text-(--clay-navy-dark) text-sm font-bold tracking-wide disabled:opacity-60"
              >
                {forgotLoading ? "Sending..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full py-1.5 text-gray-400 hover:text-(--clay-navy) text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
