import { ExternalLink, Info } from 'lucide-react';
import { OPEN_PLATFORM_URL } from '../components/Layout';
import { Field } from '../components/ui';
import { t } from '../i18n/en';
import { setRole } from '../store/session';

/** Mock login screen shown to a visitor who is not logged in. */
export default function Login() {
  return (
    <div className="mx-auto mt-4 max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl md:text-3xl">{t.login.title}</h1>
        <p className="text-muted mt-3 text-sm">{t.login.intro}</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setRole('member');
          }}
        >
          <Field label={t.login.email}>{(p) => <input {...p} type="email" className="input" autoComplete="off" placeholder="name@example.org" />}</Field>
          <Field label={t.login.password}>{(p) => <input {...p} type="password" className="input" autoComplete="off" />}</Field>
          <button type="submit" className="btn w-full">
            {t.login.submit}
          </button>
          <p className="text-center text-sm">
            <a href="#/" onClick={(e) => e.preventDefault()}>
              {t.login.forgot}
            </a>
          </p>
        </form>
        <p className="bg-brand-tint text-brand-dark mt-5 flex items-start gap-2 rounded p-3 text-sm">
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t.login.demo}
        </p>
      </div>
      <p className="text-muted mt-4 text-center text-sm">
        {t.login.noAccount}{' '}
        <a href={OPEN_PLATFORM_URL} className="inline-flex items-center gap-1">
          {t.login.openLink}
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </p>
    </div>
  );
}
