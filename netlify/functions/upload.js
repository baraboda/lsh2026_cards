exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { password, content, filename } = JSON.parse(event.body);

  if (password !== process.env.UPLOAD_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: '비밀번호가 틀렸습니다.' }) };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO;
  const FILE_PATH = 'current.jpg';

  try {
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    let sha = null;
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update card: ${filename} at ${new Date().toISOString()}`,
        content: content,
        sha: sha
      })
    });

    if (!putRes.ok) {
      const err = await putRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'GitHub 업로드 실패: ' + err }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
