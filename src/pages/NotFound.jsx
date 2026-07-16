import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <section className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-50 px-4 py-12">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-bold tracking-[0.2em] text-indigo-600">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
        <Button className="mt-6" onClick={() => navigate('/')}>Back to the vault</Button>
      </div>
    </section>
  )
}
