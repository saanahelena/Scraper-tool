// Approval evidence is required before a remote image can even enter the DOM.
export function getApprovedCoverUrl(cover) {
  if (cover?.permission_status !== 'approved' || !cover.permission_reference?.trim()) {
    return null
  }
  try {
    const url = new URL(cover.image_url)
    if (url.origin !== 'https://books.toscrape.com' || !url.pathname.startsWith('/media/') || url.username || url.password) {
      return null
    }
    return url.href
  } catch {
    return null
  }
}

