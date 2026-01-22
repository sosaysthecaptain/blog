/**
 * Migration script: Convert HTML content to Markdown
 *
 * Run this from the /notes page browser console while logged in.
 * The script uses the app's existing Firebase connection.
 */

// HTML to Markdown conversion function
function htmlToMarkdown(html) {
  if (!html || !html.includes('<')) return html;

  let md = html;

  // Preserve pre blocks
  const preBlocks = [];
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, content) => {
    const index = preBlocks.length;
    let code = content
      .replace(/<code[^>]*>/gi, '').replace(/<\/code>/gi, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    preBlocks.push(code);
    return `__PRE_${index}__`;
  });

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');

  // Formatting
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // Links
  md = md.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Images with captions
  md = md.replace(/<figure[^>]*data-image-caption[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<figcaption[^>]*>(.*?)<\/figcaption>[\s\S]*?<\/figure>/gi,
    (_, src, caption) => `![${caption || ''}](${src})\n`);

  // Regular images
  md = md.replace(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi, '![]($1)');

  // File attachments
  md = md.replace(/<div[^>]*data-file-attachment[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*data-filename=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>[\s\S]*?<\/div>/gi,
    (_, url, filename) => `[${filename}](${url})\n`);

  // Task lists
  md = md.replace(/<ul[^>]*data-type=["']taskList["'][^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    let result = content;
    result = result.replace(/<li[^>]*data-checked=["']true["'][^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/li>/gi,
      (_, text) => `- [x] ${text.replace(/<[^>]*>/g, '').trim()}\n`);
    result = result.replace(/<li[^>]*data-checked=["']false["'][^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/li>/gi,
      (_, text) => `- [ ] ${text.replace(/<[^>]*>/g, '').trim()}\n`);
    return '\n' + result;
  });

  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return '\n' + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) =>
      `- ${text.replace(/<[^>]*>/g, '').trim()}\n`);
  });

  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    let i = 1;
    return '\n' + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) =>
      `${i++}. ${text.replace(/<[^>]*>/g, '').trim()}\n`);
  });

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) =>
    content.replace(/<[^>]*>/g, '').split('\n').map(l => `> ${l.trim()}`).join('\n') + '\n');

  // Tables
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cells = [];
      const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length === 0) return '';
    const colCount = Math.max(...rows.map(r => r.length));
    let table = '| ' + rows[0].join(' | ') + ' |\n';
    table += '| ' + Array(colCount).fill('---').join(' | ') + ' |\n';
    for (let i = 1; i < rows.length; i++) {
      table += '| ' + rows[i].join(' | ') + ' |\n';
    }
    return '\n' + table;
  });

  // Other elements
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  md = md.replace(/<br[^>]*\/?>/gi, '\n');
  md = md.replace(/<\/?[^>]+(>|$)/g, '');

  // Restore pre blocks
  preBlocks.forEach((code, i) => {
    md = md.replace(`__PRE_${i}__`, '```\n' + code.trim() + '\n```');
  });

  // Decode entities
  md = md.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  return md.replace(/\n{3,}/g, '\n\n').trim();
}

// Export for use
window.htmlToMarkdown = htmlToMarkdown;
console.log('Migration helper loaded. Use window.htmlToMarkdown(html) to convert.');
