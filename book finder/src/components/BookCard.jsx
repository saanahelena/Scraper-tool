const pounds = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export default function BookCard({ book, saved, onSave, onOpen }) {
  const variation = Number(book.id) + Math.floor(Number(book.id) / 5)
  const edition = variation % 6
  const motif = variation % 3

  return (
    <li className={`book-card binding-${edition} ornament-${motif}`}>
      <div className="decorative-cover">
        <span className="cover-imprint" aria-hidden="true">BETWEEN THE PAGES</span>
        <span className="cover-emblem" aria-hidden="true">
          {motif === 0 ? <span className="cover-moon" /> : motif === 1 ? <span className="cover-flower">❧</span> : <span className="cover-diamond">✧</span>}
        </span>
        <h3>
          <button className="book-title-button" type="button"
            aria-label={`Discover ${book.title}`} aria-haspopup="dialog"
            onClick={() => onOpen(book)}>{book.title}</button>
        </h3>
        <span className="cover-flourish" aria-hidden="true"><i/><b>·</b><i/></span>
        <span className="cover-discover" aria-hidden="true">Discover this book <span>↗</span></span>
      </div>
      <div className="book-meta">
        <p>{book.price == null ? 'Price unavailable' : pounds.format(book.price)}</p>
        <button className={`favourite-button${saved ? ' is-saved' : ''}`} type="button"
          aria-label={`${saved ? 'Remove' : 'Save'} ${book.title} ${saved ? 'from' : 'to'} My Bookshelf`}
          aria-pressed={saved} onClick={() => onSave(book)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg>
        </button>
      </div>
    </li>
  )
}
