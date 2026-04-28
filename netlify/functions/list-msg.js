exports.handler = async (event) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/msg/list.json?t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (!res.ok) {
      return { statusCode: 200, body: JSON.stringify({ list: [] }) };
    }

    const data = await res.json();
    let list = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    
    // 삭제 안 된 것만, 최근 30개
    list = list.filter(item => !item.deleted).slice(0, 30);

    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ list })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
