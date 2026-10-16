/**
 * Utility to convert HTML from TipTap to Markdown and vice versa
 */

export function htmlToMarkdown(html) {
  if (!html) return ''

  // Create a temporary DOM parser
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
        return `\n# ${children.trim()}\n\n`
      case 'h2':
        return `\n## ${children.trim()}\n\n`
      case 'h3':
        return `\n### ${children.trim()}\n\n`
      case 'p':
        return `${children.trim()}\n\n`
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
        return `\n\`\`\`\n${children.trim()}\n\`\`\`\n\n`
      case 'blockquote':
        return `\n> ${children.trim().replace(/\n/g, '\n> ')}\n\n`
      case 'ul':
        return `\n${children}\n`
      case 'ol':
        return `\n${children}\n`
      case 'li': {
        const isTask = node.getAttribute('data-type') === 'taskItem' || node.parentNode.getAttribute('data-type') === 'taskList'
        if (isTask) {
          const checked = node.getAttribute('data-checked') === 'true'
          const checkbox = checked ? '[x]' : '[ ]'
          return `- ${checkbox} ${children.trim()}\n`
        }
        return `- ${children.trim()}\n`
      }
      case 'hr':
        return '\n---\n\n'
      case 'br':
        return '\n'
      default:
        return children
    }
  }

  const result = Array.from(doc.body.childNodes).map(processNode).join('')
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

export function markdownToHtml(md) {
  if (!md) return ''

  let html = md
    // Escape basic html characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`
  })

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')

  // Task lists
  html = html.replace(/^- \[x\] (.*$)/gim, '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>$1</p></div></li></ul>')
  html = html.replace(/^- \[ \] (.*$)/gim, '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>$1</p></div></li></ul>')

  // Unordered list
  html = html.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')

  // Bold / Italic / Strike / Highlight
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  html = html.replace(/~~(.*?)~~/g, '<s>$1</s>')
  html = html.replace(/==(.*?)==/g, '<mark>$1</mark>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Wrap loose lines in <p>
  const lines = html.split('\n')
  const wrapped = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<pre') || trimmed.startsWith('<blockquote')) {
      return trimmed
    }
    return `<p>${trimmed}</p>`
  }).filter(Boolean).join('')

  return wrapped
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
