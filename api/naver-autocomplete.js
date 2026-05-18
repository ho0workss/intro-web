// 네이버 자동완성 프록시 (비공식 endpoint)
//
// 클라이언트는 CORS 때문에 ac.search.naver.com / ac.shopping.naver.com 을
// 직접 호출할 수 없으므로 이 함수가 서버에서 대신 호출하고 결과를 정리해서 돌려줌.
//
// 주의:
// - 이 엔드포인트는 네이버의 비공식 내부 API임. 공식 OpenAPI가 아니며
//   네이버 약관상 회색 영역. 차단/장애가 발생할 수 있음.
// - 정확한 자동완성을 원할 때 사용. 약관 리스크를 피하려면 검색광고
//   키워드 도구 API (Naver Search Ad) 사용을 권장.
//
// Query 파라미터:
//   q     : 자동완성 쿼리 (필수)
//   type  : 'integrated' (통합검색, 기본) | 'shopping' (쇼핑)

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Site': 'same-site',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
};

function buildUrl(type, q) {
  const encQ = encodeURIComponent(q);
  if (type === 'shopping') {
    // 네이버 쇼핑 자동완성
    return `https://ac.shopping.naver.com/ac?q=${encQ}&q_enc=UTF-8&st=14&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4`;
  }
  // 네이버 통합검색 자동완성 (기본)
  return `https://ac.search.naver.com/nx/ac?q=${encQ}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
}

function refererFor(type) {
  return type === 'shopping' ? 'https://shopping.naver.com/' : 'https://www.naver.com/';
}

// 응답 파싱: JSON 또는 JSONP, HTML-like markup 제거
function parseSuggestions(text) {
  let data;
  // 1. 순수 JSON
  try {
    data = JSON.parse(text);
  } catch (_) {
    // 2. JSONP: callback(...)
    const jsonp = text.match(/^[^(]*\(([\s\S]*)\)\s*;?\s*$/);
    if (jsonp) {
      try {
        data = JSON.parse(jsonp[1]);
      } catch (_) {}
    }
    if (!data) {
      // 3. 응답 안에 첫 JSON 오브젝트 찾기
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          data = JSON.parse(m[0]);
        } catch (_) {}
      }
    }
  }
  if (!data) {
    throw new Error('parse_failed');
  }
  const suggestions = [];
  const seen = new Set();
  const push = (raw) => {
    if (typeof raw !== 'string') return;
    // HTML-like 마크업 제거 (Naver는 매칭 강조를 위해 <b>...</b> 또는 < ... >를 넣을 수 있음)
    const cleaned = raw.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (!cleaned) return;
    if (seen.has(cleaned)) return;
    seen.add(cleaned);
    suggestions.push(cleaned);
  };
  // items[group][entry][0] 또는 entry 자체가 string
  if (Array.isArray(data.items)) {
    for (const group of data.items) {
      if (!Array.isArray(group)) continue;
      for (const entry of group) {
        if (Array.isArray(entry) && entry.length > 0) push(entry[0]);
        else if (typeof entry === 'string') push(entry);
        else if (entry && typeof entry === 'object' && typeof entry.text === 'string') push(entry.text);
      }
    }
  }
  return { suggestions, raw_query: Array.isArray(data.query) ? data.query[0] : undefined };
}

export default async function handler(req, res) {
  const q = (req.query.q || '').toString().trim();
  const type = (req.query.type || 'integrated').toString();
  const debug = req.query.debug === '1';
  if (!q) {
    res.status(400).json({ error: 'missing q' });
    return;
  }
  const url = buildUrl(type, q);
  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: { ...BROWSER_HEADERS, Referer: refererFor(type) },
      // Vercel Node runtime은 fetch가 자동으로 압축 해제함
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      res.status(502).json({
        error: 'upstream_status',
        status: upstream.status,
        body_peek: text.slice(0, 300),
      });
      return;
    }
    let parsed;
    try {
      parsed = parseSuggestions(text);
    } catch (err) {
      res.status(502).json({
        error: 'parse_failed',
        message: String(err.message || err),
        body_peek: text.slice(0, 300),
      });
      return;
    }
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.status(200).json({
      query: q,
      type,
      suggestions: parsed.suggestions,
      count: parsed.suggestions.length,
      raw_query: parsed.raw_query,
      ...(debug ? { upstream_url: url, body_peek: text.slice(0, 500) } : {}),
    });
  } catch (err) {
    res.status(500).json({
      error: 'fetch_failed',
      message: String(err.message || err),
    });
  }
}
