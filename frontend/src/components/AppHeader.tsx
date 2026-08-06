import { NavLink } from 'react-router-dom';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-slate-600 hover:bg-slate-100'
  }`;

/** App header with primary navigation, shared by the editor and scheduled views. */
export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div>
        <h1 className="text-lg font-semibold">Occasio</h1>
        <p className="text-xs text-slate-500">
          Design a card, then schedule it to be emailed as an image.
        </p>
      </div>
      <nav className="flex gap-1">
        <NavLink to="/" end className={linkClass}>
          Design
        </NavLink>
        <NavLink to="/scheduled" className={linkClass}>
          Scheduled
        </NavLink>
      </nav>
    </header>
  );
}
