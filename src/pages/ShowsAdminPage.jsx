import { useEffect, useMemo, useState } from 'react'
import { upcomingShowsService } from '../services/supabaseService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import PageHeader, { PageHeaderStats } from '@/components/PageHeader'
import { toastManager } from '@/components/ui/toast'
import ProductImage from '@/components/ProductImage'

const initialForm = () => ({
  name: '',
  date: '',
  time: '',
  location: '',
  images: [''],
  instagram_link: '',
  ticket_link: '',
})

export default function ShowsAdminPage() {
  const [shows, setShows] = useState([])
  const [form, setForm] = useState(initialForm())
  const [editingShowId, setEditingShowId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')

  const fetchShows = async () => {
    setListLoading(true)
    setListError('')
    try {
      setShows(await upcomingShowsService.getAll())
    } catch (err) {
      console.error(err)
      setListError("Couldn't load shows. Check your connection and try again.")
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    fetchShows()
  }, [])

  const totalShows = useMemo(() => shows.length, [shows])

  const handleImageChange = (index, value) => {
    setForm((current) => ({
      ...current,
      images: current.images.map((image, i) => (i === index ? value : image)),
    }))
  }

  const addImageRow = () => {
    setForm((current) => ({ ...current, images: [...current.images, ''] }))
  }

  const removeImageRow = (index) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const showValues = {
      name: form.name,
      date: form.date,
      time: form.time,
      location: form.location,
      images: form.images.map((image) => image.trim()).filter(Boolean),
      instagram_link: form.instagram_link.trim(),
      ticket_link: form.ticket_link.trim(),
    }

    try {
      if (editingShowId) {
        await upcomingShowsService.update(editingShowId, showValues)
      } else {
        await upcomingShowsService.create(showValues)
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
      setError("Couldn't save this show. Check the details and try again.")
      toastManager.add({
        title: 'Show not saved',
        description: "Couldn't save this show. Check the details and try again.",
        type: 'error',
      })
      return
    }

    setLoading(false)
    setSuccess(editingShowId ? 'Show updated successfully.' : 'Show added successfully.')
    toastManager.add({
      title: editingShowId ? 'Show updated' : 'Show added',
      description: editingShowId
        ? `${showValues.name} was updated successfully.`
        : `${showValues.name} was added to upcoming shows.`,
      type: 'success',
    })
    setForm(initialForm())
    setEditingShowId(null)
    fetchShows()
  }

  const handleEdit = (show) => {
    setForm({
      name: show.name || '',
      date: show.date || '',
      time: show.time || '',
      location: show.location || '',
      images: show.images?.length ? show.images : [''],
      instagram_link: show.instagram_link || '',
      ticket_link: show.ticket_link || '',
    })
    setEditingShowId(show.id)
    setError('')
    setSuccess('')
  }

  const cancelEdit = () => {
    setForm(initialForm())
    setEditingShowId(null)
    setError('')
  }

  const handleDelete = async (show) => {
    try {
      await upcomingShowsService.delete(show.id)
    } catch (err) {
      console.error(err)
      toastManager.add({
        title: 'Show not removed',
        description: `Couldn't remove ${show.name}. Try again.`,
        type: 'error',
      })
      return
    }

    setShows((current) => current.filter((current_show) => current_show.id !== show.id))
    if (editingShowId === show.id) {
      cancelEdit()
    }
    toastManager.add({
      title: 'Show removed',
      description: `${show.name} was removed from upcoming shows.`,
      type: 'success',
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <PageHeader
        title="Manage Shows"
        subtitle="Add, edit, or remove the shows customers see on Where to find us."
        actions={
          <PageHeaderStats stats={[{ label: 'upcoming shows', value: totalShows }]} />
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">
              {editingShowId ? 'Edit Show' : 'Add Show'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">Fields shown on the public page are marked required.</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label className="mb-1.5 block text-slate-900" htmlFor="show-name">Show Name</Label>
              <Input
                id="show-name"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="e.g. Miami TCG Trade Night"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-slate-900" htmlFor="show-date">Date</Label>
                <Input
                  id="show-date"
                  value={form.date}
                  onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
                  placeholder="e.g. August 24, 2026"
                  required
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-slate-900" htmlFor="show-time">Time</Label>
                <Input
                  id="show-time"
                  value={form.time}
                  onChange={(e) => setForm((current) => ({ ...current, time: e.target.value }))}
                  placeholder="e.g. 4:00 PM - 9:00 PM"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-slate-900" htmlFor="show-location">Location</Label>
              <Input
                id="show-location"
                value={form.location}
                onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))}
                placeholder="e.g. Miami Convention Center, Booth #402"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="block text-slate-900">Image URLs</Label>
              <p className="text-xs text-slate-500">The first image is used as the card thumbnail.</p>
              {form.images.map((image, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={image}
                    onChange={(e) => handleImageChange(index, e.target.value)}
                    placeholder="https://..."
                    required={index === 0}
                  />
                  {form.images.length > 1 ? (
                    <Button variant="outline" size="sm" type="button" onClick={() => removeImageRow(index)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button variant="secondary" size="sm" type="button" onClick={addImageRow}>
                Add another image
              </Button>
            </div>

            <div>
              <Label className="mb-1.5 block text-slate-900" htmlFor="show-instagram">Instagram Link</Label>
              <Input
                id="show-instagram"
                type="url"
                value={form.instagram_link}
                onChange={(e) => setForm((current) => ({ ...current, instagram_link: e.target.value }))}
                placeholder="https://www.instagram.com/..."
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-slate-900" htmlFor="show-tickets">Ticket Link (optional)</Label>
              <Input
                id="show-tickets"
                type="url"
                value={form.ticket_link}
                onChange={(e) => setForm((current) => ({ ...current, ticket_link: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? (editingShowId ? 'Updating...' : 'Adding...') : editingShowId ? 'Update Show' : 'Add Show'}
              </Button>
              {editingShowId ? (
                <Button variant="outline" type="button" onClick={cancelEdit}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
              {success}
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-900">Shows list</h3>
          </div>

          <div className="max-h-[600px] overflow-y-auto p-6">
            {listLoading ? (
              <p className="py-10 text-center text-sm text-slate-500">Loading shows…</p>
            ) : listError ? (
              <div className="py-10 text-center text-sm">
                <p className="text-red-600">{listError}</p>
                <Button variant="outline" size="sm" type="button" className="mt-3" onClick={fetchShows}>
                  Try again
                </Button>
              </div>
            ) : shows.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No shows yet. Add one to get started.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {shows.map((show) => (
                  <div key={show.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <ProductImage
                        src={show.images?.[0]}
                        alt={show.name}
                        className="size-full"
                        imgClassName="size-full object-cover"
                        fallbackClassName="text-[10px]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{show.name}</p>
                      <p className="text-xs text-slate-500">{show.date}</p>
                      <p className="truncate text-xs text-slate-500">{show.location}</p>
                      <div className="mt-2 flex gap-1">
                        <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700" type="button" onClick={() => handleEdit(show)}>
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" type="button">
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove this show?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes &ldquo;{show.name}&rdquo; from the public page. This can&apos;t be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => handleDelete(show)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
