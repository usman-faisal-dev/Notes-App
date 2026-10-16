import { marked } from 'marked'

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: false
})

/**
 * Robust markdown to HTML converter using `marked`
 * with TipTap checklist, bullets, and horizontal rule normalization
 */
export function markdownToHtml(md) {
  if (!md) return ''

  let rawHtml = marked.parse(md)

  // Convert marked task list items into TipTap's taskList / taskItem schema
  rawHtml = rawHtml.replace(/<li>\s*(?:<p>)?\s*<input (checked="")?\s*disabled=""\s*type="checkbox">\s*([\s\S]*?)(?:<\/p>)?\s*<\/li>/g, (match, checked, content) => {
    const isChecked = Boolean(checked && checked.includes('checked'))
    return `<li data-type="taskItem" data-checked="${isChecked}"><label><input type="checkbox" ${isChecked ? 'checked="checked"' : ''}><span></span></label><div><p>${content.trim()}</p></div></li>`
  })

  // Ensure task list items are inside <ul data-type="taskList">
  rawHtml = rawHtml.replace(/<ul>(\s*<li data-type="taskItem"[\s\S]*?)<\/ul>/g, '<ul data-type="taskList">$1</ul>')

  // Clean <hr> for TipTap StarterKit
  rawHtml = rawHtml.replace(/<hr\s*\/?>/g, '<hr>')

  return rawHtml
}

/**
 * Converts TipTap HTML to standard clean Markdown
 */
export function htmlToMarkdown(html) {
  if (!html) return ''

  if (typeof DOMParser === 'undefined') {
    // Fallback if running outside browser/DOM
    return html.replace(/<[^>]+>/g, '').trim()
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ''
    }

    const tag = node.tagName.toLowerCase()
    const children = Array.from(node.childNodes).map(processNode).join('')

    switch (tag) {
      case 'h1':
        return `\n\n# ${children.trim()}\n\n`
      case 'h2':
        return `\n\n## ${children.trim()}\n\n`
      case 'h3':
        return `\n\n### ${children.trim()}\n\n`
      case 'p':
        return `\n\n${children.trim()}\n\n`
      case 'strong':
      case 'b':
        return `**${children}**`
      case 'em':
      case 'i':
        return `*${children}*`
      case 'u':
        return `<u>${children}</u>`
      case 's':
      case 'strike':
      case 'del':
        return `~~${children}~~`
      case 'mark':
        return `==${children}==`
      case 'code':
        if (node.parentNode && node.parentNode.tagName.toLowerCase() === 'pre') {
          return children
        }
        return `\`${children}\``
      case 'pre':
        return `\n\n\`\`\`\n${children.trim()}\n\`\`\`\n\n`
      case 'blockquote':
        return `\n\n> ${children.trim().replace(/\n/g, '\n> ')}\n\n`
      case 'ul':
        return `\n\n${children.trim()}\n\n`
      case 'ol':
        return `\n\n${children.trim()}\n\n`
      case 'li': {
        const isTask = node.getAttribute('data-type') === 'taskItem' || node.parentNode?.getAttribute('data-type') === 'taskList'
        if (isTask) {
          const checked = node.getAttribute('data-checked') === 'true'
          const checkbox = checked ? '[x]' : '[ ]'
          return `- ${checkbox} ${children.trim()}\n`
        }
        const isOrdered = node.parentNode?.tagName.toLowerCase() === 'ol'
        const prefix = isOrdered ? '1. ' : '- '
        return `${prefix}${children.trim()}\n`
      }
      case 'hr':
        return '\n\n---\n\n'
      case 'br':
        return '\n'
      default:
        return children
    }
  }

  const result = Array.from(doc.body.childNodes).map(processNode).join('')
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    return false
  }
}

export function exportAsFile(filename, content, type = 'text/markdown') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
