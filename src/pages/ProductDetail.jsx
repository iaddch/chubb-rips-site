import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { productsService, reviewsService } from '../services/supabaseService'
import { useAuthStore } from '../store/index'
import ReviewList from '../components/ReviewList'
import ReviewForm from '../components/ReviewForm'
import { Button } from '@/components/ui/button'
import ProductImage from '@/components/ProductImage'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [averageRating, setAverageRating] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProduct = async () => {
    try {
      setLoading(true)
      setError(null)
      const productData = await productsService.getById(id)
      setProduct(productData)
      const reviewsData = await reviewsService.getByProductId(id)
      setReviews(reviewsData)
      setAverageRating(await reviewsService.getAverageRating(id))
    } catch (err) {
      console.error('Error fetching product:', err)
      setProduct(null)
      setError(err?.code === 'PGRST116' ? 'not-found' : 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProduct() }, [id])

  if (loading) return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Loading item…</div>

  if (error === 'error') {
    return (
      <div className="grid min-h-[50vh] place-items-center px-4 text-center">
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold text-slate-900">Couldn&apos;t load this item</h2>
          <p className="mt-2 text-sm text-slate-600">Check your connection and try again.</p>
          <Button className="mt-5" onClick={fetchProduct}>Try again</Button>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-4 text-center">
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold text-slate-900">Product not found</h2>
          <p className="mt-2 text-sm text-slate-600">It may have been removed or sold out permanently.</p>
          <Button className="mt-5" onClick={() => navigate('/')}>Back to collection</Button>
        </div>
      </div>
    )
  }

  const inStock = product.stock_quantity > 0
  const price = Number(product.price ?? 0)

  return (
    <main className="min-h-full bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Button variant="ghost" className="mb-6 -ml-3 text-slate-500" onClick={() => navigate('/')}>← Back to collection</Button>

        <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
          <div className="min-h-[360px] bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 p-10 lg:min-h-[560px]">
            <ProductImage
              src={product.image_url}
              alt={product.name}
              className="size-full min-h-[280px]"
              imgClassName="max-h-[460px] w-full object-contain"
            />
          </div>
          <div className="flex flex-col p-7 sm:p-10">
            <p className="text-xs font-bold tracking-[0.18em] text-indigo-600">{product.set_name || 'POKÉMON TCG'}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl text-balance">{product.name}</h1>
            <div className="mt-4 flex items-center gap-2 text-sm"><span className="tracking-[0.15em] text-amber-500">{'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}</span><span className="text-slate-600">{averageRating.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? '' : 's'}</span></div>
            <div className="mt-8 border-y border-slate-100 py-6"><p className="text-3xl font-semibold tracking-tight text-slate-900">${price.toFixed(2)}</p><p className={`mt-2 text-sm font-medium ${inStock ? 'text-emerald-600' : 'text-red-600'}`}>{inStock ? `${product.stock_quantity} available` : 'Currently sold out'}</p></div>
            {product.description ? <p className="mt-6 max-w-prose text-sm leading-7 text-slate-600 text-pretty">{product.description}</p> : null}
            <dl className="mt-7 grid grid-cols-2 gap-4 text-sm">
              {product.card_details ? <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Product type</dt><dd className="mt-1 font-medium text-slate-900">{product.card_details}</dd></div> : null}
              {product.condition ? <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Condition</dt><dd className="mt-1 font-medium text-slate-900">{product.condition}</dd></div> : null}
            </dl>
            <Button asChild className="mt-8 w-full"><a href="https://ig.me/m/chubbsvaultt" target="_blank" rel="noopener noreferrer">Ask about this item on Instagram</a></Button>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.18em] text-indigo-600">COMMUNITY</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Collector reviews</h2></div></div>
          <div className="mt-7">{user ? <ReviewForm productId={id} onReviewAdded={fetchProduct} /> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500"><Link className="font-semibold text-indigo-600" to="/login">Log in</Link> to leave a review.</p>}</div>
          <div className="mt-8">{reviews.length ? <ReviewList reviews={reviews} /> : <p className="text-sm text-slate-500">No reviews yet. Be the first to share your thoughts.</p>}</div>
        </section>
      </div>
    </main>
  )
}
