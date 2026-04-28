exports.handler = async (event) => {
  const id = event.queryStringParameters?.id;
  if (!id) {
    return { statusCode: 400, body: 'id required' };
  }

  const REPO = process.env.GITHUB_REPO;
  // 공개 raw URL (토큰 불필요, 공개 repo니까)
  const imageUrl = `https://raw.githubusercontent.com/${REPO}/main/msg/${id}.jpg`;
  const pageUrl = `https://lsh2026.netlify.app/m/${id}`;

  // list.json에서 제목 가져오기 (없으면 기본값)
  let title = `이수희 후보 카드뉴스 #${id}`;
  let description = '강동구청장 후보 이수희';
  
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const listRes = await fetch(`https://api.github.com/repos/${REPO}/contents/msg/list.json`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    if (listRes.ok) {
      const data = await listRes.json();
      const list = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
      const item = list.find(x => x.id === parseInt(id));
      if (item) {
        if (item.deleted) {
          return {
            statusCode: 410,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>삭제됨</title></head><body style="font-family:sans-serif;text-align:center;padding:60px 20px;"><h2>이 카드뉴스는 삭제되었습니다</h2></body></html>'
          };
        }
        title = item.title || title;
      }
    }
  } catch (e) {
    // 무시하고 기본값 사용
  }

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${pageUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${imageUrl}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    img {
      max-width: 100%;
      max-height: 100vh;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>
  <img src="${imageUrl}" alt="${escapeHtml(title)}">
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    },
    body: html
  };
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
