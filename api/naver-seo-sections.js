// 네이버 SEO 섹션 노출 분석 (네이버 통합검색 결과 페이지를 서버 사이드 크롤링)
//
// 동작:
// 1. https://search.naver.com/search.naver?query={q} 페이지를 fetch
// 2. HTML 내의 각 컬렉션 섹션 제목(h2.title_text 등)을 순서대로 추출
// 3. 9개 표준 SEO 섹션(파워링크, 쇼핑검색, 블로그, 카페, VIEW, 지식iN, 이미지, 동영상, 뉴스)에
//    대해 노출 여부 + 등장 순서(섹션 순위)를 계산
//
// 주의:
// - 비공식 크롤링. 네이버 약관 회색 영역.
// - HTML 구조가 변경되면 매칭이 실패할 수 있음. fallback으로 본문 텍스트 매칭도 시도.

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.naver.com/',
};

// 표준 섹션 라벨과 동의어
const SECTIONS = [
  { key: '파워링크', labels: ['파워링크'] },
  { key: '쇼핑검색', labels: ['네이버쇼핑', '쇼핑검색', '쇼핑 검색', '네이버 쇼핑'] },
  { key: '블로그', labels: ['블로그'] },
  { key: '카페', labels: ['카페'] },
  { key: 'VIEW', labels: ['VIEW', 'View'] },
  { key: '지식iN', labels: ['지식iN', '지식인'] },
  { key: '이미지', labels: ['이미지'] },
  { key: '동영상', labels: ['동영상', '비디오'] },
  { key: '뉴스', labels: ['뉴스'] },
];

function findSectionsFromHtml(html) {
  // 네이버 SERP는 각 컬렉션 섹션이 <section class="sc_new sp_xxx ..."> 형태이며
  // 섹션 제목은 다음 패턴 중 하나로 노출:
  //   <h2 class="title_text">섹션명</h2>
  //   <h2 class="api_subject_bx_inner_text">섹션명</h2>
  //   <a class="api_subject_bx_inner_text">섹션명</a>
  //   <span class="title_ti">섹션명</span>
  const titleRegex = /<(?:h2|a|span)[^>]*class="[^"]*(?:title_text|api_subject_bx_inner_text|title_ti)[^"]*"[^>]*>([\s\S]*?)<\/(?:h2|a|span)>/gi;
  const found = []; // { title, index }
  let m;
  while ((m = titleRegex.exec(html)) !== null) {
    // 태그 제거 후 텍스트만 추출
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) found.push({ title: text, index: m.index });
  }
  // section 단위로도 매칭 (title 매칭에 실패한 섹션 보완)
  // 클래스 패턴에서 sp_xxx 또는 _svp_xxx 식별
  // 너무 광범위하면 false positive 많으므로 fallback으로만 사용
  return found;
}

function findFallbackFromText(html) {
  // HTML 태그 모두 제거 후 텍스트만 추출하여 라벨이 등장하는 첫 인덱스 찾기
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const positions = {};
  SECTIONS.forEach(({ key, labels }) => {
    let minIdx = -1;
    for (const label of labels) {
      const idx = stripped.indexOf(label);
      if (idx >= 0 && (minIdx < 0 || idx < minIdx)) minIdx = idx;
    }
    positions[key] = minIdx;
  });
  return positions;
}

function computeRanks(foundTitles, fallbackPositions) {
  // 1순위: foundTitles에서 섹션 라벨에 매칭되는 항목을 등장 순서대로 → 순위
  const titlePositions = {};
  for (const { key, labels } of SECTIONS) {
    for (let i = 0; i < foundTitles.length; i++) {
      const t = foundTitles[i].title;
      if (labels.some(l => t === l || t.includes(l))) {
        titlePositions[key] = foundTitles[i].index;
        break;
      }
    }
  }
  // title 매칭이 안 된 섹션은 fallback 텍스트 매칭으로 보완 (단, 별도 표시)
  const allPositions = {};
  const sources = {};
  for (const { key } of SECTIONS) {
    if (titlePositions[key] != null) {
      allPositions[key] = titlePositions[key];
      sources[key] = 'title';
    } else if (fallbackPositions[key] >= 0) {
      allPositions[key] = fallbackPositions[key];
      sources[key] = 'text';
    } else {
      allPositions[key] = null;
      sources[key] = null;
    }
  }
  // 등장 인덱스 기준 오름차순 정렬 → 순위 부여
  const ordered = Object.entries(allPositions)
    .filter(([, idx]) => idx != null)
    .sort((a, b) => a[1] - b[1]);
  const ranks = {};
  ordered.forEach(([key], i) => { ranks[key] = i + 1; });
  SECTIONS.forEach(({ key }) => { if (!(key in ranks)) ranks[key] = null; });
  return { ranks, sources };
}

export default async function handler(req, res) {
  const q = (req.query.q || '').toString().trim();
  const debug = req.query.debug === '1';
  if (!q) {
    res.status(400).json({ error: 'missing q' });
    return;
  }
  const url = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(q)}&sm=top_hty`;
  try {
    const upstream = await fetch(url, { headers: BROWSER_HEADERS });
    const html = await upstream.text();
    if (!upstream.ok) {
      res.status(502).json({ error: 'upstream_status', status: upstream.status, body_peek: html.slice(0, 300) });
      return;
    }
    const foundTitles = findSectionsFromHtml(html);
    const fallbackPositions = findFallbackFromText(html);
    const { ranks, sources } = computeRanks(foundTitles, fallbackPositions);
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    res.status(200).json({
      query: q,
      sections: ranks,
      sources, // title 매칭 vs text 매칭
      ...(debug ? {
        upstream_url: url,
        titles_found: foundTitles.slice(0, 20).map(t => t.title),
        html_length: html.length,
      } : {}),
    });
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: String(err.message || err) });
  }
}
