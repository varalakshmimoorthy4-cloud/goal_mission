import { CheckCircle2, Sparkles, Target, TrendingUp } from "lucide-react";

// Two-column shell shared by the Login and Register pages.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <section className="auth-hero" aria-hidden="true">
        <div className="auth-brand">
          <span className="brand-mark">
            <Target size={22} />
          </span>
          <span className="brand-name">Goal Mission</span>
        </div>
        <h2>Turn big goals into small missions.</h2>
        <ul>
          <li><Sparkles size={18} /> Get an AI-assisted action plan for any goal</li>
          <li><CheckCircle2 size={18} /> Break work into missions and tick them off</li>
          <li><TrendingUp size={18} /> Track progress, deadlines and weekly momentum</li>
        </ul>
      </section>
      <main className="auth-panel" id="main-content">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          {footer && <p className="auth-footer">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
