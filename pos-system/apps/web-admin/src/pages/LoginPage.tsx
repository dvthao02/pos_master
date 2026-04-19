import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginPlatform, loginTenant, type LoginZone } from "../lib/api";
import { useAuthStore } from "../store/authStore";

type FormState = {
  username: string;
  password: string;
  tenantCode: string;
};

type LoginPageProps = {
  zone: LoginZone;
  pageTitle: string;
  heroTitle: string;
  heroDescription: string;
  altLink: {
    to: string;
    label: string;
  };
};

const initialState: FormState = {
  username: "",
  password: "",
  tenantCode: "acafe"
};

export function LoginPage({ zone, pageTitle, heroTitle, heroDescription, altLink }: LoginPageProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const setSession = useAuthStore((state) => state.setSession);
  const session = useAuthStore((state) => state.session);
  const navigate = useNavigate();
  const zoneKicker = zone === "platform" ? "Cong quan tri he thong" : "Cong van hanh cua hang";
  const zoneSubtitle =
    zone === "platform"
      ? "Dang nhap de quan ly cua hang, tai khoan va phan quyen tap trung."
      : "Dang nhap de xu ly ban hang, don hang va bao cao hang ngay.";

  useEffect(() => {
    if (!session || session.loginZone !== zone) {
      return;
    }

    navigate(session.loginZone === "platform" ? "/crm-admin" : "/store-dashboard", { replace: true });
  }, [navigate, session, zone]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload =
        zone === "platform"
          ? await loginPlatform(form.username.trim(), form.password)
          : await loginTenant(form.username.trim(), form.password, form.tenantCode.trim());

      setSession(payload);
      navigate(zone === "platform" ? "/crm-admin" : "/store-dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Dang nhap khong thanh cong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-split-shell">
        <section className="login-hero">
          <div className="login-hero-glow" aria-hidden="true" />
          <p className="hero-kicker">{zoneKicker}</p>
          <h2>{heroTitle}</h2>
          <p className="login-hero-description">{heroDescription}</p>
          <p className="login-hero-brief">{zoneSubtitle}</p>

          <div className="login-pill-row" aria-hidden="true">
            <span className="login-pill">Da cua hang</span>
            <span className="login-pill">Phan quyen theo pham vi</span>
            <span className="login-pill">Theo doi nhat ky</span>
          </div>

          <div className="login-metrics" aria-hidden="true">
            <article>
              <span>Do on dinh</span>
              <strong>99.95%</strong>
            </article>
            <article>
              <span>Bao mat</span>
              <strong>MFA + RBAC</strong>
            </article>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-head">
            <h3>{pageTitle}</h3>
            <p>{zone === "platform" ? "Dang nhap quan tri nen tang" : "Dang nhap van hanh cua hang"}</p>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="login-field">
              <span>Ten dang nhap</span>
              <div className="field-with-icon">
                <i className="fa-regular fa-user" aria-hidden="true" />
                <input
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="Nhap ten dang nhap"
                  required
                />
              </div>
            </label>

            <label className="login-field">
              <span>Mat khau</span>
              <div className="field-with-icon">
                <i className="fa-solid fa-lock" aria-hidden="true" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Nhap mat khau"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "An mat khau" : "Hien mat khau"}
                  title={showPassword ? "An mat khau" : "Hien mat khau"}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
                </button>
              </div>
            </label>

            {zone === "tenant" ? (
              <label className="login-field">
                <span>Ma cua hang</span>
                <div className="field-with-icon">
                  <i className="fa-solid fa-building" aria-hidden="true" />
                  <input
                    value={form.tenantCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, tenantCode: event.target.value }))}
                    placeholder="acafe"
                    required
                  />
                </div>
              </label>
            ) : null}

            {error ? <p className="error-text">{error}</p> : null}

            <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Dang dang nhap..." : "Dang nhap"}
            </button>
          </form>

          <p className="login-alt-link">
            <Link to={altLink.to}>{altLink.label}</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
