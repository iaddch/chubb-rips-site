import { useEffect, useState } from 'react'
import { TicketIcon } from 'lucide-react'
import { upcomingShowsService } from '../services/supabaseService'
import PageHeader, { PageHeaderStats } from '@/components/PageHeader'
import ProductImage from '@/components/ProductImage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

function InstagramGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export default function UpcomingShowsPage() {
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedShow, setSelectedShow] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const fetchShows = async () => {
    try {
      setLoading(true)
      setError(null)
      setShows(await upcomingShowsService.getAll())
    } catch (err) {
      console.error('Error fetching upcoming shows:', err)
      setError("We couldn't load upcoming shows. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShows()
  }, [])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [selectedShow])

  const closeDetail = () => setSelectedShow(null)

  if (loading) {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Loading upcoming shows…</div>
  }

  if (error) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-4 text-center">
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <Button className="mt-5" onClick={fetchShows}>Try again</Button>
        </div>
      </div>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <PageHeader
        title="Where to find us"
        subtitle="Catch Chubb's Vault in person at these upcoming shows and trade nights."
        actions={
          <PageHeaderStats
            stats={[{ label: 'upcoming shows', value: shows.length }]}
          />
        }
      />

      {shows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h3 className="text-lg font-semibold text-slate-900">No shows scheduled right now</h3>
          <p className="mt-2 text-sm text-muted-foreground">Check back soon, or follow our Instagram for announcements.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {shows.map((show) => (
          <button
            key={show.id}
            type="button"
            onClick={() => setSelectedShow(show)}
            className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-left shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
          >
            <div className="aspect-[4/3] overflow-hidden bg-slate-900">
              <ProductImage
                src={show.images?.[0]}
                alt={show.name}
                className="size-full"
                imgClassName="size-full object-cover transition duration-300 group-hover:scale-105"
                fallbackClassName="bg-slate-900 text-slate-500"
              />
            </div>
            <div className="p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">{show.date}</p>
              <p className="mt-1.5 text-sm text-slate-300">{show.location}</p>
            </div>
          </button>
        ))}
      </div>
      )}

      <Dialog open={Boolean(selectedShow)} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent
          showClose={false}
          className="max-h-[90vh] max-w-2xl overflow-y-auto border-slate-800 bg-slate-950 p-0 text-white sm:rounded-2xl"
        >
          {selectedShow ? (
            <>
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                <ProductImage
                  src={selectedShow.images?.[activeImageIndex]}
                  alt={selectedShow.name}
                  className="size-full"
                  imgClassName="size-full object-cover"
                  fallbackClassName="bg-slate-900 text-slate-500"
                />
                <DialogClose
                  className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                  aria-label="Close"
                >
                  <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </DialogClose>
              </div>

              {selectedShow.images?.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto px-6 pt-4">
                  {selectedShow.images.map((image, index) => (
                    <button
                      key={image + index}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${index === activeImageIndex ? 'border-emerald-400' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <ProductImage
                        src={image}
                        alt={`${selectedShow.name} photo ${index + 1}`}
                        className="size-full"
                        imgClassName="size-full object-cover"
                        fallbackClassName="bg-slate-900 text-[10px] text-slate-500"
                      />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col gap-4 px-6 pb-6 pt-4">
                <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight text-white">{selectedShow.name}</DialogTitle>
                  <DialogDescription className="mt-2 space-y-1 text-sm text-slate-300">
                    <span className="block"><span className="font-semibold text-slate-100">Date:</span> {selectedShow.date}</span>
                    <span className="block"><span className="font-semibold text-slate-100">Time:</span> {selectedShow.time}</span>
                    <span className="block"><span className="font-semibold text-slate-100">Location:</span> {selectedShow.location}</span>
                  </DialogDescription>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
                  {selectedShow.instagram_link ? (
                    <a
                      href={selectedShow.instagram_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      <InstagramGlyph className="size-4" />
                      Event Instagram Page
                    </a>
                  ) : null}
                  {selectedShow.ticket_link ? (
                    <a
                      href={selectedShow.ticket_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-gray-100"
                    >
                      <TicketIcon className="size-4" />
                      Get Tickets
                    </a>
                  ) : null}
                  <Button variant="ghost" type="button" className="ml-auto text-slate-400 hover:bg-white/10 hover:text-white" onClick={closeDetail}>
                    Back to Upcoming Shows
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
