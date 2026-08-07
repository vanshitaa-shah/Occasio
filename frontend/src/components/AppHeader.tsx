import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

/** App header with primary navigation + the signed-in user and logout. */
export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div>
        <h1 className="text-lg font-semibold">Occasio</h1>
        <p className="text-xs text-slate-500">
          Design a card, then schedule it to be emailed as an image.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <nav className="flex gap-1">
          <NavLink to="/" end className={linkClass}>
            Design
          </NavLink>
          <NavLink to="/scheduled" className={linkClass}>
            Scheduled
          </NavLink>
        </nav>
        {user && (
          <div className="flex items-center gap-2 border-l pl-3">
            <span className="text-xs text-slate-500" title={user.email}>
              {user.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
