exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { password, id } = JSON.parse(event.body);

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
    // list.json 가져오기
    const listRes = await fetch(`https://api.github.com/repos/${REPO}/contents/msg/list.json`, { headers });
    if (!listRes.ok) {
      return { statusCode: 404, body: JSON.stringify({ error: '목록을 찾을 수 없습니다.' }) };
    }
    const listData = await listRes.json();
    const listSha = listData.sha;
    let list = JSON.parse(Buffer.from(listData.content, 'base64').toString('utf-8'));

    // 해당 항목 deleted 표시
    const item = list.find(x => x.id === id);
    if (!item) {
      return { statusCode: 404, body: JSON.stringify({ error: '카드를 찾을 수 없습니다.' }) };
    }
    item.deleted = true;
    item.deletedAt = new Date().toISOString();

    // list.json 업데이트
    const newListContent = Buffer.from(JSON.stringify(list, null, 2)).toString('base64');
    const updateRes = await fetch(`https://api.github.com/repos/${REPO}/contents/msg/list.json`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Mark #${id} as deleted`,
        content: newListContent,
        sha: listSha
      })
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: '삭제 실패: ' + err }) };
    }

    // 실제 이미지 파일도 삭제
    const imgGetRes = await fetch(`https://api.github.com/repos/${REPO}/contents/msg/${id}.jpg`, { headers });
    if (imgGetRes.ok) {
      const imgData = await imgGetRes.json();
      await fetch(`https://api.github.com/repos/${REPO}/contents/msg/${id}.jpg`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          message: `Delete msg image #${id}`,
          sha: imgData.sha
        })
      });
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
