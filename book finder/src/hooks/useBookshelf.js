import { useEffect, useState } from 'react'

const STORAGE_KEY = 'between-the-pages.bookshelf.v1'

export function parseBookshelf(value) {
  try {
    const rows = JSON.parse(value ?? '[]')
    if (!Array.isArray(rows)) return []
    const seen = new Set()
    return rows.filter((book) => {
      if (!book || !Number.isSafeInteger(book.id) || book.id < 1 ||
          typeof book.title !== 'string' || !book.title.trim() ||
          !(book.price === null || (typeof book.price === 'number' && Number.isFinite(book.price) && book.price >= 0)) ||
          seen.has(book.id)) return false
      seen.add(book.id)
      return true
    }).map(({ id, title, price }) => ({ id, title, price })).slice(0, 1000)
  } catch {
    return []
  }
}

export default function useBookshelf() {
  const [savedBooks, setSavedBooks] = useState(() => {
    try { return parseBookshelf(localStorage.getItem(STORAGE_KEY)) } catch { return [] }
  })
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState('')

  useEffect(() => {
    function syncShelf(event) {
      if (event.key === STORAGE_KEY || event.key === null) setSavedBooks(parseBookshelf(event.newValue))
    }
    window.addEventListener('storage', syncShelf)
    return () => window.removeEventListener('storage', syncShelf)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4500)
    return () => clearTimeout(timer)
  }, [notice])

  function toggleBook(book) {
    const exists = savedBooks.some((saved) => saved.id === book.id)
    const next = exists ? savedBooks.filter((saved) => saved.id !== book.id)
      : [...savedBooks, { id: book.id, title: book.title, price: book.price == null ? null : Number(book.price) }]
    setSavedBooks(next)
    setNotice(exists ? 'Removed from My Bookshelf.' : 'A little escape, saved to My Bookshelf.')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStorageError('')
    } catch {
      setStorageError('Your browser could not save this bookshelf. Your choices are available for this visit, but may be lost when you close or refresh the page.')
    }
  }

  return { savedBooks, toggleBook, notice, storageError }
}
