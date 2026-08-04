import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './Button'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/vendas/nova', label: 'Nova venda' },
  { to: '/vendas', label: 'Vendas' },
  { to: '/sabores', label: 'Sabores' },
  { to: '/clientes', label: 'Clientes' },
]

export function Layout() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-honey-600">
            cookies
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-cocoa-900 sm:text-5xl">
            Cukis
          </h1>
          <p className="mt-1 text-sm text-cocoa-700/70">
            {user?.email ?? 'Controle de vendas'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sair
        </Button>
      </header>

      <nav className="mb-6 hidden gap-1 rounded-2xl border border-biscuit-200/80 bg-white/60 p-1.5 backdrop-blur-sm lg:flex">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-cocoa-900 text-biscuit-50'
                  : 'text-cocoa-800 hover:bg-biscuit-100'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-biscuit-200/80 bg-biscuit-50/95 px-2 py-2 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl justify-around gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex-1 rounded-xl px-1 py-2 text-center text-[11px] font-semibold leading-tight transition ${
                  isActive
                    ? 'bg-cocoa-900 text-biscuit-50'
                    : 'text-cocoa-800'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
