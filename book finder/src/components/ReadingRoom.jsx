import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../supabaseClient'
import BookCard from './BookCard'

export default function ReadingRoom({ savedIds, onSave, onOpen }) {
  const [selection, setSelection] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    async function loadSelection() {
      try {
        // A small, stable selection of actual records, independent of collection filters.
        const { data, error } = await getSupabaseClient().from('books')
          .select('id, title, price').in('id', [3, 4, 7, 16]).order('id').limit(4)
          .abortSignal(controller.signal)
        if (!error && !controller.signal.aborted) setSelection(data ?? [])
      } catch { /* An unavailable selection never blocks the main collection. */ }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    loadSelection()
    return () => controller.abort()
  }, [])

  return (
    <section className="reading-room" aria-labelledby="reading-room-heading">
      <div className="section-intro">
        <div><p className="eyebrow">A MOMENT BETWEEN CHAPTERS</p><h2 id="reading-room-heading">The Reading <em>Room.</em></h2></div>
        <p>A few titles from our shelves.<br/>A little room to wander.</p>
      </div>
      {loading ? <p className="room-message" role="status">Opening the Reading Room…</p> : selection.length ? (
        <ul className="book-list reading-room-list">
          {selection.map((book) => <BookCard key={book.id} book={book} saved={savedIds.has(book.id)} onSave={onSave} onOpen={onOpen} />)}
        </ul>
      ) : <p className="room-message">The Reading Room is quiet for now. Explore the collection below.</p>}
      <div className="reading-room-footer"><span>GOOD STORIES. UNHURRIED MOMENTS.</span><a href="#collection">Browse all books <span aria-hidden="true">↗</span></a></div>
    </section>
  )
}
