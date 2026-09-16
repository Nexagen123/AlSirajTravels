import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import countryCodes from "../../../data/countryCodes.json"; // adjust path
import Select from "react-select";
import Header from "../../../components/Header";
import CommonSections from "../../../components/CommonSections";
import { travelImages } from "../../../data/travelImages";
import { Building2, ArrowRight, Sparkles } from "lucide-react";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "",
    address: "",
    city: "",
    role: "Agency",
    companyName: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Auto-generate a secure password since the form omits password fields
    const generatedPassword = Math.random().toString(36).slice(-10) + "A1!";

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: generatedPassword,
        plainPassword: generatedPassword,
        companyName: formData.companyName.trim(),
        phone: `${formData.countryCode || ""}${formData.phone.trim()}`.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        role: "Agency",
      };

      const res = await axiosInstance.post("/auth/register", payload);

      if (res.status === 201) {
        toast.success("Registration successful! Please login.");
        navigate("/");
      }
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.message || "Registration failed");
      } else {
        toast.error("Server error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const options = countryCodes.map((c) => ({
    value: `+${c.code}`,
    label: `${String.fromCodePoint(
      ...[...c.iso].map((ch) => 127397 + ch.charCodeAt()),
    )} ${c.country} (+${c.code})`,
  }));

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 48,
      height: 48,
      backgroundColor: "#ffffff",
      borderColor: state.isFocused ? "#2e5fa3" : "#f3f4f6",
      borderWidth: 1,
      borderRadius: "1rem",
      fontSize: "14px",
      boxShadow: state.isFocused
        ? "inset 0 1px 4px rgba(22,59,115,0.1)"
        : "none",
      "&:hover": {
        borderColor: state.isFocused ? "#2e5fa3" : "#e5e7eb",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 12px",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#9ca3af",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#111827",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: 46,
    }),
    menu: (base) => ({
      ...base,
      zIndex: 50,
      fontSize: "14px",
      borderRadius: "0.75rem",
      overflow: "hidden",
    }),
  };

  // Find selected value
  const selectedOption = options.find(
    (opt) => opt.value === formData.countryCode,
  );

  const inputClass =
    "clay-well w-full px-4 py-3 bg-white border border-gray-100 text-sm text-gray-900 placeholder:text-gray-400 focus:border-(--clay-navy-light) transition-colors";
  const labelClass =
    "block text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1.5";

  return (
    <>
      <Header />

      <div className="min-h-screen w-full flex flex-col lg:flex-row bg-(--clay-bg) font-sans">
        {/* ── LEFT SIDE: BRAND PANEL (navy, clay style) ── */}
        <div className="w-full lg:w-5/12 relative min-h-72 lg:min-h-0 overflow-hidden flex flex-col justify-between p-8 md:p-16 text-white bg-linear-to-br from-(--clay-navy-light) via-(--clay-navy) to-(--clay-navy-dark)">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url(${travelImages.dubai})` }}
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
          <div className="absolute bottom-10 -left-20 w-64 h-64 rounded-full bg-(--clay-navy-light) opacity-30 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <div className="clay-glass-light inline-flex items-center gap-2 px-3.5 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-(--clay-gold-light)" />
              <span className="text-[11px] uppercase tracking-widest font-bold text-white">
                B2B Portal Access
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Expand Your Agency
              <span className="block text-(--clay-gold-light)">
                With New Al Siraj
              </span>
            </h2>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/15 max-w-sm">
            <p className="text-white text-sm leading-relaxed font-medium">
              Gain direct access to inventory, exclusive global flight
              structures, and high-success visa automation tools built
              specifically for travel agents.
            </p>
          </div>
        </div>

        {/* ── RIGHT SIDE: FORM ── */}
        <div className="w-full lg:w-7/12 p-6 md:p-16 flex flex-col justify-center items-center relative">
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, #163b73 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="clay-white relative z-10 w-full max-w-xl p-6 md:p-10 flex flex-col gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-(--clay-gold-dark)" />
                <span className="text-(--clay-gold-dark) text-[11px] font-bold tracking-[0.25em] uppercase">
                  Register
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-(--clay-navy)">
                Create Agent Account
              </h1>
              <p className="text-sm font-medium text-gray-500">
                Already registered?{" "}
                <Link
                  to="/auth/login"
                  className="font-bold text-(--clay-navy) hover:text-(--clay-gold-dark) transition-colors"
                >
                  Log in to portal
                </Link>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              autoComplete="off"
              className="space-y-5"
            >
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Agency Details</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-(--clay-navy-light) pointer-events-none">
                      <Building2 size={16} />
                    </div>
                    <input
                      autoComplete="organization"
                      type="text"
                      name="companyName"
                      placeholder="Agency Name"
                      value={formData.companyName}
                      onChange={handleChange}
                      required
                      className={`${inputClass} pl-12`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Contact Agent</label>
                    <input
                      autoComplete="name"
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input
                      autoComplete="email"
                      type="email"
                      name="email"
                      placeholder="name@agency.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Phone Number</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      options={options}
                      value={selectedOption}
                      onChange={(selected) =>
                        handleChange({
                          target: {
                            name: "countryCode",
                            value: selected?.value || "",
                          },
                        })
                      }
                      className="w-full"
                      classNamePrefix="country-select"
                      placeholder="Select Code"
                      styles={selectStyles}
                      isSearchable
                    />
                    <input
                      type="text"
                      name="phone"
                      placeholder="Cell Number"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Office Address</label>
                    <input
                      type="text"
                      name="address"
                      placeholder="Street, Suite Info"
                      autoComplete="street-address"
                      value={formData.address}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      type="text"
                      name="city"
                      placeholder="City Name"
                      autoComplete="address-level2"
                      value={formData.city}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold clay-btn w-full py-3.5 rounded-full text-sm font-bold tracking-wide text-(--clay-navy-dark) flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Register Partner Agency"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </div>
        </div>
      </div>

      <CommonSections />
    </>
  );
};

export default Register;
