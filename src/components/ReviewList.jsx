import React from 'react'

export default function ReviewList({ reviews }) {
  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-semibold text-slate-900">{review.user_name || 'Anonymous'}</span>
              <span className="text-xs text-slate-500">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="shrink-0 text-base tracking-[0.1em] text-amber-500">
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)}
            </div>
          </div>
          <p className="break-words text-sm leading-6 text-slate-600 text-pretty">{review.comment}</p>
        </div>
      ))}
    </div>
  )
}
