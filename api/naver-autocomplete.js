// 네이버 자동완성 프록시 (비공식 endpoint)
//
// 클라이언트는 CORS 때문에 ac.search.naver.com을 직접 호출할 수 없으므로
// 이 함수가 서버에서 대신 호출하고 결과를 정리해서 돌려줌.
//
// 주의:
// - 이 엔드포인트는 네이버의 비공식 내부 API임. 공식 OpenAPI가 아니며
//   네이버 약관상 회색 영역. 차단/장애가 발생할 수 있음.
// - 정확한 자동완성을 원할 때 사용. 약관 리스크를 피하려면 검색광고
//   키워드 도구 API (Naver Search Ad) 사용을 권장.

export default async function handler(req, res) {
  const q = (req.query.q || '').toString().trim();
  if (!q) {
    res.status(400).json({ error: 'missing q' });
    return;
  }
  const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=0&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; intro-web/1.0)',
        'Accept': 'application/json,text/plain,*/*',
        'Referer': 'https://www.naver.com/'
      }
    });
    if (!r.ok) {
      res.status(502).json({ error: 'upstream', status: r.status });
      return;
    }
    const text = await r.text();
    // Naver는 r_format=json 으로 호출해도 가끔 JSONP-like 응답을 줌
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // JSONP 패턴 처리: callback(... 형태
      const m = text.match(/\(([\s\S]*)\)\s*;?\s*$/);
      if (m) data = JSON.parse(m[1]);
      else throw e;
    }
    // 결과 정리: items 배열에서 자동완성 후보 추출
    const suggestions = [];
    if (Array.isArray(data?.items)) {
      data.items.forEach(group => {
        if (Array.isArray(group)) {
          group.forEach(entry => {
            if (Array.isArray(entry) && entry.length > 0) {
              const term = entry[0];
              if (typeof term === 'string' && !suggestions.includes(term)) {
                suggestions.push(term);
              }
            }
          });
        }
      });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.status(200).json({ query: q, suggestions, count: suggestions.length });
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: String(err) });
  }
}
