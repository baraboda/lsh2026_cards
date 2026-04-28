exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { password, content, title } = JSON.parse(event.body);

  if (password !== process.env.UPLOAD_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: '비밀번호가 틀렸습니다.' }) };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO;
  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };

  try {
    // 1. list.json 가져오기 (없으면 새로 만듦)
    let list = [];
    let listSha = null;
    
    const listRes = await fetch(`https://api.github.com/repos/${REPO}/contents/msg/list.json`, { headers });
    if (listRes.ok) {
      const data = await listRes.json();
      listSha = data.sha;
      list = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    }

    // 2. 다음 번호 결정 (삭제된 것 포함 최대값 + 1)
    const maxId = list.reduce((max, item) => Math.max(max, item.id), 0);
    const newId = maxId + 1;

    // 3. 이미지 업로드
    const imgRes = await fetch(`https://api.github.com/repos/${REPO}/contents/msg/${newId}.jpg`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Add msg card #${newId}`,
        content: content
      })
    });

    if (!imgRes.ok) {
      const err = await imgRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: '이미지 업로드 실패: ' + err }) };
    }

    // 4. list.json 업데이트
    const newEntry = {
      id: newId,
      title: title || `카드뉴스 #${newId}`,
      uploadedAt: new Date().toISOString(),
      deleted: false
    };
    list.unshift(newEntry); // 최신이 앞에 오도록

    const newListContent = Buffer.from(JSON.stringify(list, null, 2)).toString('base64');
    const listUpdateRes = await fetch(`https://api.github.com/repos/${REPO}/contents/msg/list.json`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Update list.json: add #${newId}`,
        content: newListContent,
        sha: listSha
      })
    });

    if (!listUpdateRes.ok) {
      const err = await listUpdateRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'list.json 업데이트 실패: ' + err }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: newId, entry: newEntry })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
