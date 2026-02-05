import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { source } = await req.json();
    let url = 'https://www.qidian.com/rank/yuepiao/';
    
    if (source === 'fanqie') {
      return NextResponse.json({ error: '番茄小说暂不支持自动扫榜，请使用手动粘贴模式。' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `无法访问起点榜单 (Status: ${response.status})` }, { status: response.status });
    }

    const html = await response.text();
    
    // Qidian structure: <div class="book-mid-info"> ... <h4><a ...>Title</a></h4> ... <p class="author"> ... <a ...>Author</a> ... </p>
    const books: any[] = [];
    const bookRegex = /<div class="book-mid-info">([\s\S]*?)<\/div>/g;
    let match;
    
    while ((match = bookRegex.exec(html)) !== null) {
      const block = match[1];
      const titleMatch = block.match(/<h4><a.*?>(.*?)<\/a><\/h4>/);
      const authorMatch = block.match(/<a class="name".*?>(.*?)<\/a>/);
      const introMatch = block.match(/<p class="intro">(.*?)<\/p>/);
      
      if (titleMatch) {
        books.push({
          rank: books.length + 1,
          title: titleMatch[1],
          author: authorMatch ? authorMatch[1] : 'Unknown',
          intro: introMatch ? introMatch[1].trim().replace(/\s+/g, ' ') : ''
        });
      }
      
      if (books.length >= 20) break;
    }

    if (books.length === 0) {
         return NextResponse.json({ error: '解析榜单失败 (页面结构可能已变更)，请尝试手动粘贴榜单内容。' }, { status: 500 });
    }

    return NextResponse.json({ books });
    
  } catch (error: any) {
    console.error('Scan Error:', error);
    return NextResponse.json({ error: error.message || '扫榜服务异常' }, { status: 500 });
  }
}
