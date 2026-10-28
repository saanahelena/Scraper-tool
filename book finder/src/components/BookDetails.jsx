import { useEffect, useRef } from 'react'

const pounds = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export default function BookDetails({ book, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (book && !dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [book])

  return (
    <dialog
      ref={dialogRef}
      className="book-details"
      aria-labelledby="book-detail-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) {
          event.currentTarget.close()
        }
      }}
    >
      {book && (
        <div className="book-details-content">
          <button className="detail-close" type="button" aria-label="Close book details"
            onClick={() => dialogRef.current.close()} autoFocus>×</button>
          <div className="card-ornament" aria-hidden="true"><span/>✧<span/></div>
          <p className="eyebrow">BETWEEN THE PAGES · BOOK DETAILS</p>
          <h2 id="book-detail-title">{book.title}</h2>
          <p className="detail-price">{book.price == null ? 'Price unavailable' : pounds.format(book.price)}</p>
        </div>
      )}
    </dialog>
  )
}
