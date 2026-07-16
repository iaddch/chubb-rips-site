import React from 'react'

export default function ReviewList({ reviews }) {
  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-slate-200 border-l-4 border-l-indigo-600 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-slate-900">{review.user_name}</span>
              <span className="text-xs text-slate-500">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="text-base tracking-[0.1em] text-amber-500">
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)}
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-600">{review.comment}</p>
        </div>
      ))}
    </div>
  )
}
