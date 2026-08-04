import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold text-brand-primary">Ship Planner</h1>
      <p className="text-slate-600">Stack scaffold is up and running.</p>
      <Link to="/editor" className="text-brand-accent underline">
        Open blueprint editor
      </Link>
    </main>
  )
}

export default HomePage
