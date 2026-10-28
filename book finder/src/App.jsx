import { useEffect, useState } from 'react'
import { getSupabaseClient } from './supabaseClient'
import BookCard from './components/BookCard'
import ReadingRoom from './components/ReadingRoom'
import useBookshelf from './hooks/useBookshelf'
import BookDetails from './components/BookDetails'
import './App.css'
import './Collection.css'

const PAGE_SIZE = 20

function App() {
  const { savedBooks, toggleBook, notice, storageError } = useBookshelf()
  const savedIds = new Set(savedBooks.map((book) => book.id))
  const [selectedBook, setSelectedBook] = useState(null)
  const [search, setSearch] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('price-asc')
  const [page, setPage] = useState(1)
  const [totalBooks, setTotalBooks] = useState(0)
  const totalPages = Math.ceil(totalBooks / PAGE_SIZE)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadBooks() {
      setLoading(true)
      setError('')
      try {
        const minimum = minPrice === '' ? null : Number(minPrice)
        const maximum = maxPrice === '' ? null : Number(maxPrice)
        if ([minimum, maximum].some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
          throw new Error('Please enter valid prices of £0 or more.')
        }
        if (minimum !== null && maximum !== null && minimum > maximum) {
          throw new Error('Minimum price must be less than or equal to maximum price.')
        }

        const supabase = getSupabaseClient()
        let query = supabase.from('books').select('id, title, price', { count: 'exact' })
        const term = search.trim()

        if (term) {
          // Treat SQL pattern characters as ordinary text in the search box.
          const escapedTerm = term.replace(/[\\%_]/g, '\\$&')
          query = query.ilike('title', `%${escapedTerm}%`)
        }

        if (minimum !== null) query = query.gte('price', minimum)
        if (maximum !== null) query = query.lte('price', maximum)

        const [column, direction] = sort.split('-')
        query = query
          .order(column, { ascending: direction === 'asc', nullsFirst: false })
          .order('id', { ascending: true })

        // Range endpoints are inclusive: page 1 is rows 0–19, page 2 is 20–39.
        const from = (page - 1) * PAGE_SIZE
        const { data, count, error: fetchError } = await query
          .range(from, from + PAGE_SIZE - 1)
          .abortSignal(controller.signal)

        if (fetchError) {
          throw new Error('We could not load the books. Check your internet connection, Supabase Project URL and publishable key, and the books table SELECT permission and RLS policy. Then refresh the page.')
        }

        if (!controller.signal.aborted) {
          setBooks(data ?? [])
          setTotalBooks(count ?? 0)

        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || 'Something went wrong while loading books. Please refresh and try again.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    // Wait briefly so fast typing does not send a request for every keystroke.
    const timeout = setTimeout(loadBooks, 300)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [search, minPrice, maxPrice, sort, page])

  function updateControl(setValue, value) {
    setValue(value)
    setPage(1)
    setLoading(true)
    setError('')
  }

  return (
    <>
      <a className="skip-link" href="#collection">Skip to the collection</a>
      <div className="announcement">A little escape. A whole new world. <span aria-hidden="true">✧</span></div>
      <header className="site-header">
        <a className="wordmark" href="#home" aria-label="Between the Pages home">
          <span className="brand-star" aria-hidden="true">✧</span>
          <span>Between <i>the</i> Pages<small>A PLACE FOR YOUR NEXT CHAPTER</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#collection">The collection</a>
          <a href="#bookshelf">My Bookshelf <span className="shelf-count">{savedBooks.length}</span></a>
          <a href="#our-story">Our little world <span aria-hidden="true">↗</span></a>
        </nav>
      </header>
      <main id="home">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <p className="eyebrow"><span aria-hidden="true">✦</span> FOR THE LOVE OF GETTING LOST</p>
            <h1 id="hero-heading">Your next fictional<br className="desktop-break" /> <em>obsession</em> awaits.</h1>
            <p className="hero-description">For the stories that steal our hearts, keep us up past midnight, and make reality feel a little less magical.</p>
            <a className="primary-button" href="#collection">Explore the Collection <span aria-hidden="true">↗</span></a>
            <p className="hero-note">One more chapter? Always.</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <svg viewBox="0 0 520 480" fill="none">
              <defs>
                <linearGradient id="arch" x1="260" y1="0" x2="260" y2="460" gradientUnits="userSpaceOnUse"><stop stopColor="#ead8cf"/><stop offset="1" stopColor="#f3e8dc"/></linearGradient>
                <linearGradient id="paper" x1="260" y1="230" x2="260" y2="420" gradientUnits="userSpaceOnUse"><stop stopColor="#fffaf0"/><stop offset="1" stopColor="#e9d5b9"/></linearGradient>
              </defs>
              <path d="M95 449V196a165 165 0 0 1 330 0v253Z" fill="url(#arch)"/>
              <path d="M112 449V197a148 148 0 0 1 296 0v252" stroke="#b79867" strokeOpacity=".55"/>
              <circle cx="282" cy="137" r="54" fill="#faf3e4"/>
              <circle cx="302" cy="120" r="49" fill="#ead8cf"/>
              <path d="m185 128 3 11 11 3-11 3-3 11-3-11-11-3 11-3Zm154 67 4 15 15 4-15 4-4 15-4-15-15-4 15-4ZM238 72l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="#ad8952"/>
              <g stroke="#997a59" strokeWidth="1.6" strokeLinecap="round">
                <path d="M125 414c-43-69-55-139-24-204M101 328c-30-11-43-28-41-49 25 3 39 19 41 49Zm-9-61c-18-20-23-40-11-58 20 13 24 33 11 58Zm15 97c29-20 38-41 29-63-24 13-34 34-29 63ZM395 412c40-70 48-126 25-184m-5 78c28-11 40-27 38-47-24 4-37 18-38 47Zm-9 51c-27-17-37-36-30-56 23 10 33 29 30 56Z" fill="#a7aa8e" fillOpacity=".28"/>
              </g>
              <ellipse cx="260" cy="430" rx="158" ry="14" fill="#9c6961" fillOpacity=".12"/>
              <path d="M135 398h240l-7 27H128Z" fill="#713749"/>
              <path d="M137 399h232v17H134" fill="#e5d3b7" stroke="#b99c74"/>
              <path d="M123 391q62-19 137 6 67-28 139-9l-4-19q-73-18-135 7-68-24-137-5Z" fill="#923f55"/>
              <path d="M260 376q-56-54-135-39l-15-89q84-17 150 44 66-61 150-44l-15 89q-79-15-135 39Z" fill="url(#paper)" stroke="#b89a74" strokeWidth="1.5"/>
              <path d="M260 293v81m-127-107q65-5 110 35m-108-19q63-3 108 34m-105-19q60 0 105 34m-102-19q57 3 102 34m144-80q-65-5-110 35m108-19q-63-3-108 34m105-19q-60 0-105 34m102-19q-57 3-102 34" stroke="#b99f7b" strokeOpacity=".55"/>
              <path d="m286 360-5 57 13-9 10 11 4-64" fill="#aa6770"/>
              <path d="M205 226q19-8 28-26m70 35q-6-25 12-44m-63 27v-28" stroke="#b8975e" strokeDasharray="3 7"/>
              <circle cx="156" cy="205" r="2" fill="#a88857"/><circle cx="355" cy="113" r="2" fill="#a88857"/><circle cx="233" cy="175" r="2" fill="#a88857"/>
            </svg>
            <span className="art-caption">a world between the pages</span>
            <span className="art-side-note">EST. FOR THE DAYDREAMERS</span>
          </div>
        </section>
        <div className="chapter-divider" aria-hidden="true"><span/> ✧ <span/></div>
        <ReadingRoom savedIds={savedIds} onSave={toggleBook} onOpen={setSelectedBook} />
        <section className="collection homepage" id="collection" aria-labelledby="collection-heading">
          <div className="collection-heading">
            <div><p className="eyebrow">THE NEXT CHAPTER STARTS HERE</p><h2 id="collection-heading">Find your next <em>escape.</em></h2></div>
            <p>A story for every kind of daydream.</p>
          </div>
          <div className="filter-panel">

      <div className="search-field">
        <label htmlFor="book-search">Search by title</label>
        <input
          id="book-search"
          type="search"
          placeholder="Which story are you looking for?"
          value={search}
          onChange={(event) => updateControl(setSearch, event.target.value)}
        />
      </div>
      <div className="book-controls">
        <div className="control-field">
          <label htmlFor="min-price">Minimum price (£)</label>
          <input id="min-price" type="number" min="0" step="0.01"
            placeholder="No minimum" value={minPrice}
            onChange={(event) => updateControl(setMinPrice, event.target.value)} />
        </div>
        <div className="control-field">
          <label htmlFor="max-price">Maximum price (£)</label>
          <input id="max-price" type="number" min="0" step="0.01"
            placeholder="No maximum" value={maxPrice}
            onChange={(event) => updateControl(setMaxPrice, event.target.value)} />
        </div>
        <div className="control-field">
          <label htmlFor="sort-books">Sort by</label>
          <select id="sort-books" value={sort}
            onChange={(event) => updateControl(setSort, event.target.value)}>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="title-asc">Title: A–Z</option>
            <option value="title-desc">Title: Z–A</option>
          </select>
        </div>
        <button type="button" onClick={() => {
          updateControl(setSearch, '')
          setMinPrice('')
          setMaxPrice('')
        }} disabled={!search && !minPrice && !maxPrice}>Clear filters</button>
      </div>
          </div>
          <div className="results-bar">
            <p className="results-caption">THE COLLECTION <span aria-hidden="true">✧</span></p>
            <p>20 books per page · Discover the entire collection</p>
          </div>
      {loading && <div className="loading-state" role="status"><span className="loading-star" aria-hidden="true">✧</span><p>Turning the pages…</p><span>Finding your next great read.</span></div>}
      {loading && <div className="skeleton-grid" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <div className="skeleton-card" key={index}><span/><span/><span/></div>)}</div>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && (
        <p className="match-count" role="status">{totalBooks.toLocaleString()} {totalBooks === 1 ? 'book' : 'books'} to get lost in</p>
      )}
      {!loading && !error && books.length === 0 && (
        <div className="empty-state" role="status"><span aria-hidden="true">✧</span><h3>A different chapter, perhaps?</h3><p>
          {search.trim() || minPrice !== '' || maxPrice !== ''
            ? 'No books match your search and price filters. Try another title, change the prices, or clear the filters.'
            : 'No books are visible. If your table has books, check the read-only RLS policy in Supabase.'}
        </p></div>
      )}
      {!loading && !error && books.length > 0 && (
        <ul className="book-list">
          {books.map((book) => (
            <BookCard key={book.id} book={book} saved={savedIds.has(book.id)}
              onSave={toggleBook} onOpen={setSelectedBook} />
          ))}
        </ul>
      )}
      <nav className="pagination" aria-label="Book results pages">
        <button type="button" disabled={loading || !!error || page <= 1}
          onClick={() => {
            setLoading(true)
            setPage((current) => current - 1)
          }}>Previous</button>
        <p aria-live="polite">
          {loading ? 'Loading page...' : error ? 'Pagination unavailable' : totalPages === 0
            ? 'No pages to display' : `Page ${page} of ${totalPages}`}
        </p>
        <button type="button" disabled={loading || !!error || page >= totalPages}
          onClick={() => {
            setLoading(true)
            setPage((current) => current + 1)
          }}>Next</button>
      </nav>
        </section>
        <section className="bookshelf-section" id="bookshelf" aria-labelledby="bookshelf-heading">
          <div className="section-intro">
            <div><p className="eyebrow">YOUR OWN LITTLE LIBRARY</p><h2 id="bookshelf-heading">My <em>Bookshelf.</em></h2></div>
            <p>{savedBooks.length} {savedBooks.length === 1 ? 'story' : 'stories'} saved for another day.<br/>Kept in this browser, just for you.</p>
          </div>
          {storageError && <p className="error" role="alert">{storageError}</p>}
          {savedBooks.length ? <ul className="book-list shelf-list">
            {savedBooks.map((book) => <BookCard key={book.id} book={book} saved={true} onSave={toggleBook} onOpen={setSelectedBook} />)}
          </ul> : <div className="shelf-empty"><span aria-hidden="true">♡</span><h3>A little space for stories you love.</h3><p>Tap a heart to save a book here. Your next chapter will be waiting.</p><a href="#collection">Find a story to keep <span aria-hidden="true">↗</span></a></div>}
        </section>
        <section className="story-note" id="our-story" aria-labelledby="story-heading">
          <span aria-hidden="true">✧</span><p className="eyebrow">OUR LITTLE WORLD</p>
          <h2 id="story-heading">For the ones who live<br/><em>a thousand lives.</em></h2>
          <p>Between the Pages is a little corner of the world for getting lost in a good story. Browse, daydream, and find the book that feels like your next chapter.</p>
        </section>
      </main>
      <BookDetails book={selectedBook} onClose={() => setSelectedBook(null)} />
      <div className={`shelf-notice${notice ? ' visible' : ''}`} role="status">{notice}</div>
      <footer className="site-footer"><a href="#home">Between <i>the</i> Pages</a><p>Stay a little longer. Read a little further.</p><span aria-hidden="true">✧</span></footer>
    </>
  )
}

export default App
