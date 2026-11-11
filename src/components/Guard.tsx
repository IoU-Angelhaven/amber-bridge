import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n/en';
import type { Permission } from '../lib/permissions';
import { useSession } from '../store/session';

export function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="card mx-auto mt-8 max-w-xl text-center">
      <h1 className="text-2xl md:text-3xl">{title}</h1>
      <p className="text-muted mt-3">{text}</p>
      <Link to="/" className="btn mt-5">
        {t.common.goHome}
      </Link>
    </div>
  );
}

export const NotFound = () => <Message title={t.common.notFoundTitle} text={t.common.notFoundText} />;

/** Shows the page only if the current role has the permission. */
export function Guard({ perm, children }: { perm: Permission; children: ReactNode }) {
  const { can } = useSession();
  return can(perm) ? <>{children}</> : <Message title={t.common.noAccessTitle} text={t.common.noAccessText} />;
}
