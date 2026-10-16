import assert from 'node:assert/strict'

function markdownToHtml(md) {
  if (!md) return ''
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => `<pre><code>${code.trim()}</code></pre>`)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
  html = html.replace(/^- \[x\] (.*$)/gim, '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>$1</p></div></li></ul>')
  html = html.replace(/^- \[ \] (.*$)/gim, '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>$1</p></div></li></ul>')
  html = html.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  html = html.replace(/~~(.*?)~~/g, '<s>$1</s>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  return html
}

console.log('Testing Markdown parser...')

const mdInput = `# Meeting Notes
- [ ] Review sprint goals
- [x] Push bugfix to main
**Important:** Don't forget database migrations.`

const parsed = markdownToHtml(mdInput)
assert.ok(parsed.includes('<h1>Meeting Notes</h1>'))
assert.ok(parsed.includes('data-checked="false"'))
assert.ok(parsed.includes('data-checked="true"'))
assert.ok(parsed.includes('<strong>Important:</strong>'))

console.log('✅ Markdown parser test passed!')
